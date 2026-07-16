'use client';
import { useQuery } from '@tanstack/react-query';
import { getBookingRepository } from '@/lib/providers/repository-factory';
import { useAuth } from '@/components/providers/AuthProvider';
import { formatINR } from '@/lib/domain/pricing';
import { formatSeatLabel } from '@/lib/domain/seat-map';
import { format } from 'date-fns';
import { use } from 'react';
import { ArrowLeft, Download, MapPin, Calendar, Clock, Film, Ticket } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { getProxiedImageUrl } from '@/lib/domain/media-proxy';

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const bookingRepo = getBookingRepository();

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn:  () => bookingRepo.getBookingById(id),
    enabled:  !!user,
  });

  if (isLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div className="skeleton" style={{ width: 480, height: 600, borderRadius: 16 }} />
  </div>;

  if (!booking) return <div style={{ textAlign: 'center', padding: 80, color: '#8b8b9a' }}>Booking not found.</div>;

  const show  = booking.show;
  const seats = booking.booking_seats ?? [];
  const isConfirmed = booking.status === 'confirmed';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '40px 24px 80px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* Back */}
        <Link href="/bookings" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#8b8b9a', textDecoration: 'none', marginBottom: 24 }}>
          <ArrowLeft size={16} /> My Bookings
        </Link>

        {/* E-Ticket Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: `2px solid ${isConfirmed ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 20, overflow: 'hidden',
        }}>
          {/* Status header */}
          <div style={{
            padding: '16px 24px',
            background: isConfirmed
              ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))'
              : 'rgba(229,9,20,0.1)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Ticket size={20} color={isConfirmed ? '#10b981' : '#e50914'} />
            <span style={{ fontWeight: 700, color: isConfirmed ? '#10b981' : '#e50914', fontSize: 16 }}>
              {isConfirmed ? 'Confirmed Ticket' : `Booking ${booking.status.toUpperCase()}`}
            </span>
            <span style={{ marginLeft: 'auto', color: '#8b8b9a', fontSize: 13 }}>
              #{booking.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          {/* Movie Info */}
          <div style={{ padding: '24px', display: 'flex', gap: 20 }}>
            <div style={{ width: 80, height: 120, borderRadius: 10, overflow: 'hidden', background: '#1a1a2e', flexShrink: 0 }}>
              {show?.movie?.poster_url
                ? <img src={getProxiedImageUrl(show.movie.poster_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🎬</div>
              }
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f0f0f0', margin: '0 0 8px' }}>
                {show?.movie?.title}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <InfoLine icon={<MapPin size={14} />}   text={`${show?.screen?.theater?.name} · ${show?.screen?.name}`} />
                <InfoLine icon={<Calendar size={14} />} text={show?.start_time ? format(new Date(show.start_time), 'EEE, dd MMMM yyyy') : '-'} />
                <InfoLine icon={<Clock size={14} />}    text={show?.start_time ? format(new Date(show.start_time), 'hh:mm a') : '-'} />
                <InfoLine icon={<Film size={14} />}     text={`${show?.movie?.language} · ${show?.movie?.genre}`} />
              </div>
            </div>
          </div>

          {/* Tear line */}
          <div style={{ position: 'relative', height: 1, margin: '0 24px', background: 'rgba(255,255,255,0.06)' }}>
            <div style={{ position: 'absolute', left: -24, top: -12, width: 24, height: 24, borderRadius: '50%', background: 'var(--color-bg)', border: '1px solid rgba(255,255,255,0.06)' }} />
            <div style={{ position: 'absolute', right: -24, top: -12, width: 24, height: 24, borderRadius: '50%', background: 'var(--color-bg)', border: '1px solid rgba(255,255,255,0.06)' }} />
          </div>

          {/* Seats */}
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 12, color: '#8b8b9a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Seats</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {seats.map((bs) => bs.show_seat?.seat && (
                <div key={bs.id} style={{
                  background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)',
                  borderRadius: 8, padding: '6px 14px', textAlign: 'center',
                }}>
                  <div style={{ color: '#e50914', fontWeight: 700, fontSize: 16 }}>
                    {formatSeatLabel(bs.show_seat.seat.row_label, bs.show_seat.seat.seat_number)}
                  </div>
                  <div style={{ color: '#8b8b9a', fontSize: 11, textTransform: 'capitalize' }}>
                    {bs.show_seat.seat.seat_type}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8b8b9a' }}>Total Paid</span>
              <span style={{ fontWeight: 800, fontSize: 20, color: '#f0f0f0' }}>{formatINR(booking.total_amount)}</span>
            </div>
          </div>

          {/* QR Code */}
          {isConfirmed && (
            <>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 24px' }} />
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#8b8b9a', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Show this QR at the entrance
                </div>
                <div style={{
                  display: 'inline-block', padding: 16,
                  background: 'white', borderRadius: 12,
                }}>
                  <QRCodeSVG
                    value={JSON.stringify({ bookingId: booking.id, userId: booking.user_id })}
                    size={160}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div style={{ color: '#8b8b9a', fontSize: 12, marginTop: 10 }}>
                  Booking ID: {booking.id.toUpperCase()}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Booked on */}
        <p style={{ textAlign: 'center', color: '#8b8b9a', fontSize: 12, marginTop: 16 }}>
          Booked on {format(new Date(booking.created_at), 'dd MMM yyyy, hh:mm a')}
        </p>
      </div>
    </div>
  );
}

function InfoLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8b8b9a', fontSize: 13 }}>
      {icon} <span>{text}</span>
    </div>
  );
}
