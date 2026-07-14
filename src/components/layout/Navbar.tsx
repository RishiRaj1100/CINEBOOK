'use client';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Film, User, LogOut, LayoutDashboard, Ticket, Menu, X, Sparkles, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLocation } from '@/components/providers/LocationProvider';

export default function Navbar() {
  const { user, profile, signOut, loading } = useAuth();
  const { city, setCity, availableCities } = useLocation();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    router.push('/');
    setMenuOpen(false);
  };

  return (
    <header style={{
      background: 'linear-gradient(180deg, rgba(10,10,15,0.98) 0%, rgba(10,10,15,0.85) 100%)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: 'linear-gradient(135deg, #e50914, #ff6b35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Film size={20} color="white" />
              </div>
              <span style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: 24, letterSpacing: 1,
                background: 'linear-gradient(135deg, #e50914, #ff6b35)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>CineBook</span>
            </Link>

            {/* City Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <MapPin size={14} color="#e50914" />
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f0f0f0',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  paddingRight: '6px',
                }}
              >
                {availableCities.map(c => (
                  <option key={c} value={c} style={{ background: '#0a0a0f', color: '#f0f0f0' }}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link href="/explore" style={navLinkStyle}>
              <Sparkles size={16} />
              Explore
            </Link>
            {!loading && (
              <>
                {user ? (
                  <>
                    <Link href="/bookings" style={navLinkStyle}>
                      <Ticket size={16} />
                      My Bookings
                    </Link>
                    {profile?.role === 'admin' && (
                      <Link href="/admin" style={navLinkStyle}>
                        <LayoutDashboard size={16} />
                        Admin
                      </Link>
                    )}
                    <button onClick={handleSignOut} style={btnOutlineStyle}>
                      <LogOut size={16} />
                      Sign Out
                    </button>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'linear-gradient(135deg, #e50914, #ff6b35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 600,
                    }}>
                      {profile?.full_name?.charAt(0)?.toUpperCase() ?? <User size={16} />}
                    </div>
                  </>
                ) : (
                  <>
                    <Link href="/login" style={navLinkStyle}>Sign In</Link>
                    <Link href="/register" style={btnPrimaryStyle}>Get Started</Link>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

const navLinkStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  color: '#b0b0c0', textDecoration: 'none', padding: '8px 12px',
  borderRadius: 8, fontSize: 14, fontWeight: 500,
  transition: 'color 0.2s',
};

const btnOutlineStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  background: 'transparent', border: '1px solid rgba(229,9,20,0.4)',
  color: '#e50914', padding: '8px 14px', borderRadius: 8,
  fontSize: 14, fontWeight: 500, cursor: 'pointer',
};

const btnPrimaryStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #e50914, #c40812)',
  color: 'white', padding: '9px 18px', borderRadius: 8,
  textDecoration: 'none', fontSize: 14, fontWeight: 600,
  boxShadow: '0 4px 14px rgba(229,9,20,0.3)',
};
