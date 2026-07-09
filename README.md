# CineBook — Movie Ticket Booking System

A production-style BookMyShow/Fandango clone built with Next.js 16, TypeScript, Tailwind CSS, Supabase, and Razorpay.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd movie-booking
npm install
```

### 2. Environment Variables
Supabase credentials are pre-filled in `.env.local`. Add your **Razorpay test keys**:
```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
```
Get Razorpay test keys from: https://dashboard.razorpay.com/app/keys (switch to Test Mode)

### 3. Run Database Migrations
Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/vsmlpxldavykyyosgvia/sql/new) and run these files in order:

1. `supabase/migrations/001_schema.sql` — Tables, indexes, triggers
2. `supabase/migrations/002_rls.sql` — Row Level Security policies  
3. `supabase/migrations/003_functions.sql` — RPC functions + pg_cron job
4. `supabase/migrations/004_seed.sql` — Sample movies & theaters (optional)

### 4. Make Yourself Admin
After creating an account:
```sql
-- Run in Supabase SQL Editor
UPDATE profiles SET role = 'admin' WHERE id = 'your-user-uuid';
```
Find your UUID: Supabase Dashboard → Authentication → Users.

### 5. Google OAuth (Optional)
1. [Google Cloud Console](https://console.cloud.google.com/) → Create OAuth 2.0 credentials
2. Authorized Redirect URI: `https://vsmlpxldavykyyosgvia.supabase.co/auth/v1/callback`
3. Supabase Dashboard → Authentication → Providers → Google → paste Client ID + Secret

### 6. Start Dev Server
```bash
npm run dev
# Opens http://localhost:3000
```

---

## 🔒 Anti-Double-Booking Mechanism

The core concurrency guarantee lives in the `hold_seats` Postgres function:

```sql
-- hold_seats uses SELECT ... FOR UPDATE SKIP LOCKED:
--
-- Scenario: User A and User B both try to book seat X simultaneously.
--
-- User A's transaction:
--   SELECT id FROM show_seats WHERE id = X FOR UPDATE SKIP LOCKED;
--   → Gets the row lock. Updates status='locked'.
--   → Commits.
--
-- User B's transaction (concurrent):
--   SELECT id FROM show_seats WHERE id = X FOR UPDATE SKIP LOCKED;
--   → Row is locked by A's active transaction → SKIPPED (not returned)
--   → Returned count (0) < requested count (1) → RAISE EXCEPTION → ROLLBACK
--
-- Result: User A gets the seat. User B gets a clean "seat unavailable" error.
-- No double booking possible. Serialized at the DB level.
```

**Additional safeguards:**
- `confirm_booking` is **idempotent** (double webhook calls are safe)
- `create_booking` **re-verifies** lock ownership before creating Razorpay order
- `pg_cron` releases expired locks every 30 seconds
- Frontend subscribes to **Supabase Realtime** — live seat status updates, no polling

---

## 💰 Currency
- Stored as **paise** (integer, no floats). `₹150 = 15000 paise`
- Seat prices: base × multiplier (regular 1×, premium 1.5×, recliner 2×)
- Convenience fee: 2.5% | GST: 18%

---

## 🏗️ Architecture
```
lib/domain/     ← Pure TypeScript, zero Supabase imports (testable, swappable)
lib/data/       ← Supabase implementations of domain interfaces
lib/providers/  ← Dependency injection factory
components/     ← UI components
app/            ← Next.js App Router pages + API routes
```
