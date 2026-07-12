'use client';
import Link from 'next/link';
import type { Movie } from '@/lib/domain/types';
import { Star, Clock, Globe, Play } from 'lucide-react';
import { getProxiedImageUrl } from '@/lib/domain/media-proxy';
import { useState } from 'react';

interface Props { movie: Movie; }

export default function MovieCard({ movie }: Props) {
  const placeholderBg = `hsl(${movie.id.charCodeAt(0) * 7 % 360}, 50%, 20%)`;
  const [imgError, setImgError] = useState(false);

  return (
    <Link href={`/movies/${movie.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 16, overflow: 'hidden',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s',
        cursor: 'pointer',
      }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px) scale(1.02)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 48px rgba(229,9,20,0.25)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.transform = 'none';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
      >
        {/* Poster */}
        <div style={{ position: 'relative', aspectRatio: '2/3', background: placeholderBg }}>
          {movie.poster_url && !imgError ? (
            <img
              src={getProxiedImageUrl(movie.poster_url)}
              alt={movie.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${placeholderBg}, #0a0a0f)`,
              flexDirection: 'column', gap: 8,
            }}>
              <div style={{ fontSize: 48 }}>🎬</div>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', padding: '0 12px', fontWeight: 500 }}>
                {movie.title}
              </span>
            </div>
          )}

          {/* IMDB-style Rating badge */}
          {movie.rating && (
            <div style={{
              position: 'absolute', top: 10, right: 10,
              background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)',
              borderRadius: 8, padding: '5px 10px',
              display: 'flex', alignItems: 'center', gap: 5,
              border: '1px solid rgba(245,197,24,0.3)',
            }}>
              <Star size={13} fill="#f5c518" color="#f5c518" />
              <span style={{ color: '#f5c518', fontSize: 13, fontWeight: 800, letterSpacing: 0.3 }}>
                {movie.rating.toFixed(1)}
              </span>
              <span style={{ color: 'rgba(245,197,24,0.6)', fontSize: 10, fontWeight: 500 }}>
                /10
              </span>
            </div>
          )}

          {/* Trailer indicator */}
          {movie.trailer_url && (
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: 'rgba(229,9,20,0.9)', backdropFilter: 'blur(8px)',
              borderRadius: 6, padding: '4px 8px',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Play size={10} fill="white" color="white" />
              <span style={{ color: 'white', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Trailer
              </span>
            </div>
          )}

          {/* Genre tag + gradient overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.95))',
            padding: '24px 12px 12px',
          }}>
            <span style={{
              background: 'rgba(229,9,20,0.85)', color: 'white',
              padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
              backdropFilter: 'blur(4px)',
            }}>
              {movie.genre.split('/')[0].trim()}
            </span>
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '14px 16px 18px' }}>
          <h3 style={{
            color: '#f0f0f0', fontSize: 15, fontWeight: 700,
            marginBottom: 10, lineHeight: 1.3, margin: '0 0 10px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {movie.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#8b8b9a', fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} />
              {movie.duration_minutes}m
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Globe size={11} />
              {movie.language}
            </span>
          </div>

          <div style={{
            marginTop: 14,
            background: 'linear-gradient(135deg, #e50914, #c40812)',
            color: 'white', textAlign: 'center',
            padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            transition: 'opacity 0.2s',
            letterSpacing: 0.3,
          }}>
            Book Tickets →
          </div>
        </div>
      </div>
    </Link>
  );
}
