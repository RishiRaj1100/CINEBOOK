// scripts/add-trailer-column.js
// Runs ALTER TABLE to add trailer_url column to movies table

const { Client } = require('pg');

const { DB_CONFIG, TMDB_API_KEY } = require('./db-config');


async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  console.log('⏳ Adding trailer_url column to movies table...');
  await client.query('ALTER TABLE movies ADD COLUMN IF NOT EXISTS trailer_url TEXT');
  console.log('✅ trailer_url column added successfully!');

  await client.end();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
