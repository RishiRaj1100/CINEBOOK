-- ============================================================
-- 003_functions.sql
-- Core RPC functions for concurrency-safe seat operations
-- All are SECURITY DEFINER so they run as the DB owner and
-- bypass RLS on show_seats (clients cannot mutate show_seats directly)
-- ============================================================

-- ============================================================
-- FUNCTION: hold_seats
--
-- WHY SELECT ... FOR UPDATE PREVENTS DOUBLE-BOOKING:
-- When two users request the same seat simultaneously, Postgres
-- places an exclusive row-level lock via FOR UPDATE. The second
-- transaction blocks and waits for the first to commit/rollback.
-- Once the first commits (status='locked'), the second transaction
-- sees the updated status and raises an exception → rollback.
-- This is serialized at the DB level — no application-level
-- locking needed, and no race window exists.
--
-- WHY SKIP LOCKED:
-- If a concurrent transaction is mid-hold (active, uncommitted),
-- SKIP LOCKED returns that row as "not found" instead of blocking.
-- We immediately count: if returned rows < requested count → rollback.
-- This gives fast-fail UX rather than a hang.
--
-- PARAMETERS:
--   p_show_id      - the show
--   p_seat_ids     - array of show_seat UUIDs to hold
--   p_user_id      - the requesting user
--   p_hold_seconds - lock duration (default 600 = 10 min)
-- ============================================================
CREATE OR REPLACE FUNCTION hold_seats(
  p_show_id      UUID,
  p_seat_ids     UUID[],
  p_user_id      UUID,
  p_hold_seconds INTEGER DEFAULT 600
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locked_ids UUID[];
  v_unavailable_ids UUID[];
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Step 1: Lock the target rows FOR UPDATE SKIP LOCKED.
  -- Rows mid-transaction (concurrent hold attempt) are skipped.
  -- Rows with committed status (locked/booked) are returned but checked below.
  CREATE TEMP TABLE _target_seats AS
  SELECT id, status, locked_by, lock_expires_at
  FROM show_seats
  WHERE id = ANY(p_seat_ids)
    AND show_id = p_show_id
  FOR UPDATE SKIP LOCKED;

  -- Step 2: If we got fewer rows than requested, another concurrent
  -- transaction has a live lock on the skipped rows → fail immediately.
  -- This is the SKIP LOCKED guard: partial sets are rejected entirely.
  IF (SELECT COUNT(*) FROM _target_seats) < array_length(p_seat_ids, 1) THEN
    DROP TABLE _target_seats;
    RAISE EXCEPTION 'SEATS_UNAVAILABLE: One or more seats are being held by another user. Please try again.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Step 3: Among the locked rows, find any that are genuinely unavailable
  -- (booked, or locked by someone else with a non-expired lock).
  SELECT array_agg(id)
  INTO v_unavailable_ids
  FROM _target_seats
  WHERE status = 'booked'
     OR (
       status = 'locked'
       AND locked_by IS DISTINCT FROM p_user_id   -- locked by someone else
       AND lock_expires_at > v_now                 -- and not yet expired
     );

  IF v_unavailable_ids IS NOT NULL AND array_length(v_unavailable_ids, 1) > 0 THEN
    DROP TABLE _target_seats;
    RAISE EXCEPTION 'SEATS_UNAVAILABLE: Seats % are already booked or held.', v_unavailable_ids
      USING ERRCODE = 'P0001';
  END IF;

  -- Step 4: All seats are available (or expired locks by others, or re-held by same user).
  -- Update them atomically within this transaction.
  UPDATE show_seats
  SET
    status          = 'locked',
    locked_by       = p_user_id,
    locked_at       = v_now,
    lock_expires_at = v_now + (p_hold_seconds || ' seconds')::INTERVAL,
    updated_at      = v_now
  WHERE id = ANY(p_seat_ids)
    AND show_id = p_show_id;

  SELECT array_agg(id) INTO v_locked_ids FROM _target_seats;
  DROP TABLE _target_seats;

  RETURN jsonb_build_object(
    'success',     true,
    'locked_ids',  v_locked_ids,
    'expires_at',  v_now + (p_hold_seconds || ' seconds')::INTERVAL
  );

EXCEPTION WHEN OTHERS THEN
  -- Cleanup temp table if it exists on any error path
  DROP TABLE IF EXISTS _target_seats;
  RAISE;
END;
$$;

-- ============================================================
-- FUNCTION: confirm_booking
--
-- Called after successful Razorpay payment.
-- IDEMPOTENT: if booking is already 'confirmed', returns success
-- without re-processing (handles double-calls from webhook + client).
--
-- Also re-verifies that seats are still locked by this user and
-- not expired — covers the gap between hold and payment completion.
-- ============================================================
CREATE OR REPLACE FUNCTION confirm_booking(
  p_booking_id UUID,
  p_user_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking       bookings;
  v_show_seat_ids UUID[];
  v_expired_seats UUID[];
  v_now           TIMESTAMPTZ := now();
BEGIN
  -- Step 1: Fetch and lock the booking row
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: Booking % not found for user %.', p_booking_id, p_user_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Step 2: IDEMPOTENCY CHECK — already confirmed, return success immediately
  IF v_booking.status = 'confirmed' THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'status', 'confirmed');
  END IF;

  -- Step 3: Only process bookings in 'created' state
  IF v_booking.status != 'created' THEN
    RAISE EXCEPTION 'BOOKING_INVALID_STATE: Booking is in state %, cannot confirm.', v_booking.status
      USING ERRCODE = 'P0003';
  END IF;

  -- Step 4: Get the show_seat IDs for this booking
  SELECT array_agg(show_seat_id)
  INTO v_show_seat_ids
  FROM booking_seats
  WHERE booking_id = p_booking_id;

  -- Step 5: Lock the show_seats rows.
  -- This closes the race window between "hold seats" and "confirm booking".
  -- We use PERFORM ... FOR UPDATE to avoid using FOR UPDATE with an aggregate function.
  PERFORM 1
  FROM show_seats ss
  WHERE ss.id = ANY(v_show_seat_ids)
  FOR UPDATE;  -- serialize with any concurrent expiry job

  -- Now check: any seat not locked by this user, or expired?
  SELECT array_agg(ss.id)
  INTO v_expired_seats
  FROM show_seats ss
  WHERE ss.id = ANY(v_show_seat_ids)
    AND (
      ss.status != 'locked'
      OR ss.locked_by != p_user_id
      OR ss.lock_expires_at <= v_now
    );

  IF v_expired_seats IS NOT NULL AND array_length(v_expired_seats, 1) > 0 THEN
    -- Seats expired mid-checkout — expire the booking
    UPDATE bookings SET status = 'expired', updated_at = v_now WHERE id = p_booking_id;
    RAISE EXCEPTION 'SEATS_EXPIRED: Your seat hold expired. Please select seats again.'
      USING ERRCODE = 'P0004';
  END IF;

  -- Step 6: Flip seats to 'booked' (clear lock metadata)
  UPDATE show_seats
  SET
    status          = 'booked',
    locked_by       = NULL,
    locked_at       = NULL,
    lock_expires_at = NULL,
    updated_at      = v_now
  WHERE id = ANY(v_show_seat_ids);

  -- Step 7: Confirm the booking
  UPDATE bookings
  SET status = 'confirmed', updated_at = v_now
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'idempotent', false, 'status', 'confirmed');
END;
$$;

