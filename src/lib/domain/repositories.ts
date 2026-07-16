// ============================================================
// lib/domain/repositories.ts
// Repository interfaces — pure TypeScript, no Supabase
// ============================================================
import type {
  Movie, Theater, Screen, Seat, Show, ShowSeat, Booking,
  Payment, Profile, MovieFilters, ShowtimesByTheater,
  ShowWithOccupancy, HoldSeatsResult, CreateBookingResult,
} from './types';

export interface MovieRepository {
  getMovies(filters?: MovieFilters): Promise<Movie[]>;
  getMovieById(id: string): Promise<Movie | null>;
  getCities(): Promise<string[]>;
  createMovie(data: Omit<Movie, 'id' | 'created_at' | 'updated_at'>): Promise<Movie>;
  updateMovie(id: string, data: Partial<Movie>): Promise<Movie>;
  deleteMovie(id: string): Promise<void>;
}

export interface TheaterRepository {
  getTheaters(city?: string): Promise<Theater[]>;
  getTheaterById(id: string): Promise<Theater | null>;
  createTheater(data: Omit<Theater, 'id' | 'created_at' | 'updated_at'>): Promise<Theater>;
  updateTheater(id: string, data: Partial<Theater>): Promise<Theater>;
  deleteTheater(id: string): Promise<void>;
}

export interface ScreenRepository {
  getScreensByTheater(theaterId: string): Promise<Screen[]>;
  getScreenById(id: string): Promise<Screen | null>;
  createScreen(data: Omit<Screen, 'id' | 'created_at' | 'updated_at'>): Promise<Screen>;
  updateScreen(id: string, data: Partial<Screen>): Promise<Screen>;
  deleteScreen(id: string): Promise<void>;
}

export interface SeatRepository {
  getSeatsByScreen(screenId: string): Promise<Seat[]>;
  createSeatsForScreen(screenId: string, rows: number, cols: number, seatTypeMap?: Record<string, 'regular' | 'premium' | 'recliner'>): Promise<Seat[]>;
}

export interface ShowRepository {
  getShowsByMovie(movieId: string, fromDate?: string, toDate?: string): Promise<Show[]>;
  getShowsByMovieGrouped(movieId: string, fromDate?: string): Promise<ShowtimesByTheater[]>;
  getShowById(id: string): Promise<Show | null>;
  getShowSeats(showId: string): Promise<ShowSeat[]>;
  holdSeats(showId: string, seatIds: string[], userId: string, holdSeconds?: number): Promise<HoldSeatsResult>;
  confirmBooking(bookingId: string, userId: string): Promise<{ success: boolean; idempotent: boolean }>;
  cancelBooking(bookingId: string, userId: string, reason?: string): Promise<{ success: boolean }>;
  createShow(data: Omit<Show, 'id' | 'created_at' | 'updated_at' | 'movie' | 'screen'>): Promise<Show>;
  updateShow(id: string, data: Partial<Show>): Promise<Show>;
  createShowSeatsFromScreen(showId: string, screenId: string, basePrice: number): Promise<void>;
  getShowsWithOccupancy(movieId?: string): Promise<ShowWithOccupancy[]>;
}

export interface BookingRepository {
  getBookingsByUser(userId: string): Promise<Booking[]>;
  getBookingById(bookingId: string): Promise<Booking | null>;
  createBooking(userId: string, showId: string, showSeatIds: string[], totalAmount: number): Promise<CreateBookingResult>;
  cancelBooking(bookingId: string, userId: string): Promise<void>;
  getPaymentByBooking(bookingId: string): Promise<Payment | null>;
  createPayment(bookingId: string, amount: number, method: string, providerReference: string): Promise<Payment>;
  updatePaymentStatus(paymentId: string, status: 'success' | 'failed', providerReference?: string): Promise<void>;
}

export interface ProfileRepository {
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, data: Partial<Profile>): Promise<Profile>;
  uploadAvatar(userId: string, file: File): Promise<string>;
}
