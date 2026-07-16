// scripts/sync-tmdb-movies.js
// Fetches latest movies from TMDB API (Now Playing + Popular + Trending in India region)
// Enriches with trailer URLs, IMDB IDs, and upserts into Supabase
// Supports multiple languages: English, Hindi, Telugu, Tamil

const { Client } = require('pg');

const { DB_CONFIG, TMDB_API_KEY } = require('./db-config');


const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p';

const LANG_MAP = {
  'en': 'English', 'hi': 'Hindi', 'te': 'Telugu', 'ta': 'Tamil',
  'kn': 'Kannada', 'ml': 'Malayalam', 'bn': 'Bengali', 'mr': 'Marathi',
  'ko': 'Korean', 'ja': 'Japanese', 'fr': 'French', 'es': 'Spanish',
  'de': 'German', 'it': 'Italian', 'pt': 'Portuguese', 'zh': 'Chinese',
  'ru': 'Russian',
};

async function tmdbFetch(path, params = {}) {
  const urlParams = new URLSearchParams({ api_key: TMDB_API_KEY, ...params });
  const url = `${TMDB_BASE}/${path}?${urlParams}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${path}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function getGenreMap() {
  const { genres } = await tmdbFetch('genre/movie/list', { language: 'en-US' });
  return Object.fromEntries(genres.map(g => [g.id, g.name]));
}

async function getMovieDetails(tmdbId) {
  try {
    const details = await tmdbFetch(`movie/${tmdbId}`, { language: 'en-US' });
    return details;
  } catch {
    return null;
  }
}

async function getTrailerUrl(tmdbId) {
  try {
    const { results } = await tmdbFetch(`movie/${tmdbId}/videos`, { language: 'en-US' });
    const trailer =
      results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
      results.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
      results.find(v => v.site === 'YouTube' && v.type === 'Teaser');
    return trailer ? `https://www.youtube.com/embed/${trailer.key}` : null;
  } catch {
    return null;
  }
}

async function fetchMovieList(category, params = {}) {
  const data = await tmdbFetch(`movie/${category}`, { ...params, language: 'en-US' });
  return data.results || [];
}

async function fetchTrending() {
  const data = await tmdbFetch('trending/movie/week', { language: 'en-US' });
  return data.results || [];
}

async function fetchByLanguage(langCode) {
  const data = await tmdbFetch('discover/movie', {
    with_original_language: langCode,
    sort_by: 'popularity.desc',
    'vote_count.gte': '20',
    language: 'en-US',
  });
  return data.results || [];
}

