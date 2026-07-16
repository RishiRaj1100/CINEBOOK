'use client';
import type { BookingSummary as BSummary } from '@/lib/domain/types';
import { formatINR } from '@/lib/domain/pricing';
import { formatSeatLabel } from '@/lib/domain/seat-map';
import { ShoppingCart, Loader2, Lock, CreditCard } from 'lucide-react';

interface Props {
  summary:             BSummary;
  holdExpiresAt:       string | null;
  onHoldSeats:         () => Promise<void>;
  onProceedToCheckout: () => Promise<void>;
  holding:             boolean;
  checking:            boolean;
}

export default function BookingSummaryPanel({
  summary, holdExpiresAt, onHoldSeats, onProceedToCheckout, holding, checking,
}: Props) {
  const { selectedSeats, subtotal, convenienceFee, taxes, totalAmount } = summary;
  const hasSeats   = selectedSeats.length > 0;
  const isHeld     = !!holdExpiresAt;

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, rgba(229,9,20,0.1), rgba(255,107,53,0.05))',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <ShoppingCart size={18} color="#e50914" />
        <span style={{ fontWeight: 700, color: '#f0f0f0' }}>Booking Summary</span>
        {hasSeats && (
          <span style={{
            marginLeft: 'auto', background: '#e50914', color: 'white',
            borderRadius: '50%', width: 22, height: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}>
            {selectedSeats.length}
          </span>
        )}
      </div>

      <div style={{ padding: '20px' }}>
        {!hasSeats ? (
          <p style={{ color: '#8b8b9a', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
            Select seats on the map to begin.
          </p>
        ) : (
          <>
            {/* Selected Seats */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#8b8b9a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                Selected Seats
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedSeats.map((seat) => (
                  <div key={seat.showSeatId} style={{
                    background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)',
                    borderRadius: 6, padding: '4px 10px', fontSize: 13,
                  }}>
                    <span style={{ color: '#e50914', fontWeight: 700 }}>
                      {formatSeatLabel(seat.rowLabel, seat.seatNumber)}
                    </span>
                    <span style={{ color: '#8b8b9a', marginLeft: 4, fontSize: 11 }}>
                      {seat.seatType}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Breakdown */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
              <PriceRow label={`Subtotal (${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''})`} amount={subtotal} />
              <PriceRow label="Convenience fee (2.5%)" amount={convenienceFee} />
              <PriceRow label="GST (18%)" amount={taxes} />
              <div style={{
                marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontWeight: 700, color: '#f0f0f0', fontSize: 16 }}>Total</span>
                <span style={{
                  fontWeight: 800, fontSize: 22,
                  background: 'linear-gradient(135deg, #e50914, #ff6b35)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {formatINR(totalAmount)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!isHeld ? (
            <button
              onClick={onHoldSeats}
              disabled={!hasSeats || holding}
              style={{
                width: '100%', padding: '14px',
                background: hasSeats ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#2a2a3a',
                border: 'none', borderRadius: 10,
                color: hasSeats ? 'white' : '#8b8b9a',
                fontWeight: 700, fontSize: 15, cursor: hasSeats ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {holding ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Lock size={18} />}
              {holding ? 'Holding seats...' : 'Hold Seats (10 min)'}
            </button>
          ) : (
            <button
              onClick={onProceedToCheckout}
              disabled={checking}
              style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(135deg, #e50914, #c40812)',
                border: 'none', borderRadius: 10,
                color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 4px 20px rgba(229,9,20,0.3)',
              }}
            >
              {checking ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CreditCard size={18} />}
              {checking ? 'Processing...' : `Pay ${formatINR(totalAmount)}`}
            </button>
          )}
        </div>

        {hasSeats && !isHeld && (
          <p style={{ color: '#8b8b9a', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
            Seats will be held for 10 minutes while you complete payment.
          </p>
        )}
      </div>
    </div>
  );
}

function PriceRow({ label, amount }: { label: string; amount: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ color: '#8b8b9a', fontSize: 13 }}>{label}</span>
      <span style={{ color: '#f0f0f0', fontSize: 13 }}>{formatINR(amount)}</span>
    </div>
  );
}
