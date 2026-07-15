// scripts/check-db.js
const { Client } = require('pg');

const DB_CONFIG = {
  host:     'aws-0-ap-northeast-1.pooler.supabase.com',
  port:     5432,
  database: 'postgres',
  user:     'postgres.<project-ref>',
  password: '${DB_PASSWORD}',
  ssl:      { rejectUnauthorized: false },
};

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  const { rows } = await client.query('SELECT id, title, poster_url, trailer_url FROM movies');
  console.log('📽️ Active Movies in Database:');
  console.log(JSON.stringify(rows, null, 2));

  await client.end();
}

main().catch(console.error);
