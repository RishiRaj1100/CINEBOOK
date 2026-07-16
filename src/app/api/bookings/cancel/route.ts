import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/data/supabase-client';
import { getSupabaseServiceClient } from '@/lib/data/supabase-client';

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { bookingId } = await req.json();
    const serviceClient = getSupabaseServiceClient();

    const { error } = await serviceClient.rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_user_id:    user.id,
      p_reason:     'cancelled',
    } as any);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
