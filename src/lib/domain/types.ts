// ============================================================
// lib/domain/types.ts
// Pure TypeScript domain types — NO Supabase imports
// All monetary values in paise (1 INR = 100 paise)
// All timestamps in UTC (TIMESTAMPTZ from DB)
// ============================================================

export type SeatType = 'regular' | 'premium' | 'recliner';
export type SeatStatus = 'available' | 'locked' | 'booked';
export type BookingStatus = 'created' | 'confirmed' | 'cancelled' | 'expired';
export type PaymentStatus = 'pending' | 'success' | 'failed';
export type UserRole = 'customer' | 'admin';

export interface Movie {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  genre: string;
  language: string;
  poster_url: string | null;
  rating: number | null;
  release_date: string; // ISO date string
  is_active: boolean;
  trailer_url?: string | null;
  tmdb_id?: number | null;
  imdb_id?: string | null;
  backdrop_url?: string | null;
  vote_count?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Theater {
  id: string;
  name: string;
  city: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Screen {
  id: string;
  theater_id: string;
  name: string;
  total_rows: number;
  total_columns: number;
  created_at: string;
  updated_at: string;
}

export interface Seat {
  id: string;
  screen_id: string;
  row_label: string;
  seat_number: number;
  seat_type: SeatType;
  created_at: string;
  updated_at: string;
}

export interface Show {
  id: string;
  movie_id: string;
  screen_id: string;
  start_time: string; // ISO datetime (UTC)
  end_time: string;   // ISO datetime (UTC)
  base_price: number; // paise
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields (when fetched with relations)
  movie?: Movie;
  screen?: Screen & { theater?: Theater };
}

export interface ShowSeat {
  id: string;
  show_id: string;
  seat_id: string;
  price: number;        // paise
  status: SeatStatus;
  locked_by: string | null;
  locked_at: string | null;
  lock_expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  seat?: Seat;
}

export interface Booking {
  id: string;
  user_id: string;
  show_id: string;
  status: BookingStatus;
  total_amount: number; // paise
  created_at: string;
  updated_at: string;
  // Joined
  show?: Show;
  booking_seats?: BookingSeat[];
  payments?: Payment[];
}

export interface BookingSeat {
  id: string;
  booking_id: string;
  show_seat_id: string;
  created_at: string;
  // Joined
  show_seat?: ShowSeat;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number; // paise
  method: string | null;
  status: PaymentStatus;
  provider_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Derived / view types used in UI
// ============================================================

/** A grid cell in the seat map */
export interface SeatCell {
  showSeatId: string;
  seatId: string;
  rowLabel: string;
  seatNumber: number;
  seatType: SeatType;
  status: SeatStatus;
  price: number; // paise
  lockedByCurrentUser: boolean;
  lockExpiresAt: string | null;
}

/** A row in the seat map grid */
export interface SeatRow {
  rowLabel: string;
  cells: SeatCell[];
}

/** Seat map with rows grouped */
export interface SeatMapData {
  rows: SeatRow[];
  totalSeats: number;
  availableSeats: number;
  lockedSeats: number;
  bookedSeats: number;
}

/** Booking summary for checkout */
export interface BookingSummary {
  selectedSeats: SeatCell[];
  subtotal: number;       // paise
  convenienceFee: number; // paise (2.5% of subtotal)
  taxes: number;          // paise (18% GST)
  totalAmount: number;    // paise
}

/** Admin show with occupancy stats */
export interface ShowWithOccupancy extends Show {
  total_seats: number;
  booked_seats: number;
  locked_seats: number;
  available_seats: number;
  occupancy_percent: number;
  revenue: number; // paise
}

/** Hold seats RPC response */
export interface HoldSeatsResult {
  success: boolean;
  locked_ids: string[];
  expires_at: string;
}

/** Create booking RPC response */
export interface CreateBookingResult {
  success: boolean;
  booking_id: string;
}

/** Razorpay payment intent */
export interface PaymentIntent {
  orderId: string;
  amount: number;    // paise
  currency: string;  // 'INR'
  key: string;       // Razorpay key_id (publishable)
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  orderId: string;
  signature: string;
}

/** Filters for browsing movies */
export interface MovieFilters {
  city?: string;
  genre?: string;
  language?: string;
  date?: string; // ISO date
}

/** Showtime grouped by theater (for movie detail page) */
export interface ShowtimesByTheater {
  theater: Theater;
  screen: Screen;
  shows: Show[];
}
