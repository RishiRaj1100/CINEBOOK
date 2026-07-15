// ============================================================
// lib/providers/repository-factory.ts
// DI factory — single place to wire up concrete implementations
// Components import from here, never from data/repositories directly
// ============================================================

import { SupabaseMovieRepository } from '@/lib/data/repositories/movie-repository';
import { SupabaseShowRepository }  from '@/lib/data/repositories/show-repository';
import { SupabaseBookingRepository } from '@/lib/data/repositories/booking-repository';
import type { MovieRepository, ShowRepository, BookingRepository } from '@/lib/domain/repositories';

// Singletons (browser-safe)
let _movieRepo:   MovieRepository   | null = null;
let _showRepo:    ShowRepository    | null = null;
let _bookingRepo: BookingRepository | null = null;

export function getMovieRepository(): MovieRepository {
  if (!_movieRepo) _movieRepo = new SupabaseMovieRepository();
  return _movieRepo;
}

export function getShowRepository(): ShowRepository {
  if (!_showRepo) _showRepo = new SupabaseShowRepository();
  return _showRepo;
}

export function getBookingRepository(): BookingRepository {
  if (!_bookingRepo) _bookingRepo = new SupabaseBookingRepository();
  return _bookingRepo;
}
