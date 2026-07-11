// TMDB movies API route — proxies TMDB API requests server-side
// GET /api/tmdb/movies?category=now_playing|popular|trending|upcoming|top_rated&genre=28&language=hi&page=1

import { NextRequest, NextResponse } from 'next/server';
import {
  getNowPlaying,
  getPopular,
  getTrending,
  getUpcoming,
  getTopRated,
  discoverByGenre,
  discoverByLanguage,
  searchMovies,
  getTrailerUrl,
  getGenres,
  getTMDBImageUrl,
  getLanguageName,
  type TMDBMovie,
} from '@/lib/data/tmdb-service';

// Genre ID → name mapping (populated on first request)
let genreMap: Record<number, string> | null = null;

async function getGenreMap(): Promise<Record<number, string>> {
  if (genreMap) return genreMap;
  const { genres } = await getGenres();
  genreMap = Object.fromEntries(genres.map(g => [g.id, g.name]));
  return genreMap;
}

/** Normalize a TMDB movie into our app's format */
function normalizeTMDBMovie(m: TMDBMovie, genres: Record<number, string>) {
  return {
    tmdb_id: m.id,
    title: m.title,
    description: m.overview || null,
    poster_url: getTMDBImageUrl(m.poster_path, 'w500'),
    backdrop_url: getTMDBImageUrl(m.backdrop_path, 'w780'),
    rating: m.vote_average ? Math.round(m.vote_average * 10) / 10 : null,
    vote_count: m.vote_count,
    release_date: m.release_date || null,
    language: getLanguageName(m.original_language),
    genre: m.genre_ids.map(id => genres[id]).filter(Boolean).join(' / ') || 'Other',
    popularity: m.popularity,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const category = params.get('category') || 'now_playing';
  const genre = params.get('genre');
  const language = params.get('language');
  const query = params.get('query');
  const page = parseInt(params.get('page') || '1', 10);

  try {
    const genres = await getGenreMap();
    let response;

    if (query) {
      response = await searchMovies(query, page);
    } else if (genre) {
      response = await discoverByGenre(parseInt(genre), page, language || undefined);
    } else if (language) {
      response = await discoverByLanguage(language, page);
    } else {
      switch (category) {
        case 'popular':
          response = await getPopular(page);
          break;
        case 'trending':
          response = await getTrending('week');
          break;
        case 'upcoming':
          response = await getUpcoming(page);
          break;
        case 'top_rated':
          response = await getTopRated(page);
          break;
        default:
          response = await getNowPlaying(page);
      }
    }

    const movies = response.results.map(m => normalizeTMDBMovie(m, genres));

    return NextResponse.json({
      movies,
      page: response.page,
      total_pages: response.total_pages,
      total_results: response.total_results,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('TMDB API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch movies from TMDB' },
      { status: 500 }
    );
  }
}
