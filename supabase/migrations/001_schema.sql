-- ============================================================
-- 001_schema.sql
-- Full schema for the Movie Ticket Booking System
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Enable pg_cron for scheduled jobs (available on all Supabase tiers as of 2026)
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- Helper: auto-update updated_at on every row change
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: profiles
-- One row per auth.users entry; role distinguishes customer/admin
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- TABLE: movies
-- ============================================================
CREATE TABLE IF NOT EXISTS movies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  description      TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  genre            TEXT NOT NULL,
  language         TEXT NOT NULL DEFAULT 'English',
  poster_url       TEXT,
  rating           NUMERIC(3,1) CHECK (rating >= 0 AND rating <= 10),
  release_date     DATE NOT NULL,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_movies_updated_at
  BEFORE UPDATE ON movies
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_movies_release_date ON movies(release_date);
CREATE INDEX idx_movies_is_active ON movies(is_active);
CREATE INDEX idx_movies_genre ON movies(genre);

-- ============================================================
-- TABLE: theaters
-- ============================================================
CREATE TABLE IF NOT EXISTS theaters (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  city       TEXT NOT NULL,
  address    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_theaters_updated_at
  BEFORE UPDATE ON theaters
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_theaters_city ON theaters(city);

-- ============================================================
-- TABLE: screens
-- One screen = one auditorium inside a theater
-- ============================================================
CREATE TABLE IF NOT EXISTS screens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theater_id    UUID NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  total_rows    INTEGER NOT NULL CHECK (total_rows > 0),
  total_columns INTEGER NOT NULL CHECK (total_columns > 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_screens_updated_at
  BEFORE UPDATE ON screens
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_screens_theater_id ON screens(theater_id);

-- ============================================================
-- TABLE: seats
-- Physical seats — independent of any show.
-- Status lives on show_seats, NOT here.
-- ============================================================
CREATE TABLE IF NOT EXISTS seats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id   UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  row_label   TEXT NOT NULL,       -- e.g. 'A', 'B', 'C'
  seat_number INTEGER NOT NULL,    -- e.g. 1, 2, 3
  seat_type   TEXT NOT NULL DEFAULT 'regular'
                CHECK (seat_type IN ('regular', 'premium', 'recliner')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (screen_id, row_label, seat_number)  -- no duplicate physical seat
);

CREATE TRIGGER set_seats_updated_at
  BEFORE UPDATE ON seats
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_seats_screen_id ON seats(screen_id);

-- ============================================================
-- TABLE: shows
-- A specific screening event (movie + screen + time)
-- base_price stored in paise (smallest INR unit) — NO floats
-- ============================================================
CREATE TABLE IF NOT EXISTS shows (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id   UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  screen_id  UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time   TIMESTAMPTZ NOT NULL,
  base_price INTEGER NOT NULL CHECK (base_price > 0),  -- in paise
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (end_time > start_time)
);

CREATE TRIGGER set_shows_updated_at
  BEFORE UPDATE ON shows
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Critical for "movie detail" page: get shows for a movie within date range
CREATE INDEX idx_shows_movie_start ON shows(movie_id, start_time);
CREATE INDEX idx_shows_screen_id ON shows(screen_id);
CREATE INDEX idx_shows_start_time ON shows(start_time);
CREATE INDEX idx_shows_is_active ON shows(is_active);

-- ============================================================
-- TABLE: show_seats
-- THE CONCURRENCY TABLE.
-- One row per physical seat per show.
-- Status lives HERE — same physical seat has independent
-- availability across different shows.
-- price in paise.
-- ============================================================
CREATE TABLE IF NOT EXISTS show_seats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id         UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  seat_id         UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  price           INTEGER NOT NULL CHECK (price > 0),   -- paise
  status          TEXT NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'locked', 'booked')),
  locked_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at       TIMESTAMPTZ,
  lock_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- CRITICAL: prevents duplicate seat rows per show
  UNIQUE (show_id, seat_id)
);

CREATE TRIGGER set_show_seats_updated_at
  BEFORE UPDATE ON show_seats
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- These indexes are the performance backbone of the seat map query
CREATE INDEX idx_show_seats_show_id        ON show_seats(show_id);
CREATE INDEX idx_show_seats_status         ON show_seats(status);
CREATE INDEX idx_show_seats_show_status    ON show_seats(show_id, status);  -- composite for seat map query
CREATE INDEX idx_show_seats_lock_expires   ON show_seats(lock_expires_at)
  WHERE status = 'locked';  -- partial index — only locked rows matter for expiry

-- ============================================================
-- TABLE: bookings
-- total_amount in paise
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id      UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'created'
                 CHECK (status IN ('created', 'confirmed', 'cancelled', 'expired')),
  total_amount INTEGER NOT NULL CHECK (total_amount > 0),  -- paise
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Critical for "My Bookings" page
CREATE INDEX idx_bookings_user_id    ON bookings(user_id);
CREATE INDEX idx_bookings_show_id    ON bookings(show_id);
CREATE INDEX idx_bookings_status     ON bookings(status);
CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);

-- ============================================================
-- TABLE: booking_seats
-- Join table: one row per seat in a booking
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_seats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  show_seat_id UUID NOT NULL REFERENCES show_seats(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (booking_id, show_seat_id)
);

CREATE INDEX idx_booking_seats_booking_id   ON booking_seats(booking_id);
CREATE INDEX idx_booking_seats_show_seat_id ON booking_seats(show_seat_id);

-- ============================================================
-- TABLE: payments
-- amount in paise; provider_reference = Razorpay payment_id
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount             INTEGER NOT NULL CHECK (amount > 0),  -- paise
  method             TEXT,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'success', 'failed')),
  provider_reference TEXT,  -- Razorpay payment_id / order_id
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status     ON payments(status);

-- ============================================================
-- Auto-create profile on new user sign-up
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
