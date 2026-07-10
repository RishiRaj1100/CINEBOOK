-- ============================================================
-- 002_rls.sql
-- Row Level Security policies for all tables
-- Principle: deny by default, grant explicitly
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE movies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE theaters     ENABLE ROW LEVEL SECURITY;
ALTER TABLE screens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows        ENABLE ROW LEVEL SECURITY;
ALTER TABLE show_seats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper function: is current user an admin?
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- profiles
-- Users see/edit only their own profile; admins see all
-- ============================================================
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id OR is_admin());

-- ============================================================
-- movies — public read, admin write
-- ============================================================
CREATE POLICY "movies_select_all" ON movies
  FOR SELECT USING (true);

CREATE POLICY "movies_insert_admin" ON movies
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "movies_update_admin" ON movies
  FOR UPDATE USING (is_admin());

CREATE POLICY "movies_delete_admin" ON movies
  FOR DELETE USING (is_admin());

-- ============================================================
-- theaters — public read, admin write
-- ============================================================
CREATE POLICY "theaters_select_all" ON theaters
  FOR SELECT USING (true);

CREATE POLICY "theaters_insert_admin" ON theaters
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "theaters_update_admin" ON theaters
  FOR UPDATE USING (is_admin());

CREATE POLICY "theaters_delete_admin" ON theaters
  FOR DELETE USING (is_admin());

-- ============================================================
-- screens — public read, admin write
-- ============================================================
CREATE POLICY "screens_select_all" ON screens
  FOR SELECT USING (true);

CREATE POLICY "screens_insert_admin" ON screens
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "screens_update_admin" ON screens
  FOR UPDATE USING (is_admin());

CREATE POLICY "screens_delete_admin" ON screens
  FOR DELETE USING (is_admin());

-- ============================================================
-- seats — public read, admin write
-- ============================================================
CREATE POLICY "seats_select_all" ON seats
  FOR SELECT USING (true);

CREATE POLICY "seats_insert_admin" ON seats
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "seats_update_admin" ON seats
  FOR UPDATE USING (is_admin());

CREATE POLICY "seats_delete_admin" ON seats
  FOR DELETE USING (is_admin());

-- ============================================================
-- shows — public read, admin write
-- ============================================================
CREATE POLICY "shows_select_all" ON shows
  FOR SELECT USING (true);

CREATE POLICY "shows_insert_admin" ON shows
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "shows_update_admin" ON shows
  FOR UPDATE USING (is_admin());

CREATE POLICY "shows_delete_admin" ON shows
  FOR DELETE USING (is_admin());

-- ============================================================
-- show_seats — public read ONLY
-- Mutations ONLY via SECURITY DEFINER RPC functions (hold_seats,
-- confirm_booking, release_expired_locks). No direct client writes.
-- ============================================================
CREATE POLICY "show_seats_select_all" ON show_seats
  FOR SELECT USING (true);

-- Intentionally NO insert/update/delete policies for direct client access.
-- Only SECURITY DEFINER functions can mutate this table.

-- ============================================================
-- bookings — customers see/write their own; admins see all
-- ============================================================
CREATE POLICY "bookings_select_own" ON bookings
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "bookings_insert_own" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "bookings_update_own" ON bookings
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

-- ============================================================
-- booking_seats — accessible only if user owns the parent booking
-- ============================================================
CREATE POLICY "booking_seats_select_own" ON booking_seats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_seats.booking_id
        AND (bookings.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "booking_seats_insert_own" ON booking_seats
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_seats.booking_id
        AND bookings.user_id = auth.uid()
    )
  );

-- ============================================================
-- payments — customers see their own; admins see all
-- ============================================================
CREATE POLICY "payments_select_own" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
        AND (bookings.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "payments_insert_own" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
        AND bookings.user_id = auth.uid()
    )
  );

CREATE POLICY "payments_update_own" ON payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
        AND (bookings.user_id = auth.uid() OR is_admin())
    )
  );
