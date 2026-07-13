'use client';
import { useQuery } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { Star, Clock, Globe, ChevronLeft, ChevronRight, TrendingUp, Flame, Clapperboard, Calendar, Search, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────

interface TMDBMovieCard {
  tmdb_id: number;
  title: string;
  description: string | null;
  poster_url: string;
  backdrop_url: string;
  rating: number | null;
  vote_count: number;
  release_date: string | null;
  language: string;
  genre: string;
  popularity: number;
}

// ── Constants ──────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'now_playing', label: 'Now Playing', icon: <Clapperboard size={18} /> },
  { key: 'trending', label: 'Trending', icon: <TrendingUp size={18} /> },
  { key: 'popular', label: 'Popular', icon: <Flame size={18} /> },
  { key: 'upcoming', label: 'Upcoming', icon: <Calendar size={18} /> },
  { key: 'top_rated', label: 'Top Rated', icon: <Star size={18} /> },
];

const GENRES = [
  { id: 28, name: 'Action', emoji: '💥' },
  { id: 18, name: 'Drama', emoji: '🎭' },
  { id: 35, name: 'Comedy', emoji: '😂' },
  { id: 27, name: 'Horror', emoji: '👻' },
  { id: 878, name: 'Sci-Fi', emoji: '🚀' },
  { id: 10749, name: 'Romance', emoji: '💕' },
  { id: 53, name: 'Thriller', emoji: '🔪' },
  { id: 16, name: 'Animation', emoji: '🎨' },
  { id: 14, name: 'Fantasy', emoji: '🧙' },
  { id: 80, name: 'Crime', emoji: '🔍' },
  { id: 10751, name: 'Family', emoji: '👨‍👩‍👧‍👦' },
  { id: 36, name: 'History', emoji: '📜' },
];

const LANGUAGES = [
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'te', name: 'Telugu', flag: '🎬' },
  { code: 'ta', name: 'Tamil', flag: '🎬' },
  { code: 'kn', name: 'Kannada', flag: '🎬' },
  { code: 'ml', name: 'Malayalam', flag: '🎬' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
];

// ── Hook for TMDB data ─────────────────────────────────────────