-- ============================================================
-- FUNCTION: cancel_booking
-- Called on payment failure or user cancellation.
-- Releases seat locks and marks booking cancelled/expired.
-- ============================================================
CREATE OR REPLACE FUNCTION cancel_booking(
  p_booking_id UUID,
  p_user_id    UUID,
  p_reason     TEXT DEFAULT 'cancelled'  -- 'cancelled' | 'expired' | 'payment_failed'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking       bookings;
  v_show_seat_ids UUID[];
  v_new_status    TEXT;
  v_now           TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Already terminal state
  IF v_booking.status IN ('cancelled', 'expired') THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true);
  END IF;

  -- Cannot cancel a confirmed booking via this path
  IF v_booking.status = 'confirmed' THEN
    RAISE EXCEPTION 'BOOKING_ALREADY_CONFIRMED' USING ERRCODE = 'P0005';
  END IF;

  SELECT array_agg(show_seat_id) INTO v_show_seat_ids
  FROM booking_seats WHERE booking_id = p_booking_id;

  -- Release seat locks → back to available
  UPDATE show_seats
  SET
    status          = 'available',
    locked_by       = NULL,
    locked_at       = NULL,
    lock_expires_at = NULL,
    updated_at      = v_now
  WHERE id = ANY(v_show_seat_ids)
    AND locked_by = p_user_id;  -- only release OUR locks, not others'

  v_new_status := CASE WHEN p_reason = 'expired' THEN 'expired' ELSE 'cancelled' END;

  UPDATE bookings SET status = v_new_status, updated_at = v_now WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- ============================================================
