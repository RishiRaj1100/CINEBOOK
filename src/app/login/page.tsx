'use client';
import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/data/supabase-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { AuthLayout, InputField, primaryBtnStyle, Divider, GoogleBtn } from '../register/page';

export default function LoginPage() {
  const router   = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success('Welcome back!');
    router.push('/');
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
    });
  };

  return <AuthLayout title="Welcome Back" subtitle="Sign in to your CineBook account">
    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <InputField id="login-email" icon={<Mail size={16} />} type="email" placeholder="Email Address" value={email} onChange={setEmail} />
      <div style={{ position: 'relative' }}>
        <InputField id="login-password" icon={<Lock size={16} />} type={showPw ? 'text' : 'password'} placeholder="Password" value={password} onChange={setPassword} />
        <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8b8b9a', cursor: 'pointer' }}>
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <button id="btn-login" type="submit" disabled={loading} style={primaryBtnStyle(loading)}>
        {loading && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>

    <Divider />
    <GoogleBtn onClick={handleGoogle} />

    <p style={{ textAlign: 'center', color: '#8b8b9a', fontSize: 14, marginTop: 20 }}>
      Don&apos;t have an account?{' '}
      <Link href="/register" style={{ color: '#e50914', fontWeight: 600, textDecoration: 'none' }}>Sign Up</Link>
    </p>
  </AuthLayout>;
}
