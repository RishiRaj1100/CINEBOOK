// ============================================================
// lib/data/tmdb-service.ts
// Server-side TMDB API service with caching
// ============================================================

const TMDB_BASE = 'https://api.themoviedb.org/3';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Simple in-memory cache
const cache = new Map<string, { data: unknown; expires: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

function getApiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('TMDB_API_KEY environment variable is not set');
  return key;
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const cacheKey = `${path}?${JSON.stringify(params)}`;
  const cached = getCached<T>(cacheKey);
  if (cached) return cached;

  const urlParams = new URLSearchParams({ api_key: getApiKey(), ...params });
  const url = `${TMDB_BASE}/${path}?${urlParams}`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} ${res.statusText} for ${path}`);
  }

  const data = await res.json() as T;
  setCache(cacheKey, data);
  return data;
}

// ── Types ──────────────────────────────────────────────────────

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  original_language: string;
  popularity: number;
  adult: boolean;
}

export interface TMDBMovieDetails extends TMDBMovie {
  imdb_id: string | null;
  runtime: number | null;
  genres: { id: number; name: string }[];
  budget: number;
  revenue: number;
  status: string;
  tagline: string | null;
  production_countries: { iso_3166_1: string; name: string }[];
  spoken_languages: { iso_639_1: string; name: string; english_name: string }[];
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

interface TMDBPagedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

// ── TMDB Image URL builder ─────────────────────────────────────

export type TMDBImageSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';

export function getTMDBImageUrl(path: string | null, size: TMDBImageSize = 'w500'): string {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

// ── TMDB Language Code Mapping ─────────────────────────────────

const LANGUAGE_MAP: Record<string, string> = {
  'Hindi':     'hi',
  'English':   'en',
  'Telugu':    'te',
  'Tamil':     'ta',
  'Kannada':   'kn',
  'Malayalam': 'ml',
  'Bengali':   'bn',
  'Marathi':   'mr',
  'Korean':    'ko',
  'Japanese':  'ja',
};

const LANGUAGE_NAME_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(LANGUAGE_MAP).map(([name, code]) => [code, name])
);

export function getLanguageCode(name: string): string {
  return LANGUAGE_MAP[name] || name.toLowerCase().slice(0, 2);
}

export function getLanguageName(code: string): string {
  return LANGUAGE_NAME_MAP[code] || code.toUpperCase();
}

// ── API Methods ────────────────────────────────────────────────

/** Fetch movies currently showing in theaters */
export async function getNowPlaying(page = 1, region = 'IN') {
  return tmdbFetch<TMDBPagedResponse<TMDBMovie>>('movie/now_playing', {
    page: String(page),
    region,
    language: 'en-US',
  });
}

/** Fetch popular movies */
export async function getPopular(page = 1, region = 'IN') {
  return tmdbFetch<TMDBPagedResponse<TMDBMovie>>('movie/popular', {
    page: String(page),
    region,
    language: 'en-US',
  });
}

/** Fetch trending movies */
export async function getTrending(timeWindow: 'day' | 'week' = 'week') {
  return tmdbFetch<TMDBPagedResponse<TMDBMovie>>(`trending/movie/${timeWindow}`, {
    language: 'en-US',
  });
}

/** Fetch upcoming movies */
export async function getUpcoming(page = 1, region = 'IN') {
  return tmdbFetch<TMDBPagedResponse<TMDBMovie>>('movie/upcoming', {
    page: String(page),
    region,
    language: 'en-US',
  });
}

/** Fetch top-rated movies */
export async function getTopRated(page = 1, region = 'IN') {
  return tmdbFetch<TMDBPagedResponse<TMDBMovie>>('movie/top_rated', {
    page: String(page),
    region,
    language: 'en-US',
  });
}

/** Fetch movies by genre */
export async function discoverByGenre(genreId: number, page = 1, language?: string) {
  const params: Record<string, string> = {
    page: String(page),
    sort_by: 'popularity.desc',
    'vote_count.gte': '50',
    with_genres: String(genreId),
  };
  if (language) {
    params.with_original_language = language;
  }
  return tmdbFetch<TMDBPagedResponse<TMDBMovie>>('discover/movie', params);
}

/** Fetch movies by language */
export async function discoverByLanguage(langCode: string, page = 1) {
  return tmdbFetch<TMDBPagedResponse<TMDBMovie>>('discover/movie', {
    page: String(page),
    sort_by: 'popularity.desc',
    'vote_count.gte': '20',
    with_original_language: langCode,
    'primary_release_date.gte': getDateMonthsAgo(6),
  });
}

/** Fetch full movie details */
export async function getMovieDetails(tmdbId: number) {
  return tmdbFetch<TMDBMovieDetails>(`movie/${tmdbId}`, {
    language: 'en-US',
  });
}

/** Fetch movie videos (trailers, teasers) */
export async function getMovieVideos(tmdbId: number) {
  return tmdbFetch<{ id: number; results: TMDBVideo[] }>(`movie/${tmdbId}/videos`, {
    language: 'en-US',
  });
}

/** Get the best YouTube trailer URL for a movie */
export async function getTrailerUrl(tmdbId: number): Promise<string | null> {
  try {
    const { results } = await getMovieVideos(tmdbId);
    // Priority: Official Trailer > Trailer > Teaser
    const trailer =
      results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
      results.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
      results.find(v => v.site === 'YouTube' && v.type === 'Teaser');
    return trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;
  } catch {
    return null;
  }
}

/** Search movies by title */
export async function searchMovies(query: string, page = 1) {
  return tmdbFetch<TMDBPagedResponse<TMDBMovie>>('search/movie', {
    query,
    page: String(page),
    include_adult: 'false',
  });
}

/** Fetch all movie genres */
export async function getGenres() {
  return tmdbFetch<{ genres: TMDBGenre[] }>('genre/movie/list', {
    language: 'en-US',
  });
}

// ── Helpers ────────────────────────────────────────────────────

function getDateMonthsAgo(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split('T')[0];
}

/** Well-known genre IDs for quick access */
export const GENRE_IDS = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  'Sci-Fi': 878,
  Thriller: 53,
  War: 10752,
  Western: 37,
} as const;
