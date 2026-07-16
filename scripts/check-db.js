// scripts/check-db.js
const { Client } = require('pg');

const { DB_CONFIG, TMDB_API_KEY } = require('./db-config');


async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  const { rows } = await client.query('SELECT id, title, poster_url, trailer_url FROM movies');
  console.log('📽️ Active Movies in Database:');
  console.log(JSON.stringify(rows, null, 2));

  await client.end();
}

main().catch(console.error);
