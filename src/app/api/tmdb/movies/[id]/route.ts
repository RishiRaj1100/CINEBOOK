// TMDB movie detail + trailer route
// GET /api/tmdb/movies/:tmdbId
// Automatically matches or inserts the movie into the local Supabase DB and generates showtimes to make it instantly bookable!

import { NextRequest, NextResponse } from 'next/server';
import {
  getMovieDetails,
  getTrailerUrl,
  getTMDBImageUrl,
  getLanguageName,
} from '@/lib/data/tmdb-service';
import { getSupabaseServiceClient } from '@/lib/data/supabase-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tmdbId = parseInt(id, 10);

  if (isNaN(tmdbId)) {
    return NextResponse.json({ error: 'Invalid TMDB ID' }, { status: 400 });
  }

  try {
    const [details, trailerUrl] = await Promise.all([
      getMovieDetails(tmdbId),
      getTrailerUrl(tmdbId),
    ]);

    const movieDetails = {
      tmdb_id: details.id,
      imdb_id: details.imdb_id,
      title: details.title,
      description: details.overview || null,
      poster_url: getTMDBImageUrl(details.poster_path, 'w500'),
      backdrop_url: getTMDBImageUrl(details.backdrop_path, 'w780'),
      rating: details.vote_average ? Math.round(details.vote_average * 10) / 10 : null,
      vote_count: details.vote_count,
      release_date: details.release_date || null,
      duration_minutes: details.runtime || 0,
      language: getLanguageName(details.original_language),
      genre: details.genres.map(g => g.name).join(' / ') || 'Other',
      trailer_url: trailerUrl,
      tagline: details.tagline,
      budget: details.budget,
      revenue: details.revenue,
      status: details.status,
    };

    // Auto-sync movie to database and generate showtimes
    const supabase = getSupabaseServiceClient();

    // 1. Check if movie already exists
    const { data: existingMovie } = await (supabase.from('movies') as any)
      .select('id')
      .eq('tmdb_id', tmdbId)
      .single();

    let dbId = '';

    if (existingMovie) {
      dbId = existingMovie.id;
    } else {
      // 2. Insert movie into DB
      const { data: newMovie, error: insertError } = await (supabase.from('movies') as any)
        .insert({
          title:            movieDetails.title,
          description:      movieDetails.description,
          duration_minutes: movieDetails.duration_minutes,
          genre:            movieDetails.genre,
          language:         movieDetails.language,
          poster_url:       movieDetails.poster_url,
          backdrop_url:     movieDetails.backdrop_url,
          rating:           movieDetails.rating,
          vote_count:       movieDetails.vote_count,
          release_date:     movieDetails.release_date,
          trailer_url:      movieDetails.trailer_url,
          imdb_id:          movieDetails.imdb_id,
          tmdb_id:          movieDetails.tmdb_id,
          is_active:        true,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[sync] Error inserting movie:', insertError);
        throw insertError;
      }

      if (newMovie) {
        dbId = newMovie.id;

        // 3. Generate showtimes across 3 random screens over next 3 days
        const { data: screens } = await (supabase.from('screens') as any).select('id');
        if (screens && screens.length > 0) {
          const selectedScreens = screens.sort(() => 0.5 - Math.random()).slice(0, 3);
          const SHOW_TIMES = ['10:30', '14:30', '18:30'];

          for (let day = 0; day < 3; day++) {
            const date = new Date();
            date.setDate(date.getDate() + day);
            const dateStr = date.toISOString().split('T')[0];

            for (let i = 0; i < selectedScreens.length; i++) {
              const screen = selectedScreens[i];
              const time = SHOW_TIMES[i % SHOW_TIMES.length];
              const startTime = new Date(`${dateStr}T${time}:00+05:30`);
              const endTime = new Date(startTime.getTime() + 180 * 60 * 1000);

              const { data: show } = await (supabase.from('shows') as any).insert({
                movie_id:   dbId,
                screen_id:  screen.id,
                start_time: startTime.toISOString(),
                end_time:   endTime.toISOString(),
                base_price: 18000,
                is_active:  true
              }).select('id').single();

              if (show) {
                // Fetch seats for this screen
                const { data: seats } = await (supabase.from('seats') as any)
                  .select('id, seat_type')
                  .eq('screen_id', screen.id);

                if (seats && seats.length > 0) {
                  const showSeats = seats.map((s: any) => ({
                    show_id: show.id,
                    seat_id: s.id,
                    price:   s.seat_type === 'recliner' ? 40000 : s.seat_type === 'premium' ? 25000 : 18000,
                    status:  'available'
                  }));

                  // Insert show seats
                  await (supabase.from('show_seats') as any).insert(showSeats);
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      ...movieDetails,
      id: dbId, // Return database ID to client
    });
  } catch (error) {
    console.error('TMDB detail/sync error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch or sync movie details' },
      { status: 500 }
    );
  }
}
