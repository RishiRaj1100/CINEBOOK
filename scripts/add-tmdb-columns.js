// scripts/add-tmdb-columns.js
// Migration: Adds tmdb_id, imdb_id, backdrop_url, vote_count, trailer_url columns to movies table

const { Client } = require('pg');

const { DB_CONFIG, TMDB_API_KEY } = require('./db-config');


async function main() {
  console.log('\n🔧 CineBook — Database Migration: TMDB Columns');
  console.log('━'.repeat(55));

  const client = new Client(DB_CONFIG);
  await client.connect();

  const columns = [
    { name: 'tmdb_id',      type: 'INTEGER',       default: null },
    { name: 'imdb_id',      type: 'VARCHAR(20)',    default: null },
    { name: 'backdrop_url', type: 'TEXT',           default: null },
    { name: 'vote_count',   type: 'INTEGER',        default: null },
    { name: 'trailer_url',  type: 'TEXT',           default: null },
  ];

  for (const col of columns) {
    try {
      await client.query(`ALTER TABLE movies ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default}`);
      console.log(`  ✅ Column '${col.name}' ensured (${col.type})`);
    } catch (err) {
      if (err.code === '42701') {
        // Column already exists
        console.log(`  ↩️  Column '${col.name}' already exists`);
      } else {
        throw err;
      }
    }
  }

  // Add a unique index on tmdb_id for upserts
  try {
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies (tmdb_id) WHERE tmdb_id IS NOT NULL`);
    console.log(`  ✅ Unique index on tmdb_id created`);
  } catch (err) {
    console.log(`  ↩️  tmdb_id index already exists`);
  }

  await client.end();
  console.log('━'.repeat(55));
  console.log('🎉 Migration completed successfully!');
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
