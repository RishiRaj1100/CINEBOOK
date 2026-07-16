'use client';
import { useQuery } from '@tanstack/react-query';
import { getMovieRepository } from '@/lib/providers/repository-factory';
import { useState, useRef } from 'react';
import MovieCard from '@/components/movies/MovieCard';
import { Search, ChevronDown, Film, Star, Clock, TrendingUp, ChevronLeft, ChevronRight, Globe, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const GENRES = ['All', 'Action', 'Drama', 'Sci-Fi', 'Horror', 'Comedy', 'Thriller', 'Animation', 'Romance', 'Fantasy'];
const LANGUAGES = ['All', 'Hindi', 'Telugu', 'Tamil', 'English', 'Kannada', 'Malayalam', 'Korean', 'Japanese'];

interface TMDBMovieCard {
  tmdb_id: number;
  title: string;
  poster_url: string;
  backdrop_url: string;
  rating: number | null;
  vote_count: number;
  release_date: string | null;
  language: string;
  genre: string;
}

export default function HomePage() {
  const [genre,    setGenre]    = useState('All');
  const [language, setLanguage] = useState('All');
  const [search,   setSearch]   = useState('');

  const movieRepo = getMovieRepository();

  const { data: movies = [], isLoading } = useQuery({
    queryKey: ['movies'],
    queryFn:  () => movieRepo.getMovies(),
  });

  // Fetch trending from TMDB
  const { data: trendingData } = useQuery<{ movies: TMDBMovieCard[] }>({
    queryKey: ['tmdb-trending-home'],
    queryFn: async () => {
      const res = await fetch('/api/tmdb/movies?category=trending');
      if (!res.ok) return { movies: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch upcoming from TMDB
  const { data: upcomingData } = useQuery<{ movies: TMDBMovieCard[] }>({
    queryKey: ['tmdb-upcoming-home'],
    queryFn: async () => {
      const res = await fetch('/api/tmdb/movies?category=upcoming');
      if (!res.ok) return { movies: [] };
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const trendingMovies = trendingData?.movies || [];
  const upcomingMovies = upcomingData?.movies || [];

  const filtered = movies.filter((m) => {
    if (genre !== 'All' && !m.genre.toLowerCase().includes(genre.toLowerCase())) return false;
    if (language !== 'All' && m.language !== language) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Hero */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        padding: '80px 24px 60px',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a0a0e 50%, #0a0a0f 100%)',
      }}>
        {/* Glow orbs */}
        <div style={{
          position: 'absolute', top: -100, left: '20%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(229,9,20,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, right: '20%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,53,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)',
            borderRadius: 20, padding: '6px 16px', marginBottom: 24,
          }}>
            <Star size={14} fill="#f5c518" color="#f5c518" />
            <span style={{ color: '#f5c518', fontSize: 13, fontWeight: 600 }}>Now Showing</span>
          </div>

          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 'clamp(48px, 8vw, 96px)',
            lineHeight: 1, marginBottom: 20,
            background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 40%, #e50914 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Book Your<br />Perfect Show
          </h1>

          <p style={{ color: '#8b8b9a', fontSize: 18, marginBottom: 40, maxWidth: 500, margin: '0 auto 40px' }}>
            Real-time seat selection · Instant confirmation · IMDB ratings
          </p>

          {/* Search */}
          <div style={{
            maxWidth: 500, margin: '0 auto',
            position: 'relative',
          }}>
            <Search size={18} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: '#8b8b9a' }} />
            <input
              type="text"
              placeholder="Search movies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '14px 18px 14px 48px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, color: '#f0f0f0', fontSize: 16,
                outline: 'none',
              }}
            />
          </div>

          {/* Explore CTA */}
          <Link href="/explore" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            marginTop: 24, padding: '12px 24px', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#f0f0f0', textDecoration: 'none', fontSize: 14, fontWeight: 500,
            transition: 'background 0.2s, border-color 0.2s',
          }}>
            <Sparkles size={16} color="#f5c518" />
            Explore Latest Movies from TMDB
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Trending Carousel */}
      {trendingMovies.length > 0 && (
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 0' }}>
          <TrendingCarousel movies={trendingMovies} />
        </section>
      )}

      {/* Filters */}
      <section style={{
        maxWidth: 1280, margin: '0 auto', padding: '32px 24px 0',
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ color: '#8b8b9a', fontSize: 14, fontWeight: 500 }}>Filter by:</span>

        <FilterSelect label="Genre" value={genre} onChange={setGenre} options={GENRES} />
        <FilterSelect label="Language" value={language} onChange={setLanguage} options={LANGUAGES} />

        <span style={{ marginLeft: 'auto', color: '#8b8b9a', fontSize: 14 }}>
          {filtered.length} movies
        </span>
      </section>

      {/* Movie Grid */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', margin: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Film size={22} /> Available for Booking
            </span>
          </h2>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 380, borderRadius: 12 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#8b8b9a' }}>
            <Film size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
            <p style={{ fontSize: 18 }}>No movies found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 24 }}>
            {filtered.map((movie, i) => (
              <div key={movie.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Coming Soon Carousel */}
      {upcomingMovies.length > 0 && (
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>
          <ComingSoonCarousel movies={upcomingMovies} />
        </section>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string;
  onChange: (v: string) => void; options: string[];
}) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none', padding: '8px 32px 8px 14px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, color: value !== 'All' ? '#e50914' : '#f0f0f0',
          fontSize: 14, cursor: 'pointer', outline: 'none',
        }}
      >
        {options.map((o) => <option key={o} value={o} style={{ background: '#12121a' }}>{o === 'All' ? `All ${label}s` : o}</option>)}
      </select>
      <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#8b8b9a', pointerEvents: 'none' }} />
    </div>
  );
}

