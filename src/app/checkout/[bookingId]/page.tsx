'use client';
import { useQuery } from '@tanstack/react-query';
import { getBookingRepository } from '@/lib/providers/repository-factory';
import { use, useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { formatINR } from '@/lib/domain/pricing';
import { formatSeatLabel } from '@/lib/domain/seat-map';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, CreditCard, Shield, AlertTriangle } from 'lucide-react';
import Script from 'next/script';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const { user } = useAuth();
  const router  = useRouter();
  const bookingRepo = getBookingRepository();

  const [processing, setProcessing] = useState(false);
  const [sdkLoaded,  setSdkLoaded]  = useState(false);

  // Fallback check to ensure we detect if Razorpay is already in window
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      setSdkLoaded(true);
    }
  }, []);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn:  () => bookingRepo.getBookingById(bookingId),
    enabled:  !!user,
  });

  const handlePayment = async () => {
    const isReady = sdkLoaded || (typeof window !== 'undefined' && !!window.Razorpay);
    if (!isReady) {
      toast.error('Razorpay SDK is still loading. Please wait a second.');
      return;
    }
    if (!user || !booking) return;
    setProcessing(true);


    try {
      // 1. Create Razorpay order server-side
      const resp = await fetch('/api/payments/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ bookingId }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        if (err.code === 'SEATS_EXPIRED') {
          toast.error('Your seat hold expired. Please select seats again.');
          router.push(`/shows/${booking.show_id}/seats`);
          return;
        }
        throw new Error(err.message);
      }

      const { orderId, amount, currency, key } = await resp.json();

      // 2. Open Razorpay payment dialog
      const options = {
        key,
        amount,
        currency,
        name:        'CineBook',
        description: `Booking #${bookingId.slice(0, 8)}`,
        order_id:    orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // 3. Verify payment server-side
          const verifyResp = await fetch('/api/payments/verify', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              bookingId,
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });

          if (verifyResp.ok) {
            toast.success('Payment successful! 🎉');
            router.push(`/bookings/${bookingId}`);
          } else {
            toast.error('Payment verification failed. Contact support.');
          }
        },
        prefill: { email: user.email },
        theme:   { color: '#e50914' },
        modal: {
          ondismiss: () => {
            setProcessing(false);
            toast.error('Payment cancelled.');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message ?? 'Payment failed.');
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!user || !booking) return;
    await fetch('/api/bookings/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    });
    router.push('/bookings');
  };

  if (isLoading || !booking) return <LoadingScreen />;

  const seats = booking.booking_seats ?? [];
  const show  = booking.show;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%' }}>
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #e50914, #c40812)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CreditCard size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f0f0f0', margin: '0 0 8px' }}>Complete Payment</h1>
          <p style={{ color: '#8b8b9a' }}>Secure payment via Razorpay</p>
        </div>

        {/* Booking Summary Card */}
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 16, overflow: 'hidden', marginBottom: 24,
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ fontWeight: 700, color: '#f0f0f0', fontSize: 16 }}>{show?.movie?.title}</div>
            <div style={{ color: '#8b8b9a', fontSize: 13, marginTop: 4 }}>
              {show?.screen?.theater?.name} · {show?.screen?.name}
            </div>
            {show?.start_time && (
              <div style={{ color: '#8b8b9a', fontSize: 13 }}>
                {format(new Date(show.start_time), 'EEE, dd MMM yyyy · hh:mm a')}
              </div>
            )}
          </div>

          <div style={{ padding: '16px 20px' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#8b8b9a', marginBottom: 8 }}>SEATS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {seats.map((bs) => bs.show_seat?.seat && (
                  <span key={bs.id} style={{
                    background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)',
                    borderRadius: 6, padding: '3px 10px', fontSize: 13, color: '#e50914', fontWeight: 600,
                  }}>
                    {formatSeatLabel(bs.show_seat.seat.row_label, bs.show_seat.seat.seat_number)}
                  </span>
                ))}
              </div>
            </div>

            <div style={{
              paddingTop: 12, borderTop: '1px solid var(--color-border)',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#8b8b9a' }}>Total Amount</span>
              <span style={{
                fontWeight: 800, fontSize: 24,
                background: 'linear-gradient(135deg, #e50914, #ff6b35)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {formatINR(booking.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
          padding: '10px 16px', borderRadius: 8,
          background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)',
        }}>
          <Shield size={16} color="#10b981" />
          <span style={{ color: '#8b8b9a', fontSize: 13 }}>
            256-bit SSL encrypted · Razorpay secured payment
          </span>
        </div>

        <button
          id="btn-pay-now"
          onClick={handlePayment}
          disabled={processing}
          style={{
            width: '100%', padding: '16px',
            background: processing ? '#2a2a3a' : 'linear-gradient(135deg, #e50914, #c40812)',
            border: 'none', borderRadius: 12, color: 'white',
            fontWeight: 700, fontSize: 17, cursor: processing ? 'not-allowed' : 'pointer',
            boxShadow: processing ? 'none' : '0 4px 20px rgba(229,9,20,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            marginBottom: 12,
          }}
        >
          {processing
            ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
            : <>Pay {formatINR(booking.total_amount)}</>
          }
        </button>

        <button
          onClick={handleCancel}
          style={{
            width: '100%', padding: '12px', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
            color: '#8b8b9a', fontSize: 14, cursor: 'pointer',
          }}
        >
          Cancel Booking
        </button>
      </div>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setSdkLoaded(true)}
        onError={() => toast.error('Failed to load Razorpay SDK')}
      />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={40} color="#e50914" style={{ animation: 'spin 1s linear infinite' }} />
    </div>
  );
}
