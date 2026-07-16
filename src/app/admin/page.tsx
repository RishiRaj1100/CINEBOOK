'use client';
import { useQuery } from '@tanstack/react-query';
import { getMovieRepository, getShowRepository } from '@/lib/providers/repository-factory';
import { getSupabaseBrowserClient } from '@/lib/data/supabase-client';
import { formatINR } from '@/lib/domain/pricing';
import { format } from 'date-fns';
import Link from 'next/link';
import { Film, Theater, BarChart3, TrendingUp, Users, Calendar, Plus, ChevronRight, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const movieRepo = getMovieRepository();
  const showRepo  = getShowRepository();
  const supabase  = getSupabaseBrowserClient();

  const { data: movies = [] }  = useQuery({ queryKey: ['admin-movies'],  queryFn: () => movieRepo.getMovies() });
  const { data: shows  = [] }  = useQuery({ queryKey: ['admin-occupancy'], queryFn: () => showRepo.getShowsWithOccupancy() });
  const { data: counts }       = useQuery({
    queryKey: ['admin-counts'],
    queryFn: async () => {
      const [theaters, bookings] = await Promise.all([
        supabase.from('theaters').select('id', { count: 'exact', head: true }),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'confirmed'),
      ]);
      return { theaters: theaters.count ?? 0, bookings: bookings.count ?? 0 };
    },
  });

  const totalRevenue = shows.reduce((sum, s) => sum + (s.revenue ?? 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Admin Header */}
      <div style={{
        background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
        padding: '20px 24px',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f0f0f0', margin: 0 }}>Admin Dashboard</h1>
            <p style={{ color: '#8b8b9a', fontSize: 14, margin: 0 }}>Manage your CineBook platform</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/admin/movies/new" style={adminActionBtn}>
              <Plus size={16} /> Add Movie
            </Link>
            <Link href="/admin/shows/new" style={adminActionBtn}>
              <Calendar size={16} /> Add Show
            </Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 80px' }}>
        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 40 }}>
          <StatCard icon={<Film size={24} color="#e50914" />} label="Movies" value={movies.length} bg="rgba(229,9,20,0.1)" />
          <StatCard icon={<Theater size={24} color="#3b82f6" />} label="Theaters" value={counts?.theaters ?? '-'} bg="rgba(59,130,246,0.1)" />
          <StatCard icon={<Users size={24} color="#10b981" />} label="Confirmed Bookings" value={counts?.bookings ?? '-'} bg="rgba(16,185,129,0.1)" />
          <StatCard icon={<TrendingUp size={24} color="#f59e0b" />} label="Total Revenue" value={formatINR(totalRevenue)} bg="rgba(245,158,11,0.1)" />
        </div>

        {/* Quick Links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
          {[
            { href: '/admin/movies',   icon: <Film size={20} />,     label: 'Manage Movies',    desc: 'Add, edit, delete movies' },
            { href: '/admin/theaters', icon: <Settings size={20} />, label: 'Theaters & Screens', desc: 'Manage venues and screens' },
            { href: '/admin/shows',    icon: <Calendar size={20} />, label: 'Shows & Pricing',  desc: 'Schedule shows and set prices' },
          ].map(({ href, icon, label, desc }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 12, padding: '20px 24px', cursor: 'pointer',
                transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 16,
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(229,9,20,0.4)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(229,9,20,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e50914', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#f0f0f0', marginBottom: 2 }}>{label}</div>
                  <div style={{ color: '#8b8b9a', fontSize: 13 }}>{desc}</div>
                </div>
                <ChevronRight size={18} color="#8b8b9a" style={{ marginLeft: 'auto' }} />
              </div>
            </Link>
          ))}
        </div>

        {/* Occupancy Report */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BarChart3 size={20} color="#e50914" />
            <h2 style={{ fontWeight: 700, color: '#f0f0f0', margin: 0 }}>Shows & Occupancy</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Movie', 'Theater', 'Date & Time', 'Occupancy', 'Revenue', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#8b8b9a', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shows.slice(0, 20).map((show) => (
                  <tr key={show.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '14px 16px', color: '#f0f0f0', fontWeight: 600, fontSize: 14 }}>{show.movie?.title}</td>
                    <td style={{ padding: '14px 16px', color: '#8b8b9a', fontSize: 13 }}>
                      {show.screen?.theater?.name}<br />
                      <span style={{ fontSize: 11 }}>{show.screen?.name}</span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#8b8b9a', fontSize: 13 }}>
                      {format(new Date(show.start_time), 'dd MMM')}<br />
                      {format(new Date(show.start_time), 'hh:mm a')}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${show.occupancy_percent}%`,
                            background: show.occupancy_percent > 80 ? '#10b981' : show.occupancy_percent > 50 ? '#f59e0b' : '#e50914',
                          }} />
                        </div>
                        <span style={{ color: '#f0f0f0', fontSize: 13, fontWeight: 600, minWidth: 36 }}>
                          {show.occupancy_percent}%
                        </span>
                      </div>
                      <span style={{ color: '#8b8b9a', fontSize: 11 }}>
                        {show.booked_seats}/{show.total_seats} seats
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#10b981', fontWeight: 700 }}>
                      {formatINR(show.revenue ?? 0)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        background: show.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                        color: show.is_active ? '#10b981' : '#6b7280',
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      }}>
                        {show.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        {icon}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#f0f0f0', marginBottom: 4 }}>{value}</div>
      <div style={{ color: '#8b8b9a', fontSize: 14 }}>{label}</div>
    </div>
  );
}

const adminActionBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'linear-gradient(135deg, #e50914, #c40812)',
  color: 'white', textDecoration: 'none', padding: '10px 18px',
  borderRadius: 8, fontSize: 14, fontWeight: 600,
};