-- FUNCTION: release_expired_locks
-- Scheduled every 30 seconds via pg_cron.
-- Reverts any show_seats where status='locked' but lock has expired.
-- Also expires bookings whose seats have all expired.
-- ============================================================
CREATE OR REPLACE FUNCTION release_expired_locks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now         TIMESTAMPTZ := now();
  v_released    INTEGER;
BEGIN
  -- Release expired seat locks
  WITH released AS (
    UPDATE show_seats
    SET
      status          = 'available',
      locked_by       = NULL,
      locked_at       = NULL,
      lock_expires_at = NULL,
      updated_at      = v_now
    WHERE status = 'locked'
      AND lock_expires_at < v_now
    RETURNING id
  )
  SELECT COUNT(*) INTO v_released FROM released;

  -- Expire bookings that are still 'created' but have no locked seats
  -- (their seats were just released above, or released earlier)
  UPDATE bookings b
  SET status = 'expired', updated_at = v_now
  WHERE b.status = 'created'
    AND NOT EXISTS (
      SELECT 1
      FROM booking_seats bs
      JOIN show_seats ss ON ss.id = bs.show_seat_id
      WHERE bs.booking_id = b.id
        AND ss.status = 'locked'
        AND ss.locked_by = b.user_id
    );

  RETURN jsonb_build_object('released_seats', v_released, 'ran_at', v_now);
END;
$$;

-- ============================================================
-- SCHEDULE: pg_cron job — release expired locks every 30 seconds
-- pg_cron is enabled on all Supabase tiers as of 2026
-- ============================================================
SELECT cron.schedule(
  'release-expired-seat-locks',
  '30 seconds',
  $$SELECT release_expired_locks()$$
);

-- ============================================================
-- FUNCTION: create_booking
-- Server-side booking creation that re-verifies lock ownership.
-- Called from Next.js API route (using service role key).
-- ============================================================
CREATE OR REPLACE FUNCTION create_booking(
  p_user_id      UUID,
  p_show_id      UUID,
  p_show_seat_ids UUID[],
  p_total_amount INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id    UUID;
  v_expired_seats UUID[];
  v_now           TIMESTAMPTZ := now();
BEGIN
  -- Re-verify all seats are still locked by this user (not expired)
  SELECT array_agg(ss.id)
  INTO v_expired_seats
  FROM show_seats ss
  WHERE ss.id = ANY(p_show_seat_ids)
    AND (
      ss.status != 'locked'
      OR ss.locked_by IS DISTINCT FROM p_user_id
      OR ss.lock_expires_at <= v_now
    );

  IF v_expired_seats IS NOT NULL AND array_length(v_expired_seats, 1) > 0 THEN
    RAISE EXCEPTION 'SEATS_EXPIRED: Seat hold expired before booking was created.'
      USING ERRCODE = 'P0004';
  END IF;

  -- Create the booking record
  INSERT INTO bookings (user_id, show_id, status, total_amount)
  VALUES (p_user_id, p_show_id, 'created', p_total_amount)
  RETURNING id INTO v_booking_id;

  -- Create booking_seats join rows
  INSERT INTO booking_seats (booking_id, show_seat_id)
  SELECT v_booking_id, unnest(p_show_seat_ids);

  RETURN jsonb_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;
