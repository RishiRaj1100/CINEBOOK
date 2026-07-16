'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getShowRepository, getBookingRepository } from '@/lib/providers/repository-factory';
import { use, useState, useEffect, useCallback, useRef } from 'react';
import { buildSeatMap, getSeatColorClass, formatSeatLabel } from '@/lib/domain/seat-map';
import { buildBookingSummary, formatINR } from '@/lib/domain/pricing';
import { useAuth } from '@/components/providers/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/data/supabase-client';
import type { ShowSeat, SeatCell } from '@/lib/domain/types';
import CountdownTimer from '@/components/seat-map/CountdownTimer';
import SeatLegend from '@/components/seat-map/SeatLegend';
import BookingSummary from '@/components/booking/BookingSummary';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SeatsPage({ params }: { params: Promise<{ showId: string }> }) {
  const { showId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const showRepo    = getShowRepository();
  const bookingRepo = getBookingRepository();
  const supabase    = getSupabaseBrowserClient();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSeats,   setShowSeats]   = useState<ShowSeat[]>([]);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [holding,  setHolding]  = useState(false);
  const [checking, setChecking] = useState(false);

  // Fetch show info
  const { data: show } = useQuery({
    queryKey: ['show', showId],
    queryFn:  () => showRepo.getShowById(showId),
  });

  // Fetch show_seats (initial load)
  const { data: initialSeats, isLoading } = useQuery({
    queryKey: ['show-seats', showId],
    queryFn:  () => showRepo.getShowSeats(showId),
  });

  useEffect(() => {
    if (initialSeats) setShowSeats(initialSeats);
  }, [initialSeats]);

  // ── Realtime subscription ─────────────────────────────────
  useEffect(() => {
    if (!showId) return;

    const channel = supabase
      .channel(`show-seats:${showId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'show_seats',
          filter: `show_id=eq.${showId}`,
        },
        (payload) => {
          setShowSeats((prev) => {
            const updated = payload.new as ShowSeat;
            const idx = prev.findIndex((s) => s.id === updated.id);
            if (idx === -1) return [...prev, updated];
            const next = [...prev];
            next[idx] = { ...next[idx], ...updated };
            return next;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [showId]);

  const seatMap = buildSeatMap(showSeats, user?.id);

  // Toggle seat selection
  const toggleSeat = useCallback((cell: SeatCell) => {
    if (cell.status === 'booked') return;
    if (cell.status === 'locked' && !cell.lockedByCurrentUser) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cell.showSeatId)) next.delete(cell.showSeatId);
      else next.add(cell.showSeatId);
      return next;
    });
  }, []);

  const selectedCells = seatMap.rows
    .flatMap((r) => r.cells)
    .filter((c) => selectedIds.has(c.showSeatId));

  const summary = buildBookingSummary(selectedCells);

  // ── Hold Seats ───────────────────────────────────────────
  const handleHoldSeats = async () => {
    if (!user) { router.push('/login'); return; }
    if (selectedIds.size === 0) { toast.error('Please select at least one seat.'); return; }

    setHolding(true);
    try {
      const result = await showRepo.holdSeats(
        showId,
        Array.from(selectedIds),
        user.id,
        600 // 10 minutes
      );
      setHoldExpiresAt(result.expires_at);
      toast.success(`${selectedIds.size} seat(s) held for 10 minutes!`);
    } catch (err: any) {
      const msg = err.message ?? '';
      if (msg.includes('SEATS_UNAVAILABLE')) {
        toast.error('Some seats were just taken. Please re-select.');
        setSelectedIds(new Set());
      } else {
        toast.error('Failed to hold seats. Please try again.');
      }
    } finally {
      setHolding(false);
    }
  };

  // ── Proceed to Checkout ──────────────────────────────────
  const handleProceedToCheckout = async () => {
    if (!user) { router.push('/login'); return; }
    if (!holdExpiresAt) { await handleHoldSeats(); return; }

    setChecking(true);
    try {
      const result = await bookingRepo.createBooking(
        user.id,
        showId,
        Array.from(selectedIds),
        summary.totalAmount,
      );
      router.push(`/checkout/${result.booking_id}`);
    } catch (err: any) {
      const msg = err.message ?? '';
      if (msg.includes('SEATS_EXPIRED')) {
        toast.error('Your seat hold expired. Please select seats again.');
        setSelectedIds(new Set());
        setHoldExpiresAt(null);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setChecking(false);
    }
  };

  const handleHoldExpired = () => {
    toast.error('Your seat hold expired!', { duration: 5000 });
    setHoldExpiresAt(null);
    setSelectedIds(new Set());
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
        padding: '16px 24px',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href={`/movies/${show?.movie_id}`} style={{ color: '#8b8b9a', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <ArrowLeft size={18} /> Back
          </Link>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#f0f0f0' }}>
              {show?.movie?.title}
            </div>
            <div style={{ color: '#8b8b9a', fontSize: 13 }}>
              {show?.screen?.theater?.name} · {show?.screen?.name}
              {show?.start_time && ` · ${new Date(show.start_time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`}
            </div>
          </div>

          {holdExpiresAt && (
            <div style={{ marginLeft: 'auto' }}>
              <CountdownTimer expiresAt={holdExpiresAt} onExpired={handleHoldExpired} />
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>
        {/* Seat Map */}
        <div>
          {/* Screen indicator */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              display: 'inline-block',
              width: '70%', height: 6, borderRadius: '0 0 40px 40px',
              background: 'linear-gradient(90deg, transparent, #e50914, transparent)',
              marginBottom: 8,
            }} />
            <div style={{ color: '#8b8b9a', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase' }}>Screen</div>
          </div>

          {/* Stats bar */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 24 }}>
            <StatBadge label="Available" count={seatMap.availableSeats} color="#10b981" />
            <StatBadge label="Selected"  count={selectedIds.size}       color="#e50914" />
            <StatBadge label="Locked"    count={seatMap.lockedSeats}    color="#f59e0b" />
            <StatBadge label="Booked"    count={seatMap.bookedSeats}    color="#6b7280" />
          </div>

          {/* Seat grid */}
          <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
            {seatMap.rows.map((row) => (
              <div key={row.rowLabel} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, justifyContent: 'center' }}>
                <span style={{ color: '#8b8b9a', fontSize: 12, width: 20, textAlign: 'center', flexShrink: 0 }}>
                  {row.rowLabel}
                </span>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
                  {row.cells.map((cell) => {
                    const isSelected = selectedIds.has(cell.showSeatId);
                    const colorClass = getSeatColorClass(cell, isSelected);
                    const canClick   = cell.status === 'available' || (cell.status === 'locked' && cell.lockedByCurrentUser) || isSelected;

                    return (
                      <button
                        key={cell.showSeatId}
                        title={`${formatSeatLabel(cell.rowLabel, cell.seatNumber)} — ${cell.seatType} — ${formatINR(cell.price)}`}
                        onClick={() => canClick && toggleSeat(cell)}
                        className={colorClass}
                        style={{
                          width: 28, height: 28, borderRadius: 4, fontSize: 9,
                          fontWeight: 600, border: 'none', padding: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {cell.seatNumber}
                      </button>
                    );
                  })}
                </div>
                <span style={{ color: '#8b8b9a', fontSize: 12, width: 20, textAlign: 'center', flexShrink: 0 }}>
                  {row.rowLabel}
                </span>
              </div>
            ))}
          </div>

          <SeatLegend />
        </div>

        {/* Right Panel */}
        <div style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
          <BookingSummary
            summary={summary}
            holdExpiresAt={holdExpiresAt}
            onHoldSeats={handleHoldSeats}
            onProceedToCheckout={handleProceedToCheckout}
            holding={holding}
            checking={checking}
          />
        </div>
      </div>
    </div>
  );
}

function StatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{count}</div>
      <div style={{ fontSize: 11, color: '#8b8b9a' }}>{label}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ maxWidth: 1280, margin: '40px auto', padding: '0 24px' }}>
      <div className="skeleton" style={{ height: 500, borderRadius: 12 }} />
    </div>
  );
}
