'use client';
import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/data/supabase-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Film, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router  = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { toast.error('Please fill in all fields.'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } },
    });

    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success('Account created! Please verify your email.');
    router.push('/login');
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
    });
  };

  return <AuthLayout title="Create Account" subtitle="Join CineBook and start booking tickets">
    <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <InputField id="reg-name" icon={<User size={16} />} type="text" placeholder="Full Name" value={name} onChange={setName} />
      <InputField id="reg-email" icon={<Mail size={16} />} type="email" placeholder="Email Address" value={email} onChange={setEmail} />
      <div style={{ position: 'relative' }}>
        <InputField id="reg-password" icon={<Lock size={16} />} type={showPw ? 'text' : 'password'} placeholder="Password (min 8 chars)" value={password} onChange={setPassword} />
        <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8b8b9a', cursor: 'pointer' }}>
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <button id="btn-register" type="submit" disabled={loading} style={primaryBtnStyle(loading)}>
        {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : null}
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>

    <Divider />
    <GoogleBtn onClick={handleGoogle} />

    <p style={{ textAlign: 'center', color: '#8b8b9a', fontSize: 14, marginTop: 20 }}>
      Already have an account?{' '}
      <Link href="/login" style={{ color: '#e50914', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
    </p>
  </AuthLayout>;
}

// ── Shared auth components ──────────────────────────────────
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: 420, width: '100%' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #e50914, #c40812)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Film size={28} color="white" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#f0f0f0', margin: '0 0 6px' }}>{title}</h1>
          <p style={{ color: '#8b8b9a', fontSize: 14 }}>{subtitle}</p>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 32 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function InputField({ id, icon, type, placeholder, value, onChange }: {
  id: string; icon: React.ReactNode; type: string; placeholder: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#8b8b9a' }}>{icon}</div>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '13px 14px 13px 42px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, color: '#f0f0f0', fontSize: 15, outline: 'none',
        }}
      />
    </div>
  );
}

export function primaryBtnStyle(loading: boolean): React.CSSProperties {
  return {
    width: '100%', padding: 14,
    background: loading ? '#2a2a3a' : 'linear-gradient(135deg, #e50914, #c40812)',
    border: 'none', borderRadius: 10, color: 'white',
    fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    boxShadow: loading ? 'none' : '0 4px 16px rgba(229,9,20,0.3)',
  };
}

export function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
      <span style={{ color: '#8b8b9a', fontSize: 13 }}>or</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
    </div>
  );
}

export function GoogleBtn({ onClick }: { onClick: () => void }) {
  return (
    <button id="btn-google" onClick={onClick} style={{
      width: '100%', padding: 13,
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10, color: '#f0f0f0', fontSize: 15, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    }}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
      </svg>
      Continue with Google
    </button>
  );
}