// ── Trending Carousel ──────────────────────────────────────────

function TrendingCarousel({ movies }: { movies: TMDBMovieCard[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === 'left' ? -600 : 600, behavior: 'smooth' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <TrendingUp size={22} color="#e50914" /> Trending Now
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/explore" style={{ color: '#e50914', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginRight: 8 }}>
            View All →
          </Link>
          <button onClick={() => scroll('left')} style={carouselBtn}><ChevronLeft size={16} /></button>
          <button onClick={() => scroll('right')} style={carouselBtn}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div ref={scrollRef} style={{
        display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8,
        scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
      }}>
        {movies.slice(0, 15).map(m => (
          <div key={m.tmdb_id} style={{ minWidth: 200, scrollSnapAlign: 'start' }}>
            <MiniTMDBCard movie={m} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ComingSoonCarousel({ movies }: { movies: TMDBMovieCard[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === 'left' ? -600 : 600, behavior: 'smooth' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          🍿 Coming Soon
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => scroll('left')} style={carouselBtn}><ChevronLeft size={16} /></button>
          <button onClick={() => scroll('right')} style={carouselBtn}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div ref={scrollRef} style={{
        display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8,
        scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
      }}>
        {movies.slice(0, 15).map(m => (
          <div key={m.tmdb_id} style={{ minWidth: 200, scrollSnapAlign: 'start' }}>
            <MiniTMDBCard movie={m} />
          </div>
        ))}
      </div>
    </div>
  );
}

const carouselBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '6px 10px', color: '#f0f0f0', cursor: 'pointer',
};

function MiniTMDBCard({ movie }: { movie: TMDBMovieCard }) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const posterUrl = movie.poster_url
    ? `/api/image-proxy?url=${encodeURIComponent(movie.poster_url)}`
    : '';

  const handleClick = async () => {
    if (syncing) return;
    setSyncing(true);
    const toastId = toast.loading(`Preparing shows for "${movie.title}"...`);
    
    try {
      const res = await fetch(`/api/tmdb/movies/${movie.tmdb_id}`);
      if (!res.ok) throw new Error('Failed to prepare showtimes');
      const data = await res.json();
      
      if (data && data.id) {
        toast.success(`Shows ready! Redirecting...`, { id: toastId });
        router.push(`/movies/${data.id}`);
      } else {
        throw new Error('Database ID not returned');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to initialize movie booking', { id: toastId });
      setSyncing(false);
    }
  };

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 14, overflow: 'hidden',
      transition: 'transform 0.3s, box-shadow 0.3s',
      cursor: syncing ? 'wait' : 'pointer',
      opacity: syncing ? 0.7 : 1,
    }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (syncing) return;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 36px rgba(229,9,20,0.2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '2/3', background: '#1a1a2e' }}>
        {posterUrl && !imgError ? (
          <img
            src={posterUrl}
            alt={movie.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, hsl(${(movie.tmdb_id * 37) % 360}, 45%, 18%), #0a0a0f)`,
            flexDirection: 'column', gap: 6,
          }}>
            <div style={{ fontSize: 40 }}>🎬</div>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', padding: '0 8px' }}>{movie.title}</span>
          </div>
        )}

        {/* Rating */}
        {movie.rating && movie.rating > 0 && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.9)', borderRadius: 6, padding: '3px 7px',
            display: 'flex', alignItems: 'center', gap: 3,
            border: '1px solid rgba(245,197,24,0.3)',
          }}>
            <Star size={10} fill="#f5c518" color="#f5c518" />
            <span style={{ color: '#f5c518', fontSize: 11, fontWeight: 800 }}>{movie.rating.toFixed(1)}</span>
          </div>
        )}

        {/* Genre overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.95))',
          padding: '16px 8px 8px',
        }}>
          <span style={{
            background: 'rgba(229,9,20,0.85)', color: 'white',
            padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 600,
          }}>
            {movie.genre.split('/')[0].trim()}
          </span>
        </div>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{ color: '#f0f0f0', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {movie.title}
        </div>
        <div style={{ color: '#8b8b9a', fontSize: 11, marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Globe size={9} />{movie.language}</span>
          {movie.release_date && <span>{new Date(movie.release_date).getFullYear()}</span>}
        </div>
      </div>
    </div>
  );
}
