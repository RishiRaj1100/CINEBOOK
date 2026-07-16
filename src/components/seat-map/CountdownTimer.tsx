'use client';
import { useEffect, useState } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface Props {
  expiresAt: string;
  onExpired: () => void;
}

export default function CountdownTimer({ expiresAt, onExpired }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const target = new Date(expiresAt).getTime();

    const tick = () => {
      const remaining = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) onExpired();
    };

    tick(); // immediate call
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = secondsLeft <= 60;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 16px', borderRadius: 8,
      background: isUrgent ? 'rgba(229,9,20,0.15)' : 'rgba(245,197,24,0.1)',
      border: `1px solid ${isUrgent ? 'rgba(229,9,20,0.4)' : 'rgba(245,197,24,0.3)'}`,
      animation: isUrgent ? 'pulse-glow 1s infinite' : 'none',
    }}>
      {isUrgent
        ? <AlertTriangle size={16} color="#e50914" />
        : <Timer size={16} color="#f5c518" />
      }
      <span style={{
        fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
        color: isUrgent ? '#e50914' : '#f5c518',
      }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
      <span style={{ color: '#8b8b9a', fontSize: 12 }}>
        {isUrgent ? 'Hurry!' : 'remaining'}
      </span>
    </div>
  );
}
