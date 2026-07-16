import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/data/supabase-client';
import { RazorpayPaymentProvider } from '@/lib/data/providers/razorpay-payment-provider';
import { getSupabaseServiceClient } from '@/lib/data/supabase-client';

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();

    // Verify signature
    const provider = new RazorpayPaymentProvider();
    const isValid  = provider.verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature });

    if (!isValid) {
      // Mark payment failed
      const serviceClient = getSupabaseServiceClient();
      await (serviceClient.from('payments') as any)
        .update({ status: 'failed', provider_reference: razorpayPaymentId })
        .eq('provider_reference', razorpayOrderId);

      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }

    // Confirm booking (SECURITY DEFINER RPC — idempotent)
    const serviceClient = getSupabaseServiceClient();
    const { data: confirmResult, error: confirmError } = await serviceClient
      .rpc('confirm_booking', { p_booking_id: bookingId, p_user_id: user.id } as any);

    if (confirmError) {
      console.error('[verify] confirm_booking failed:', confirmError);
      return NextResponse.json({ error: confirmError.message }, { status: 500 });
    }

    // Update payment record to success
    await (serviceClient.from('payments') as any)
      .update({ status: 'success', provider_reference: razorpayPaymentId })
      .eq('provider_reference', razorpayOrderId);

    return NextResponse.json({ success: true, bookingId });
  } catch (err: any) {
    console.error('[verify]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
