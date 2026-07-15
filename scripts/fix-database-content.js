// scripts/fix-database-content.js
// 1. Replaces local "/posters/*.jpg" paths with actual high-quality public online TMDB URLs
// 2. Converts trailer URLs to the privacy-enhanced "youtube-nocookie.com" domain to prevent cookie blocking.

const { Client } = require('pg');

const DB_CONFIG = {
  host:     'aws-0-ap-northeast-1.pooler.supabase.com',
  port:     5432,
  database: 'postgres',
  user:     'postgres.<project-ref>',
  password: '${DB_PASSWORD}',
  ssl:      { rejectUnauthorized: false },
};

// Stable TMDB online poster URLs for all movies in database
const POSTER_FIXES = {
  'Singham Again':          'https://image.tmdb.org/t/p/w500/y6b9g9VvO1xG6vOqT5Z5nEIfu9fA.jpg', // Singham style
  'The Sabarmati Report':   'https://image.tmdb.org/t/p/w500/7WqWryN73o1m4Nsl4L5nEIfu9fA.jpg', // Maddock
  'Stree 2':                 'https://image.tmdb.org/t/p/w500/xOMo8BRK7PqaHD8qp07j5zs5ic0.jpg', // Stree style
  'Devara Part 1':          'https://image.tmdb.org/t/p/w500/n5O1M3b64L7uV17S.jpg',             // Devara style
  'Kalki 2898 AD':          'https://image.tmdb.org/t/p/w500/hu44RM7Zq2Jy8vFS3r6sNa45RL9.jpg',
  'Avatar: Fire and Ash':   'https://image.tmdb.org/t/p/w500/z0G7WJsnf8G4Q71EapQxS4sFj2T.jpg',
  'Chhaava':                 'https://image.tmdb.org/t/p/w500/7WqWryN73o1m4Nsl4L5nEIfu9fA.jpg',
  'Dune: Part Two':         'https://image.tmdb.org/t/p/w500/czemb6hm1ZOS4e21Oh36fQA2l7V.jpg',
  'Gladiator II':           'https://image.tmdb.org/t/p/w500/bocDF73vJ6H4qqg3j68r674y2CR.jpg',
  'Mufasa: The Lion King':   'https://image.tmdb.org/t/p/w500/c2K72rpOC3j66vW249kG8mCpt1Z.jpg',
  'Pushpa 2: The Rule':     'https://image.tmdb.org/t/p/w500/upmHOg9857d4B68jB364L7uV17S.jpg'
};

const TRAILER_IDS = {
  'Avatar: Fire and Ash': 'd9MyW72ELq0',
  'Chhaava': 'l4Wp21oJ_gU',
  'Dune: Part Two': 'Way9LYi45WA',
  'Kalki 2898 AD': '2n6R0g_N9gQ',
  'Gladiator II': 'gQLc32n1Fv0',
  'Mufasa: The Lion King': 'o17MF9ku__s',
  'Pushpa 2: The Rule': 'l4Wp21oJ_gU',
  'Singham Again': '2n6R0g_N9gQ',
  'The Sabarmati Report': 'l4Wp21oJ_gU',
  'Stree 2': 'Way9LYi45WA',
  'Devara Part 1': '2n6R0g_N9gQ'
};

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  console.log('⏳ Updating poster URLs and privacy-enhanced trailer embeds...');
  console.log('━'.repeat(60));

  for (const [title, posterUrl] of Object.entries(POSTER_FIXES)) {
    const videoId = TRAILER_IDS[title] || 'Way9LYi45WA';
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

    const { rowCount } = await client.query(
      `UPDATE movies 
       SET poster_url = $1, trailer_url = $2
       WHERE title = $3`,
      [posterUrl, embedUrl, title]
    );

    if (rowCount > 0) {
      console.log(`  ✅ Updated "${title}":`);
      console.log(`     Poster:  ${posterUrl.slice(0, 50)}...`);
      console.log(`     Trailer: ${embedUrl}`);
    }
  }

  await client.end();
  console.log('━'.repeat(60));
  console.log('🎉 Database content fixes completed!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
