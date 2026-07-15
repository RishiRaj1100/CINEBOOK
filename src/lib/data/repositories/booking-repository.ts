// ============================================================
// lib/data/repositories/booking-repository.ts
// ============================================================

import { getSupabaseBrowserClient, getSupabaseServiceClient } from '../supabase-client';
import type { BookingRepository } from '@/lib/domain/repositories';
import type { Booking, Payment, CreateBookingResult } from '@/lib/domain/types';

export class SupabaseBookingRepository implements BookingRepository {
  private get client() { return getSupabaseBrowserClient(); }

  async getBookingsByUser(userId: string): Promise<Booking[]> {
    const { data, error } = await this.client
      .from('bookings')
      .select(`
        *,
        show:shows(
          *,
          movie:movies(*),
          screen:screens(*, theater:theaters(*))
        ),
        booking_seats(
          *,
          show_seat:show_seats(*, seat:seats(*))
        ),
        payments(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Booking[];
  }

  async getBookingById(bookingId: string): Promise<Booking | null> {
    const { data, error } = await this.client
      .from('bookings')
      .select(`
        *,
        show:shows(
          *,
          movie:movies(*),
          screen:screens(*, theater:theaters(*))
        ),
        booking_seats(
          *,
          show_seat:show_seats(*, seat:seats(*))
        ),
        payments(*)
      `)
      .eq('id', bookingId)
      .single();

    if (error) return null;
    return data as unknown as Booking;
  }

  async createBooking(
    userId: string,
    showId: string,
    showSeatIds: string[],
    totalAmount: number,
  ): Promise<CreateBookingResult> {
    // Call the server-side RPC which re-verifies lock ownership
    const { data, error } = await (this.client as any).rpc('create_booking', {
      p_user_id:       userId,
      p_show_id:       showId,
      p_show_seat_ids: showSeatIds,
      p_total_amount:  totalAmount,
    });

    if (error) throw new Error(error.message);
    return data as CreateBookingResult;
  }

  async cancelBooking(bookingId: string, userId: string): Promise<void> {
    const { error } = await (this.client as any).rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_user_id:    userId,
      p_reason:     'cancelled',
    });
    if (error) throw new Error(error.message);
  }

  async getPaymentByBooking(bookingId: string): Promise<Payment | null> {
    const { data, error } = await this.client
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data as Payment;
  }

  async createPayment(
    bookingId: string,
    amount: number,
    method: string,
    providerReference: string,
  ): Promise<Payment> {
    const { data, error } = await (this.client.from('payments') as any)
      .insert({
        booking_id:         bookingId,
        amount,
        method,
        status:             'pending',
        provider_reference: providerReference,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Payment;
  }

  async updatePaymentStatus(
    paymentId: string,
    status: 'success' | 'failed',
    providerReference?: string,
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };
    if (providerReference) updateData.provider_reference = providerReference;

    const client = getSupabaseServiceClient();
    const { error } = await (client.from('payments') as any)
      .update(updateData)
      .eq('id', paymentId);

    if (error) throw new Error(error.message);
  }
}
