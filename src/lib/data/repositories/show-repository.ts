// ============================================================
// lib/data/repositories/show-repository.ts
// ============================================================

import { getSupabaseBrowserClient, getSupabaseServiceClient } from '../supabase-client';
import type { ShowRepository } from '@/lib/domain/repositories';
import type {
  Show, ShowSeat, ShowtimesByTheater, ShowWithOccupancy,
  HoldSeatsResult,
} from '@/lib/domain/types';
import { calculateSeatPrice } from '@/lib/domain/pricing';

export class SupabaseShowRepository implements ShowRepository {
  private get client() { return getSupabaseBrowserClient(); }

  async getShowsByMovie(movieId: string, fromDate?: string, toDate?: string): Promise<Show[]> {
    let query = this.client
      .from('shows')
      .select(`
        *,
        movie:movies(*),
        screen:screens(*, theater:theaters(*))
      `)
      .eq('movie_id', movieId)
      .eq('is_active', true)
      .order('start_time', { ascending: true });

    if (fromDate) query = query.gte('start_time', fromDate);
    if (toDate)   query = query.lte('start_time', toDate);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Show[];
  }

  async getShowsByMovieGrouped(movieId: string, fromDate?: string): Promise<ShowtimesByTheater[]> {
    const from = fromDate ?? new Date().toISOString();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const shows = await this.getShowsByMovie(movieId, from, to);

    // Group by theater
    const theaterMap = new Map<string, ShowtimesByTheater>();

    for (const show of shows) {
      if (!show.screen?.theater) continue;
      const theaterId = show.screen.theater.id;
      if (!theaterMap.has(theaterId)) {
        theaterMap.set(theaterId, {
          theater: show.screen.theater,
          screen: show.screen,
          shows: [],
        });
      }
      theaterMap.get(theaterId)!.shows.push(show);
    }

    return Array.from(theaterMap.values());
  }

  async getShowById(id: string): Promise<Show | null> {
    const { data, error } = await this.client
      .from('shows')
      .select(`*, movie:movies(*), screen:screens(*, theater:theaters(*))`)
      .eq('id', id)
      .single();
    if (error) return null;
    return data as unknown as Show;
  }

  async getShowSeats(showId: string): Promise<ShowSeat[]> {
    const { data, error } = await this.client
      .from('show_seats')
      .select(`*, seat:seats(*)`)
      .eq('show_id', showId)
      .order('seat(row_label)', { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ShowSeat[];
  }

  async holdSeats(
    showId: string,
    seatIds: string[],
    userId: string,
    holdSeconds = 600
  ): Promise<HoldSeatsResult> {
    const { data, error } = await (this.client as any).rpc('hold_seats', {
      p_show_id:      showId,
      p_seat_ids:     seatIds,
      p_user_id:      userId,
      p_hold_seconds: holdSeconds,
    });

    if (error) throw new Error(error.message);
    return data as HoldSeatsResult;
  }

  async confirmBooking(bookingId: string, userId: string) {
    const { data, error } = await (this.client as any).rpc('confirm_booking', {
      p_booking_id: bookingId,
      p_user_id:    userId,
    });
    if (error) throw new Error(error.message);
    return data as { success: boolean; idempotent: boolean };
  }

  async cancelBooking(bookingId: string, userId: string, reason = 'cancelled') {
    const { data, error } = await (this.client as any).rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_user_id:    userId,
      p_reason:     reason,
    });
    if (error) throw new Error(error.message);
    return data as { success: boolean };
  }

  async createShow(showData: Omit<Show, 'id' | 'created_at' | 'updated_at' | 'movie' | 'screen'>): Promise<Show> {
    const client = getSupabaseServiceClient();
    const { data, error } = await (client.from('shows') as any)
      .insert(showData)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Show;
  }

  async updateShow(id: string, showData: Partial<Show>): Promise<Show> {
    const client = getSupabaseServiceClient();
    const { data, error } = await (client.from('shows') as any)
      .update(showData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Show;
  }

  async createShowSeatsFromScreen(showId: string, screenId: string, basePrice: number): Promise<void> {
    const client = getSupabaseServiceClient();
    const { data: seats, error: seatsError } = await (client.from('seats') as any)
      .select('*')
      .eq('screen_id', screenId);

    if (seatsError) throw new Error(seatsError.message);

    const showSeats = (seats ?? []).map((seat: any) => ({
      show_id:  showId,
      seat_id:  seat.id,
      price:    calculateSeatPrice(basePrice, seat.seat_type as 'regular' | 'premium' | 'recliner'),
      status:   'available' as const,
    }));

    const { error } = await (client.from('show_seats') as any).insert(showSeats);
    if (error) throw new Error(error.message);
  }

  async getShowsWithOccupancy(movieId?: string): Promise<ShowWithOccupancy[]> {
    let query = getSupabaseServiceClient()
      .from('shows')
      .select(`
        *,
        movie:movies(*),
        screen:screens(*, theater:theaters(*)),
        show_seats(status, price)
      `)
      .eq('is_active', true)
      .order('start_time', { ascending: false });

    if (movieId) query = query.eq('movie_id', movieId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data ?? []).map((show: any) => {
      const total   = show.show_seats?.length ?? 0;
      const booked  = show.show_seats?.filter((s: any) => s.status === 'booked').length ?? 0;
      const locked  = show.show_seats?.filter((s: any) => s.status === 'locked').length ?? 0;
      const revenue = show.show_seats
        ?.filter((s: any) => s.status === 'booked')
        .reduce((sum: number, s: any) => sum + s.price, 0) ?? 0;

      return {
        ...show,
        total_seats:       total,
        booked_seats:      booked,
        locked_seats:      locked,
        available_seats:   total - booked - locked,
        occupancy_percent: total > 0 ? Math.round((booked / total) * 100) : 0,
        revenue,
      };
    });
  }
}