async function main() {
  console.log('\n🎬 CineBook — TMDB Movie Sync');
  console.log('━'.repeat(65));

  const client = new Client(DB_CONFIG);
  await client.connect();

  // Ensure migration columns exist
  const migrationCols = ['tmdb_id', 'imdb_id', 'backdrop_url', 'vote_count', 'trailer_url'];
  for (const col of migrationCols) {
    try {
      await client.query(`ALTER TABLE movies ADD COLUMN IF NOT EXISTS ${col} ${col === 'tmdb_id' || col === 'vote_count' ? 'INTEGER' : col === 'imdb_id' ? 'VARCHAR(20)' : 'TEXT'} DEFAULT NULL`);
    } catch { /* already exists */ }
  }
  try {
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies (tmdb_id) WHERE tmdb_id IS NOT NULL`);
  } catch { /* already exists */ }

  const genreMap = await getGenreMap();
  console.log(`📚 Loaded ${Object.keys(genreMap).length} genres`);

  // Collect all movies from multiple sources
  const allTmdbMovies = new Map(); // tmdb_id -> movie

  // 1. Now Playing (India)
  console.log('\n📡 Fetching Now Playing (India)...');
  const nowPlaying = await fetchMovieList('now_playing', { region: 'IN' });
  nowPlaying.forEach(m => allTmdbMovies.set(m.id, m));
  console.log(`   Found ${nowPlaying.length} movies`);

  // 2. Popular (India)
  console.log('📡 Fetching Popular (India)...');
  const popular = await fetchMovieList('popular', { region: 'IN' });
  popular.forEach(m => allTmdbMovies.set(m.id, m));
  console.log(`   Found ${popular.length} movies`);

  // 3. Trending globally
  console.log('📡 Fetching Trending (Global)...');
  const trending = await fetchTrending();
  trending.forEach(m => allTmdbMovies.set(m.id, m));
  console.log(`   Found ${trending.length} movies`);

  // 4. Indian language movies
  for (const lang of ['hi', 'te', 'ta', 'kn', 'ml']) {
    console.log(`📡 Fetching ${LANG_MAP[lang] || lang} movies...`);
    const langMovies = await fetchByLanguage(lang);
    langMovies.forEach(m => allTmdbMovies.set(m.id, m));
    console.log(`   Found ${langMovies.length} movies`);
  }

  console.log(`\n⏳ Total unique movies: ${allTmdbMovies.size}. Enriching & syncing...\n`);

  let inserted = 0, updated = 0, failed = 0;

  for (const [tmdbId, m] of allTmdbMovies) {
    try {
      // Skip movies without posters or very low votes
      if (!m.poster_path && !m.backdrop_path) continue;
      if (m.vote_count < 5) continue;

      // Get detailed info
      const details = await getMovieDetails(tmdbId);
      const trailerUrl = await getTrailerUrl(tmdbId);

      const runtime = details?.runtime || 120;
      const imdbId = details?.imdb_id || null;
      const genreNames = (m.genre_ids || []).map(id => genreMap[id]).filter(Boolean).join(' / ') || 'Other';
      const langName = LANG_MAP[m.original_language] || m.original_language?.toUpperCase() || 'Other';
      const posterUrl = m.poster_path ? `${TMDB_IMG_BASE}/w500${m.poster_path}` : null;
      const backdropUrl = m.backdrop_path ? `${TMDB_IMG_BASE}/w780${m.backdrop_path}` : null;
      const releaseDate = m.release_date || '2024-01-01';
      const rating = m.vote_average ? Math.round(m.vote_average * 10) / 10 : null;

      // Upsert: check by tmdb_id first, then by title
      const { rows: existing } = await client.query(
        'SELECT id FROM movies WHERE tmdb_id = $1', [tmdbId]
      );

      if (existing.length > 0) {
        // Update
        await client.query(`
          UPDATE movies SET
            title = $2, description = $3, duration_minutes = $4, genre = $5,
            language = $6, poster_url = $7, rating = $8, release_date = $9,
            is_active = true, trailer_url = $10, imdb_id = $11,
            backdrop_url = $12, vote_count = $13
          WHERE tmdb_id = $1
        `, [tmdbId, m.title, m.overview, runtime, genreNames, langName,
            posterUrl, rating, releaseDate, trailerUrl, imdbId,
            backdropUrl, m.vote_count]);
        updated++;
      } else {
        // Check by title
        const { rows: byTitle } = await client.query(
          'SELECT id FROM movies WHERE title = $1', [m.title]
        );

        if (byTitle.length > 0) {
          await client.query(`
            UPDATE movies SET
              tmdb_id = $2, description = $3, duration_minutes = $4, genre = $5,
              language = $6, poster_url = $7, rating = $8, release_date = $9,
              is_active = true, trailer_url = $10, imdb_id = $11,
              backdrop_url = $12, vote_count = $13
            WHERE title = $1
          `, [m.title, tmdbId, m.overview, runtime, genreNames, langName,
              posterUrl, rating, releaseDate, trailerUrl, imdbId,
              backdropUrl, m.vote_count]);
          updated++;
        } else {
          // Insert
          await client.query(`
            INSERT INTO movies (title, description, duration_minutes, genre, language,
              poster_url, rating, release_date, is_active, trailer_url,
              tmdb_id, imdb_id, backdrop_url, vote_count)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11, $12, $13)
          `, [m.title, m.overview, runtime, genreNames, langName,
              posterUrl, rating, releaseDate, trailerUrl,
              tmdbId, imdbId, backdropUrl, m.vote_count]);
          inserted++;
        }
      }

      if ((inserted + updated) % 10 === 0) {
        process.stdout.write(`  ⏳ Processed ${inserted + updated + failed}/${allTmdbMovies.size}...\r`);
      }

      // Small delay to be nice to TMDB API
      await new Promise(r => setTimeout(r, 200));

    } catch (err) {
      failed++;
      console.error(`  ❌ Failed: "${m.title}":`, err.message);
    }
  }

  console.log('\n' + '━'.repeat(65));
  console.log(`📊 Sync Results:`);
  console.log(`   ➕ Inserted: ${inserted}`);
  console.log(`   🔄 Updated:  ${updated}`);
  console.log(`   ❌ Failed:   ${failed}`);

  // Summary
  const { rows: totals } = await client.query(`
    SELECT COUNT(*) as total,
           COUNT(tmdb_id) as with_tmdb,
           COUNT(trailer_url) as with_trailer,
           COUNT(poster_url) as with_poster
    FROM movies WHERE is_active = true
  `);

  console.log(`\n📊 Database Summary:`);
  console.log(`   🎬 Total active movies:  ${totals[0].total}`);
  console.log(`   🔗 With TMDB ID:         ${totals[0].with_tmdb}`);
  console.log(`   🎥 With trailer:         ${totals[0].with_trailer}`);
  console.log(`   🖼️  With poster:          ${totals[0].with_poster}`);

  await client.end();
  console.log('\n🎉 TMDB sync completed! Run `npm run db:seed` to link movies to theaters.\n');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