function useTMDBMovies(params: Record<string, string>) {
  const key = JSON.stringify(params);
  return useQuery<{ movies: TMDBMovieCard[]; total_pages: number }>({
    queryKey: ['tmdb', key],
    queryFn: async () => {
      const searchParams = new URLSearchParams(params);
      const res = await fetch(`/api/tmdb/movies?${searchParams}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Explore Page ───────────────────────────────────────────────

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState('now_playing');
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null);
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');

  // Build fetch params
  const fetchParams: Record<string, string> = {};
  if (submittedQuery) {
    fetchParams.query = submittedQuery;
  } else if (selectedGenre) {
    fetchParams.genre = String(selectedGenre);
    if (selectedLang) fetchParams.language = selectedLang;
  } else if (selectedLang) {
    fetchParams.language = selectedLang;
  } else {
    fetchParams.category = activeTab;
  }

  const { data, isLoading } = useTMDBMovies(fetchParams);
  const movies = data?.movies || [];

  // Category carousels (always shown)
  const { data: trendingData } = useTMDBMovies({ category: 'trending' });
  const { data: nowPlayingData } = useTMDBMovies({ category: 'now_playing' });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchQuery);
    setSelectedGenre(null);
    setSelectedLang(null);
  };

  const clearFilters = () => {
    setSelectedGenre(null);
    setSelectedLang(null);
    setSearchQuery('');
    setSubmittedQuery('');
    setActiveTab('now_playing');
  };

  const hasFilters = !!submittedQuery || !!selectedGenre || !!selectedLang;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Hero */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        padding: '60px 24px 40px',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0a1a 40%, #1a0510 70%, #0a0a0f 100%)',
      }}>
        {/* Animated gradient orbs */}
        <div style={{
          position: 'absolute', top: -120, right: '10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(229,9,20,0.12) 0%, transparent 70%)',
          pointerEvents: 'none', animation: 'pulse-glow 4s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: '15%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Sparkles size={20} color="#f5c518" />
            <span style={{ color: '#f5c518', fontSize: 14, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Explore Movies</span>
          </div>
          <h1 style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: 'clamp(40px, 6vw, 72px)',
            lineHeight: 1.05, marginBottom: 16,
            background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 50%, #f5c518 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Discover Latest Movies<br />& Shows
          </h1>
          <p style={{ color: '#8b8b9a', fontSize: 16, marginBottom: 32, maxWidth: 550 }}>
            Browse trending movies across genres and languages. Powered by TMDB with real IMDB ratings.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} style={{ maxWidth: 560, position: 'relative', display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#8b8b9a' }} />
              <input
                type="text"
                placeholder="Search any movie or show..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '14px 18px 14px 46px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12, color: '#f0f0f0', fontSize: 15,
                  outline: 'none', transition: 'border-color 0.2s',
                }}
              />
            </div>
            <button type="submit" style={{
              background: 'linear-gradient(135deg, #e50914, #c40812)',
              border: 'none', borderRadius: 12, padding: '0 24px',
              color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer',
              transition: 'transform 0.2s',
            }}>Search</button>
          </form>
        </div>
      </section>

      {/* Category Tabs */}
      <section style={{
        maxWidth: 1280, margin: '0 auto', padding: '24px 24px 0',
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => { setActiveTab(cat.key); clearFilters(); setActiveTab(cat.key); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10,
              background: !hasFilters && activeTab === cat.key
                ? 'linear-gradient(135deg, #e50914, #c40812)'
                : 'rgba(255,255,255,0.04)',
              border: !hasFilters && activeTab === cat.key
                ? 'none'
                : '1px solid rgba(255,255,255,0.08)',
              color: !hasFilters && activeTab === cat.key ? 'white' : '#b0b0c0',
              cursor: 'pointer', fontSize: 14, fontWeight: 500,
              transition: 'all 0.2s',
            }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
        {hasFilters && (
          <button onClick={clearFilters} style={{
            padding: '10px 18px', borderRadius: 10,
            background: 'rgba(229,9,20,0.1)', border: '1px solid rgba(229,9,20,0.3)',
            color: '#e50914', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            marginLeft: 'auto',
          }}>
            ✕ Clear Filters
          </button>
        )}
      </section>

      {/* Genre Pills */}
      <section style={{
        maxWidth: 1280, margin: '0 auto', padding: '16px 24px 0',
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {GENRES.map(g => (
            <button
              key={g.id}
              onClick={() => { setSelectedGenre(selectedGenre === g.id ? null : g.id); setSubmittedQuery(''); }}
              style={{
                padding: '7px 14px', borderRadius: 20,
                background: selectedGenre === g.id
                  ? 'rgba(229,9,20,0.2)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedGenre === g.id ? 'rgba(229,9,20,0.5)' : 'rgba(255,255,255,0.06)'}`,
                color: selectedGenre === g.id ? '#ff6b35' : '#8b8b9a',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              {g.emoji} {g.name}
            </button>
          ))}
        </div>
      </section>

      {/* Language Pills */}
      <section style={{
        maxWidth: 1280, margin: '0 auto', padding: '12px 24px 0',
      }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setSelectedLang(selectedLang === l.code ? null : l.code); setSubmittedQuery(''); }}
              style={{
                padding: '7px 14px', borderRadius: 20,
                background: selectedLang === l.code
                  ? 'rgba(99,102,241,0.2)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedLang === l.code ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.06)'}`,
                color: selectedLang === l.code ? '#818cf8' : '#8b8b9a',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              {l.flag} {l.name}
            </button>
          ))}
        </div>
      </section>

      {/* Results Section */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#f0f0f0', margin: 0 }}>
            {submittedQuery
              ? `Search Results for "${submittedQuery}"`
              : selectedGenre
                ? `${GENRES.find(g => g.id === selectedGenre)?.name || ''} Movies`
                : selectedLang
                  ? `${LANGUAGES.find(l => l.code === selectedLang)?.name || ''} Movies`
                  : CATEGORIES.find(c => c.key === activeTab)?.label || 'Movies'}
          </h2>
          <span style={{ color: '#8b8b9a', fontSize: 14 }}>{movies.length} results</span>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '2/3', borderRadius: 14 }} />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#8b8b9a' }}>
            <Clapperboard size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
            <p style={{ fontSize: 18 }}>No movies found</p>
            <p style={{ fontSize: 14, marginTop: 8 }}>Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            {movies.map((m, i) => (
              <div key={m.tmdb_id} className="animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                <TMDBCard movie={m} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Trending Carousel (shown when no filters) */}
      {!hasFilters && activeTab !== 'trending' && trendingData?.movies && trendingData.movies.length > 0 && (
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '16px 24px 40px' }}>
          <MovieCarousel title="🔥 Trending This Week" movies={trendingData.movies} />
        </section>
      )}

      {/* Now Playing Carousel (shown when not on now_playing tab) */}
      {!hasFilters && activeTab !== 'now_playing' && nowPlayingData?.movies && nowPlayingData.movies.length > 0 && (
        <section style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px' }}>
          <MovieCarousel title="🎬 Now In Theaters" movies={nowPlayingData.movies} />
        </section>
      )}

      {/* Bottom padding */}
      <div style={{ height: 60 }} />
    </div>
  );
}

// ── TMDB Movie Card ────────────────────────────────────────────

function TMDBCard({ movie }: { movie: TMDBMovieCard }) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const placeholderBg = `hsl(${(movie.tmdb_id * 37) % 360}, 45%, 18%)`;

  // Proxy TMDB poster URLs through our server API
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
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 14, overflow: 'hidden',
      transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s',
      cursor: syncing ? 'wait' : 'pointer',
      opacity: syncing ? 0.7 : 1,
    }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (syncing) return;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px) scale(1.02)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 48px rgba(229,9,20,0.2)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Poster */}
      <div style={{ position: 'relative', aspectRatio: '2/3', background: placeholderBg }}>
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
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${placeholderBg}, #0a0a0f)`,
            flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: 44 }}>🎬</div>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', padding: '0 8px' }}>
              {movie.title}
            </span>
          </div>
        )}

        {/* IMDB-style Rating */}
        {movie.rating && movie.rating > 0 && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)',
            borderRadius: 7, padding: '4px 9px',
            display: 'flex', alignItems: 'center', gap: 4,
            border: '1px solid rgba(245,197,24,0.3)',
          }}>
            <Star size={12} fill="#f5c518" color="#f5c518" />
            <span style={{ color: '#f5c518', fontSize: 12, fontWeight: 800 }}>
              {movie.rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Genre overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.95))',
          padding: '20px 10px 10px',
        }}>
          <span style={{
            background: 'rgba(229,9,20,0.85)', color: 'white',
            padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
          }}>
            {movie.genre.split('/')[0].trim()}
          </span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px 14px' }}>
        <h3 style={{
          color: '#f0f0f0', fontSize: 14, fontWeight: 700,
          marginBottom: 6, lineHeight: 1.3, margin: '0 0 6px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {movie.title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#8b8b9a', fontSize: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Globe size={10} />
            {movie.language}
          </span>
          {movie.release_date && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Calendar size={10} />
              {new Date(movie.release_date).getFullYear()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Horizontal Carousel ────────────────────────────────────────

function MovieCarousel({ title, movies }: { title: string; movies: TMDBMovieCard[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = dir === 'left' ? -600 : 600;
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f0', margin: 0 }}>{title}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => scroll('left')} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '6px 10px', color: '#f0f0f0', cursor: 'pointer',
          }}><ChevronLeft size={16} /></button>
          <button onClick={() => scroll('right')} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '6px 10px', color: '#f0f0f0', cursor: 'pointer',
          }}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div ref={scrollRef} style={{
        display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8,
        scrollSnapType: 'x mandatory',
        scrollbarWidth: 'none',
      }}>
        {movies.map(m => (
          <div key={m.tmdb_id} style={{ minWidth: 180, scrollSnapAlign: 'start' }}>
            <TMDBCard movie={m} />
          </div>
        ))}
      </div>
    </div>
  );
}
