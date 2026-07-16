import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseServiceClient } from '@/lib/data/supabase-client';

export async function POST(req: NextRequest) {
  try {
    const rawBody   = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature header' }, { status: 400 });
    }

    if (!secret) {
      console.error('[webhook] RAZORPAY_WEBHOOK_SECRET is not set in environment variables.');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // 1. Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('[webhook] Invalid signature detected.');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const eventData = JSON.parse(rawBody);
    console.log(`[webhook] Received event: ${eventData.event}`);

    // We only process order.paid or payment.captured
    if (eventData.event === 'order.paid') {
      const orderEntity = eventData.payload?.order?.entity;
      const orderId     = orderEntity?.id;
      const receipt     = orderEntity?.receipt;

      let bookingId = '';

      if (receipt) {
        if (receipt.startsWith('booking_')) {
          bookingId = receipt.replace('booking_', '');
        } else {
          bookingId = receipt;
        }
      }

      const supabase = getSupabaseServiceClient() as any;

      // If receipt parsing failed, look up in payments table
      if (!bookingId && orderId) {
        const { data: payment } = await supabase
          .from('payments')
          .select('booking_id')
          .eq('provider_reference', orderId)
          .single();
        if (payment) {
          bookingId = payment.booking_id;
        }
      }

      if (!bookingId) {
        console.warn(`[webhook] Could not resolve booking ID for order: ${orderId}`);
        return NextResponse.json({ error: 'Could not resolve booking' }, { status: 400 });
      }

      // Fetch the booking to get the user ID
      const { data: booking, error: fetchErr } = await supabase
        .from('bookings')
        .select('user_id, status')
        .eq('id', bookingId)
        .single();

      if (fetchErr || !booking) {
        console.error(`[webhook] Booking not found: ${bookingId}`, fetchErr);
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
      }

      // If already confirmed, no-op
      if (booking.status === 'confirmed') {
        console.log(`[webhook] Booking ${bookingId} already confirmed. Skipping.`);
        return NextResponse.json({ success: true, message: 'Already processed' });
      }

      // 2. Confirm booking via idempotent RPC (runs as SECURITY DEFINER)
      const { error: confirmErr } = await supabase.rpc('confirm_booking', {
        p_booking_id: bookingId,
        p_user_id:    booking.user_id,
      });

      if (confirmErr) {
        console.error('[webhook] confirm_booking RPC failed:', confirmErr);
        return NextResponse.json({ error: confirmErr.message }, { status: 500 });
      }

      // 3. Update payment status to success
      await supabase
        .from('payments')
        .update({ status: 'success' })
        .eq('booking_id', bookingId);

      console.log(`[webhook] Booking ${bookingId} successfully confirmed via webhook.`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[webhook] Webhook handling error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
