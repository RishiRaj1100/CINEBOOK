'use client';
import { useQuery } from '@tanstack/react-query';
import { getMovieRepository, getShowRepository } from '@/lib/providers/repository-factory';
import { use, useState } from 'react';
import { Star, Clock, Globe, Calendar, MapPin, ChevronLeft, ChevronRight, Play, ExternalLink, X, Navigation } from 'lucide-react';
import Link from 'next/link';
import { formatINR } from '@/lib/domain/pricing';
import { format, addDays } from 'date-fns';
import { getProxiedImageUrl, isValidYouTubeEmbed, getYouTubeThumbnail } from '@/lib/domain/media-proxy';
import { useLocation } from '@/components/providers/LocationProvider';

const slideControlBtn: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: '#f0f0f0',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background 0.2s',
};

export default function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const movieRepo = getMovieRepository();
  const showRepo  = getShowRepository();
  const { city: selectedCity, setCity } = useLocation();

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [slideIndex, setSlideIndex] = useState(0);
  const [trailerModal, setTrailerModal] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [posterError, setPosterError] = useState(false);

  const { data: movie, isLoading: movieLoading } = useQuery({
    queryKey: ['movie', id],
    queryFn:  () => movieRepo.getMovieById(id),
  });

  // Try to fetch fresh trailer from TMDB if we have a tmdb_id
  const { data: tmdbData } = useQuery({
    queryKey: ['tmdb-movie', movie?.tmdb_id],
    queryFn: async () => {
      if (!movie?.tmdb_id) return null;
      const res = await fetch(`/api/tmdb/movies/${movie.tmdb_id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!movie?.tmdb_id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: showtimes = [], isLoading: showsLoading } = useQuery({
    queryKey: ['showtimes', id, selectedDate],
    queryFn:  () => showRepo.getShowsByMovieGrouped(id, `${selectedDate}T00:00:00.000Z`),
    enabled:  !!id,
  });

  // Filter shows by selected city client-side
  const cityShowtimes = showtimes.filter(
    (st) => st.theater.city.toLowerCase() === selectedCity.toLowerCase()
  );

  // Find other cities where shows are available
  const allCitiesWithShows = Array.from(
    new Set(showtimes.map((st) => st.theater.city))
  );

  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Use TMDB trailer if DB one is missing/invalid
  const trailerUrl = isValidYouTubeEmbed(movie?.trailer_url)
    ? movie!.trailer_url!
    : tmdbData?.trailer_url || null;

  if (movieLoading) return (
    <div>
      <div className="skeleton" style={{ height: 420 }} />
      <div style={{ maxWidth: 1280, margin: '40px auto', padding: '0 24px' }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      </div>
    </div>
  );

  if (!movie) return <div style={{ color: '#8b8b9a', textAlign: 'center', padding: 80 }}>Movie not found.</div>;

  // Build slides: Trailer, Poster, Backdrop
  const slides: { type: string; url?: string; title: string }[] = [];
  if (trailerUrl) {
    slides.push({
      type: 'video',
      url: trailerUrl,
      title: 'Official Trailer'
    });
  }
  if (movie.poster_url) {
    slides.push({
      type: 'image',
      url: getProxiedImageUrl(movie.poster_url),
      title: 'Theatrical Poster'
    });
  }
  slides.push({
    type: 'backdrop',
    title: 'Cinematic Backdrop'
  });

  const nextSlide = () => setSlideIndex((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);

  const posterSrc = getProxiedImageUrl(movie.poster_url);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Trailer Modal */}
      {trailerModal && trailerUrl && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }} onClick={() => setTrailerModal(false)}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 960, aspectRatio: '16/9' }}
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setTrailerModal(false)} style={{
              position: 'absolute', top: -48, right: 0, background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 12px',
              color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 14, zIndex: 10,
            }}>
              <X size={16} /> Close
            </button>
            <iframe
              src={`${trailerUrl}?autoplay=1`}
              title={`${movie.title} - Trailer`}
              style={{ width: '100%', height: '100%', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div style={{
        position: 'relative', height: 460,
        background: posterSrc && !imgError
          ? `linear-gradient(to bottom, rgba(10,10,15,0.2) 0%, rgba(10,10,15,0.97) 100%), url(${posterSrc}) center/cover`
          : 'linear-gradient(135deg, #1a0a0e, #0a0a0f)',
        display: 'flex', alignItems: 'flex-end',
      }}>
        {/* Background blur */}
        <div style={{
          position: 'absolute', inset: 0, backdropFilter: 'blur(2px)',
          background: 'linear-gradient(to bottom, rgba(10,10,15,0.3), rgba(10,10,15,0.98))',
        }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px 48px', width: '100%', display: 'flex', gap: 36, alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
          <div style={{ width: 160, height: 240, borderRadius: 14, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.12)', flexShrink: 0, background: '#1a1a2e', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
            {movie.poster_url && !posterError
              ? <img
                  src={posterSrc}
                  alt={movie.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setPosterError(true)}
                />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, background: 'linear-gradient(135deg, #1a1a2e, #0a0a0f)' }}>🎬</div>
            }
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(36px, 5vw, 56px)', marginBottom: 14, color: '#fff', margin: '0 0 14px', lineHeight: 1.1 }}>{movie.title}</h1>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
              {/* IMDB-style rating */}
              {movie.rating && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)',
                  borderRadius: 8, padding: '6px 12px',
                }}>
                  <Star size={16} fill="#f5c518" color="#f5c518" />
                  <span style={{ color: '#f5c518', fontSize: 18, fontWeight: 800 }}>{movie.rating.toFixed(1)}</span>
                  <span style={{ color: 'rgba(245,197,24,0.6)', fontSize: 13 }}>/10</span>
                  {movie.vote_count && (
                    <span style={{ color: '#8b8b9a', fontSize: 12, marginLeft: 4 }}>
                      ({movie.vote_count > 1000 ? `${(movie.vote_count / 1000).toFixed(1)}k` : movie.vote_count} votes)
                    </span>
                  )}
                </div>
              )}
              <Pill icon={<Clock size={14} />} text={`${movie.duration_minutes} min`} />
              <Pill icon={<Globe size={14} />} text={movie.language} />
              <Pill icon={<Calendar size={14} />} text={format(new Date(movie.release_date), 'dd MMM yyyy')} />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'inline-block', background: 'rgba(229,9,20,0.2)', border: '1px solid rgba(229,9,20,0.4)', color: '#ff6b35', padding: '5px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
                {movie.genre}
              </div>
              {trailerUrl && (
                <button onClick={() => setTrailerModal(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'linear-gradient(135deg, #e50914, #c40812)',
                  border: 'none', borderRadius: 8, padding: '8px 18px',
                  color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  boxShadow: '0 4px 16px rgba(229,9,20,0.4)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(229,9,20,0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(229,9,20,0.4)';
                  }}
                >
                  <Play size={16} fill="white" /> Watch Trailer
                </button>
              )}
              {movie.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${movie.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.3)',
                    borderRadius: 8, padding: '7px 14px',
                    color: '#f5c518', fontSize: 13, fontWeight: 600,
                    textDecoration: 'none', transition: 'background 0.2s',
                  }}
                >
                  <ExternalLink size={14} /> IMDb
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40 }}>
          <div>
            {movie.description && (
              <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#f0f0f0' }}>Synopsis</h2>
                <p style={{ color: '#8b8b9a', lineHeight: 1.8, fontSize: 15 }}>{movie.description}</p>
              </div>
            )}

            {/* Media Slideshow */}
            {slides.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f0', margin: 0 }}>Trailer & Media Gallery</h2>
                  {slides.length > 1 && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={prevSlide} style={slideControlBtn}><ChevronLeft size={16} /></button>
                      <span style={{ color: '#8b8b9a', fontSize: 13, minWidth: 44, textAlign: 'center' }}>
                        {slideIndex + 1} / {slides.length}
                      </span>
                      <button onClick={nextSlide} style={slideControlBtn}><ChevronRight size={16} /></button>
                    </div>
                  )}
                </div>

                <div style={{
                  position: 'relative', width: '100%', paddingBottom: '56.25%',
                  borderRadius: 16, overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  background: '#0e0e15',
                }}>
                  {slides[slideIndex].type === 'video' && slides[slideIndex].url && (
                    <iframe
                      src={slides[slideIndex].url}
                      title={`${movie.title} - ${slides[slideIndex].title}`}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}

                  {slides[slideIndex].type === 'image' && slides[slideIndex].url && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.9)), url(${slides[slideIndex].url}) center/cover`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'column', padding: 24, textAlign: 'center'
                    }}>
                      <img
                        src={slides[slideIndex].url}
                        alt=""
                        style={{ height: '70%', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.6)', objectFit: 'contain' }}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                      <div style={{ color: '#f0f0f0', fontWeight: 700, fontSize: 16, marginTop: 16 }}>{movie.title}</div>
                      <div style={{ color: '#8b8b9a', fontSize: 13, marginTop: 4 }}>{slides[slideIndex].title}</div>
                    </div>
                  )}

                  {slides[slideIndex].type === 'backdrop' && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `linear-gradient(135deg, hsl(${movie.title.charCodeAt(0) * 11 % 360}, 60%, 15%), #0a0a0f)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexDirection: 'column', padding: 40, textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 56, marginBottom: 20 }}>🎬</div>
                      <div style={{ color: '#ffffff', fontWeight: 800, fontSize: 28, letterSpacing: 1 }}>{movie.title}</div>
                      <div style={{ color: '#8b8b9a', fontSize: 15, maxWidth: '70%', marginTop: 10, lineHeight: 1.6 }}>
                        Experience the epic spectacle of {movie.title} in state-of-the-art Dolby Atmos and IMAX 3D at your nearest cinema.
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 28 }}>
                        <span style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: 24, fontSize: 13, color: '#f0f0f0', fontWeight: 500 }}>
                          {movie.genre.split('/')[0].trim()}
                        </span>
                        <span style={{ background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.2)', padding: '8px 16px', borderRadius: 24, fontSize: 13, color: '#f5c518', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={12} fill="#f5c518" color="#f5c518" />
                          {movie.rating || 'N/A'}/10
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* No trailer fallback */}
            {!trailerUrl && !movie.poster_url && (
              <div style={{
                marginBottom: 40, background: 'var(--color-surface)',
                border: '1px solid var(--color-border)', borderRadius: 16,
                padding: '40px 32px', textAlign: 'center',
              }}>
                <Play size={48} style={{ color: '#8b8b9a', marginBottom: 16, opacity: 0.4 }} />
                <h3 style={{ color: '#f0f0f0', fontSize: 18, marginBottom: 8, margin: '0 0 8px' }}>Trailer Coming Soon</h3>
                <p style={{ color: '#8b8b9a', fontSize: 14 }}>The official trailer for this movie will be available shortly.</p>
              </div>
            )}

            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#f0f0f0' }}>Select Date</h2>
            <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
              {dates.map((date) => {
                const iso = format(date, 'yyyy-MM-dd');
                const sel = iso === selectedDate;
                return (
                  <button key={iso} onClick={() => setSelectedDate(iso)} style={{
                    padding: '10px 16px', borderRadius: 10,
                    background: sel ? 'linear-gradient(135deg, #e50914, #c40812)' : 'rgba(255,255,255,0.04)',
                    border: sel ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    color: sel ? 'white' : '#b0b0c0', cursor: 'pointer', textAlign: 'center', minWidth: 64,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>{format(date, 'EEE')}</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{format(date, 'd')}</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>{format(date, 'MMM')}</div>
                  </button>
                );
              })}
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#f0f0f0' }}>Showtimes</h2>
            {showsLoading ? (
              <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
            ) : cityShowtimes.length === 0 ? (
              <div style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 16,
                padding: '40px 32px',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              }}>
                <MapPin size={36} style={{ color: '#e50914', marginBottom: 16, opacity: 0.8 }} />
                <h3 style={{ color: '#f0f0f0', fontSize: 18, marginBottom: 8, margin: '0 0 8px', fontWeight: 700 }}>
                  No Shows in {selectedCity}
                </h3>
                <p style={{ color: '#8b8b9a', fontSize: 14, marginBottom: 24, maxWidth: 450, margin: '0 auto 24px', lineHeight: 1.5 }}>
                  This movie is currently not playing in {selectedCity} on {format(new Date(selectedDate), 'dd MMM')}.
                </p>

                {allCitiesWithShows.length > 0 ? (
                  <div>
                    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#8b8b9a', fontWeight: 600, marginBottom: 12 }}>
                      Available in other locations
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {allCitiesWithShows.map((cityName) => (
                        <button
                          key={cityName}
                          onClick={() => setCity(cityName)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '20px',
                            padding: '8px 16px',
                            color: '#f0f0f0',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(229,9,20,0.1)';
                            e.currentTarget.style.borderColor = 'rgba(229,9,20,0.3)';
                            e.currentTarget.style.color = '#e50914';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.color = '#f0f0f0';
                          }}
                        >
                          <Navigation size={11} />
                          {cityName}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#8b8b9a', fontSize: 13, marginTop: 12 }}>
                    Shows are currently not scheduled in any city. Check back later!
                  </p>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {cityShowtimes.map(({ theater, screen, shows }) => (
                  <div key={theater.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '22px 26px', transition: 'border-color 0.2s' }}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 17, color: '#f0f0f0' }}>{theater.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8b8b9a', fontSize: 13, marginTop: 5 }}>
                        <MapPin size={12} />{theater.city} · {theater.address}
                      </div>
                      <div style={{ color: '#8b8b9a', fontSize: 12, marginTop: 2 }}>{screen.name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {shows.map((show) => (
                        <Link key={show.id} href={`/shows/${show.id}/seats`} style={{
                          padding: '12px 18px', borderRadius: 10,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                          textDecoration: 'none', textAlign: 'center',
                          transition: 'border-color 0.2s, background 0.2s',
                        }}>
                          <div style={{ color: '#f0f0f0', fontWeight: 700, fontSize: 16 }}>{format(new Date(show.start_time), 'hh:mm a')}</div>
                          <div style={{ color: '#e50914', fontSize: 12, marginTop: 3, fontWeight: 500 }}>from {formatINR(show.base_price)}</div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 24, position: 'sticky', top: 80 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#f0f0f0' }}>Movie Info</h3>
              <InfoRow label="Duration"     value={`${movie.duration_minutes} minutes`} />
              <InfoRow label="Genre"        value={movie.genre} />
              <InfoRow label="Language"     value={movie.language} />
              <InfoRow label="Release Date" value={format(new Date(movie.release_date), 'dd MMM yyyy')} />
              {movie.rating && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ color: '#8b8b9a', fontSize: 14 }}>Rating</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Star size={13} fill="#f5c518" color="#f5c518" />
                    <span style={{ color: '#f5c518', fontSize: 14, fontWeight: 700 }}>{movie.rating.toFixed(1)}</span>
                    <span style={{ color: '#8b8b9a', fontSize: 12 }}>/10</span>
                  </div>
                </div>
              )}
              {movie.imdb_id && (
                <div style={{ marginTop: 16 }}>
                  <a
                    href={`https://www.imdb.com/title/${movie.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.25)',
                      borderRadius: 10, padding: '10px',
                      color: '#f5c518', fontSize: 14, fontWeight: 600,
                      textDecoration: 'none', transition: 'background 0.2s',
                    }}
                  >
                    <ExternalLink size={14} /> View on IMDb
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pill({ icon, text, color = '#8b8b9a' }: { icon: React.ReactNode; text: string; color?: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 6, color, fontSize: 14 }}>{icon}{text}</div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: '#8b8b9a', fontSize: 14 }}>{label}</span>
      <span style={{ color: '#f0f0f0', fontSize: 14, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}
