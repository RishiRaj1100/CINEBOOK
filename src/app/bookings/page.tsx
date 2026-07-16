'use client';
import { useQuery } from '@tanstack/react-query';
import { getBookingRepository } from '@/lib/providers/repository-factory';
import { useAuth } from '@/components/providers/AuthProvider';
import { formatINR } from '@/lib/domain/pricing';
import { format } from 'date-fns';
import Link from 'next/link';
import { Ticket, CheckCircle2, XCircle, Clock, AlertCircle, ChevronRight, Film } from 'lucide-react';
import type { BookingStatus } from '@/lib/domain/types';

const STATUS_CONFIG: Record<BookingStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  confirmed: { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: <CheckCircle2 size={14} />, label: 'Confirmed' },
  created:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: <Clock size={14} />,        label: 'Pending' },
  cancelled: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: <XCircle size={14} />,      label: 'Cancelled' },
  expired:   { color: '#e50914', bg: 'rgba(229,9,20,0.1)',    icon: <AlertCircle size={14} />,  label: 'Expired' },
};

export default function BookingsPage() {
  const { user } = useAuth();
  const bookingRepo = getBookingRepository();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', user?.id],
    queryFn:  () => bookingRepo.getBookingsByUser(user!.id),
    enabled:  !!user,
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #e50914, #c40812)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ticket size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f0f0f0', margin: 0 }}>My Bookings</h1>
            <p style={{ color: '#8b8b9a', fontSize: 14, margin: 0 }}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 12 }} />)}
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#8b8b9a' }}>
            <Film size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
            <p style={{ fontSize: 18 }}>No bookings yet</p>
            <Link href="/" style={{ color: '#e50914', textDecoration: 'none', fontWeight: 600 }}>Browse movies →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bookings.map((booking) => {
              const status = STATUS_CONFIG[booking.status];
              const show   = booking.show;
              const seats  = booking.booking_seats ?? [];

              return (
                <Link key={booking.id} href={`/bookings/${booking.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 12, padding: '20px 24px', cursor: 'pointer',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    display: 'flex', gap: 20, alignItems: 'center',
                  }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(229,9,20,0.4)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(229,9,20,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                  >
                    {/* Movie Poster Mini */}
                    <div style={{
                      width: 56, height: 80, borderRadius: 8, overflow: 'hidden',
                      background: '#1a1a2e', flexShrink: 0,
                    }}>
                      {show?.movie?.poster_url
                        ? <img src={show.movie.poster_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🎬</div>
                      }
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#f0f0f0', fontSize: 16, marginBottom: 4 }}>
                        {show?.movie?.title ?? 'Movie'}
                      </div>
                      <div style={{ color: '#8b8b9a', fontSize: 13, marginBottom: 8 }}>
                        {show?.screen?.theater?.name}
                        {show?.start_time && ` · ${format(new Date(show.start_time), 'EEE, dd MMM · hh:mm a')}`}
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          background: status.bg, color: status.color,
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        }}>
                          {status.icon} {status.label}
                        </div>
                        <span style={{ color: '#8b8b9a', fontSize: 12 }}>
                          {seats.length} seat{seats.length !== 1 ? 's' : ''}
                        </span>
                        <span style={{ color: '#8b8b9a', fontSize: 12 }}>
                          #{booking.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 18, color: '#f0f0f0' }}>
                        {formatINR(booking.total_amount)}
                      </div>
                      <div style={{ color: '#8b8b9a', fontSize: 12, marginTop: 2 }}>
                        {format(new Date(booking.created_at), 'dd MMM yyyy')}
                      </div>
                    </div>

                    <ChevronRight size={18} color="#8b8b9a" style={{ flexShrink: 0 }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
