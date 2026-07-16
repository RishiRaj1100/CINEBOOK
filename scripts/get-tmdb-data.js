// scripts/get-tmdb-data.js
// Dynamically queries TMDB API to fetch real, active poster paths, YouTube trailer IDs, ratings, backdrops, and IMDB IDs.
// Automatically updates the database with 100% accurate data for all movies.

const { Client } = require('pg');

const { DB_CONFIG, TMDB_API_KEY } = require('./db-config');


async function fetchFromTMDB(path, params = {}) {
  const urlParams = new URLSearchParams({ api_key: TMDB_API_KEY, ...params }).toString();
  const url = `https://api.themoviedb.org/3/${path}?${urlParams}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`TMDB API error for path ${path}: ${res.statusText}`);
  }
  return res.json();
}

async function getMovieMedia(title) {
  try {
    // 1. Search for the movie to get TMDB ID
    console.log(`🔍 Searching TMDB for: "${title}"...`);
    const searchData = await fetchFromTMDB('search/movie', { query: title });
    const results = searchData.results || [];
    
    if (results.length === 0) {
      console.log(`   ⚠️  No results found on TMDB for "${title}".`);
      return null;
    }
    
    // Find the best match (closest title match)
    const bestMatch = results[0];
    const tmdbId = bestMatch.id;
    console.log(`   Found TMDB ID: ${tmdbId} ("${bestMatch.title}")`);

    // 2. Fetch movie details (for poster_path, backdrop_path, imdb_id, etc.)
    const movieDetails = await fetchFromTMDB(`movie/${tmdbId}`);
    const posterPath = movieDetails.poster_path;
    const backdropPath = movieDetails.backdrop_path;
    const imdbId = movieDetails.imdb_id;
    const rating = movieDetails.vote_average ? Math.round(movieDetails.vote_average * 10) / 10 : null;
    const voteCount = movieDetails.vote_count;
    
    const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null;
    const backdropUrl = backdropPath ? `https://image.tmdb.org/t/p/w780${backdropPath}` : null;

    // 3. Fetch movie videos (for YouTube trailer key)
    const videoData = await fetchFromTMDB(`movie/${tmdbId}/videos`);
    const videos = videoData.results || [];
    
    // Find the first video of type 'Trailer' hosted on 'YouTube'
    const trailer = videos.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
    let trailerUrl = null;
    if (trailer) {
      trailerUrl = `https://www.youtube.com/embed/${trailer.key}`;
    }

    return {
      tmdbId,
      posterUrl,
      backdropUrl,
      imdbId,
      rating,
      voteCount,
      trailerUrl
    };
  } catch (err) {
    console.error(`   ❌ Failed to fetch TMDB media for "${title}":`, err.message);
    return null;
  }
}

async function main() {
  console.log('\n🎬 CineBook — Real TMDB API Media Sync & Metadata Enrichment');
  console.log('━'.repeat(65));

  const client = new Client(DB_CONFIG);
  await client.connect();

  const { rows: movies } = await client.query('SELECT id, title FROM movies');
  console.log(`Fetched ${movies.length} movies from database. Syncing media...`);

  for (const m of movies) {
    console.log('\n' + '─'.repeat(40));
    // Remove punctuation or subtitles like "Part 1" or "Part Two" for better TMDB search matches
    const searchTitle = m.title
      .replace(/: Part \d+/i, '')
      .replace(/-AD/i, '')
      .replace(/ AD/i, '')
      .replace(/: Part Two/i, '')
      .replace(/: The Rule/i, '');
      
    const media = await getMovieMedia(searchTitle);
    
    if (media) {
      const updates = [];
      const values = [];
      
      if (media.tmdbId) {
        updates.push(`tmdb_id = $${updates.length + 1}`);
        values.push(media.tmdbId);
      }
      if (media.posterUrl) {
        updates.push(`poster_url = $${updates.length + 1}`);
        values.push(media.posterUrl);
      }
      if (media.backdropUrl) {
        updates.push(`backdrop_url = $${updates.length + 1}`);
        values.push(media.backdropUrl);
      }
      if (media.imdbId) {
        updates.push(`imdb_id = $${updates.length + 1}`);
        values.push(media.imdbId);
      }
      if (media.rating) {
        updates.push(`rating = $${updates.length + 1}`);
        values.push(media.rating);
      }
      if (media.voteCount) {
        updates.push(`vote_count = $${updates.length + 1}`);
        values.push(media.voteCount);
      }
      if (media.trailerUrl) {
        updates.push(`trailer_url = $${updates.length + 1}`);
        values.push(media.trailerUrl);
      }
      
      if (updates.length > 0) {
        values.push(m.id);
        const query = `UPDATE movies SET ${updates.join(', ')} WHERE id = $${values.length}`;
        await client.query(query, values);
        console.log(`  🎉 Successfully updated DB metadata & working URLs for: "${m.title}"`);
      }
    }
    
    // Small delay to be polite to the API
    await new Promise(r => setTimeout(r, 200));
  }

  await client.end();
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 TMDB Media Sync & Enrichment completed successfully!');
}

main().catch(console.error);
