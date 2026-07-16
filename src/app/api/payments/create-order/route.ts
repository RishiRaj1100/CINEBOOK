import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/data/supabase-client';
import { RazorpayPaymentProvider } from '@/lib/data/providers/razorpay-payment-provider';

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await req.json();

    // Fetch booking (re-verify ownership via RLS)
    const { data: booking, error: bookingError } = await (supabase
      .from('bookings')
      .select('*, booking_seats(show_seat_id, show_seat:show_seats(status, locked_by, lock_expires_at))')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single() as any);

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'created') {
      return NextResponse.json({ error: 'Booking is not in created state' }, { status: 400 });
    }

    // Verify all seats still locked by this user
    const now = new Date();
    const expiredSeats = (booking.booking_seats ?? []).filter((bs: any) => {
      const ss = bs.show_seat;
      return !ss
        || ss.status !== 'locked'
        || ss.locked_by !== user.id
        || new Date(ss.lock_expires_at) <= now;
    });

    if (expiredSeats.length > 0) {
      return NextResponse.json({ error: 'Seat hold expired. Please select seats again.', code: 'SEATS_EXPIRED' }, { status: 409 });
    }

    // Create Razorpay order
    const provider = new RazorpayPaymentProvider();
    const order    = await provider.createOrder(
      booking.total_amount,
      'INR',
      bookingId
    );

    // Record pending payment
    await (supabase.from('payments') as any).insert({
      booking_id:         bookingId,
      amount:             booking.total_amount,
      method:             'razorpay',
      status:             'pending',
      provider_reference: order.orderId,
    });

    return NextResponse.json(order);
  } catch (err: any) {
    console.error('[create-order]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
