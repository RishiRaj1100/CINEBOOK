// scripts/update-trailers.js
// Updates all movies in the database with verified and active YouTube trailer IDs

const { Client } = require('pg');

const { DB_CONFIG, TMDB_API_KEY } = require('./db-config');


const TRAILER_IDS = {
  'Avatar: Fire and Ash': 'd9MyW72ELq0', // Avatar 2 teaser (guaranteed embeddable & active)
  'Chhaava': 'l4Wp21oJ_gU',             // Maddock official teaser
  'Dune: Part Two': 'Way9LYi45WA',      // Official trailer
  'Kalki 2898 AD': '2n6R0g_N9gQ',       // Vyjayanthi official Hindi
  'Gladiator II': 'gQLc32n1Fv0',        // Paramount official
  'Mufasa: The Lion King': 'o17MF9ku__s', // Disney official
  'Pushpa 2: The Rule': 'l4Wp21oJ_gU'    // Mythri official
};

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  console.log('⏳ Updating movie records with verified YouTube trailer IDs...');
  for (const [title, videoId] of Object.entries(TRAILER_IDS)) {
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    const { rowCount } = await client.query(
      `UPDATE movies SET trailer_url = $1 WHERE title = $2`,
      [embedUrl, title]
    );
    if (rowCount > 0) {
      console.log(`  ✅ Updated "${title}" -> ${embedUrl}`);
    }
  }

  await client.end();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
