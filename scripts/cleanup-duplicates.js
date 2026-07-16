// scripts/cleanup-duplicates.js
// Resolves unique constraint violations by deleting old duplicate rows with null tmdb_id
// when a synced row with the same TMDB ID already exists in the database.

const { Client } = require('pg');

const { DB_CONFIG, TMDB_API_KEY } = require('./db-config');


async function fetchFromTMDB(path, params = {}) {
  const urlParams = new URLSearchParams({ api_key: TMDB_API_KEY, ...params }).toString();
  const url = `https://api.themoviedb.org/3/${path}?${urlParams}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function getTMDBId(title) {
  try {
    const searchTitle = title
      .replace(/: Part \d+/i, '')
      .replace(/-AD/i, '')
      .replace(/ AD/i, '')
      .replace(/: Part Two/i, '')
      .replace(/: The Rule/i, '');

    const data = await fetchFromTMDB('search/movie', { query: searchTitle });
    if (data && data.results && data.results.length > 0) {
      return data.results[0].id;
    }
  } catch {}
  return null;
}

async function main() {
  console.log('\n🧹 CineBook — Cleaning Up Duplicate Movies');
  console.log('━'.repeat(65));

  const client = new Client(DB_CONFIG);
  await client.connect();

  // Find all active movies with null tmdb_id
  const { rows: unsynced } = await client.query('SELECT id, title FROM movies WHERE tmdb_id IS NULL');
  console.log(`Checking ${unsynced.length} unsynced movies for duplicates...`);

  for (const movie of unsynced) {
    const tmdbId = await getTMDBId(movie.title);
    if (!tmdbId) continue;

    // Check if there is another movie in the DB with this tmdbId
    const { rows: duplicate } = await client.query('SELECT id, title FROM movies WHERE tmdb_id = $1 AND id != $2', [tmdbId, movie.id]);

    if (duplicate.length > 0) {
      console.log(`  🗑️  Deleting older duplicate: "${movie.title}" (ID: ${movie.id}) because synced movie "${duplicate[0].title}" (TMDB: ${tmdbId}) exists.`);
      
      // Before deleting the movie, we should re-link or delete its dependencies
      // Since it's a seed database, we can safely delete the shows and bookings linked to this old movie id
      await client.query('DELETE FROM shows WHERE movie_id = $1', [movie.id]);
      await client.query('DELETE FROM movies WHERE id = $1', [movie.id]);
    } else {
      // No duplicate exists, so we can safely update this movie's tmdb_id!
      console.log(`  💾 No duplicate found for "${movie.title}". Setting tmdb_id to ${tmdbId}.`);
      await client.query('UPDATE movies SET tmdb_id = $1 WHERE id = $2', [tmdbId, movie.id]);
    }
  }

  await client.end();
  console.log('━'.repeat(65));
  console.log('🎉 Cleanup completed successfully! Now re-run seed-shows.');
}

main().catch(console.error);
