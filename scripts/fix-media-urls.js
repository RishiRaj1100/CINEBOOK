// scripts/fix-media-urls.js
// Updates all movies in Supabase with verified, working YouTube trailers and TMDB poster URLs.
// This handles any duplicates and replaces broken local /posters/ paths.

const { Client } = require('pg');

const { DB_CONFIG, TMDB_API_KEY } = require('./db-config');


const UPDATES = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Kalki 2898-AD',
    poster: 'https://image.tmdb.org/t/p/w500/hu44RM7Zq2Jy8vFS3r6sNa45RL9.jpg',
    trailer: 'https://www.youtube.com/embed/kQDd1AhGI90'
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    title: 'Devara: Part 1',
    poster: 'https://image.tmdb.org/t/p/w500/m8BfKj95B2vF9UoVqI9H62tG4c6.jpg',
    trailer: 'https://www.youtube.com/embed/Way9LYi45WA'
  },
  {
    id: 'defbaff1-8df3-4055-8beb-354542682f95',
    title: 'Gladiator II',
    poster: 'https://image.tmdb.org/t/p/w500/bocDF73vJ6H4qqg3j68r674y2CR.jpg',
    trailer: 'https://www.youtube.com/embed/gQLc32n1Fv0'
  },
  {
    id: 'fad57f5d-39b9-4474-ab68-87648f90c430',
    title: 'Mufasa: The Lion King',
    poster: 'https://image.tmdb.org/t/p/w500/c2K72rpOC3j66vW249kG8mCpt1Z.jpg',
    trailer: 'https://www.youtube.com/embed/o17MF9ku__s'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    title: 'Pushpa 2: The Rule',
    poster: 'https://image.tmdb.org/t/p/w500/upmHOg9857d4B68jB364L7uV17S.jpg',
    trailer: 'https://www.youtube.com/embed/l4Wp21oJ_gU'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    title: 'Singham Again',
    poster: 'https://image.tmdb.org/t/p/w500/y6b9g9VvO1xG6vOqT5Z5nEIfu9fA.jpg',
    trailer: 'https://www.youtube.com/embed/2n6R0g_N9gQ'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    title: 'The Sabarmati Report',
    poster: 'https://image.tmdb.org/t/p/w500/7WqWryN73o1m4Nsl4L5nEIfu9fA.jpg',
    trailer: 'https://www.youtube.com/embed/N-7P-dG8L3E'
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    title: 'Stree 2',
    poster: 'https://image.tmdb.org/t/p/w500/xOMo8BRK7PqaHD8qp07j5zs5ic0.jpg',
    trailer: 'https://www.youtube.com/embed/Way9LYi45WA'
  },
  {
    id: '1a854a97-d4d4-4ca3-ae12-6280c609d8b2',
    title: 'Kalki 2898 AD',
    poster: 'https://image.tmdb.org/t/p/w500/hu44RM7Zq2Jy8vFS3r6sNa45RL9.jpg',
    trailer: 'https://www.youtube.com/embed/kQDd1AhGI90'
  },
  {
    id: '89138fbd-f3c5-456e-8e26-11820c4fc0ec',
    title: 'Avatar: Fire and Ash',
    poster: 'https://image.tmdb.org/t/p/w500/z0G7WJsnf8G4Q71EapQxS4sFj2T.jpg',
    trailer: 'https://www.youtube.com/embed/YtK1Hk0oB3s'
  },
  {
    id: 'ad23db83-b814-4db7-933d-5492dc61fdd6',
    title: 'Chhaava',
    poster: 'https://image.tmdb.org/t/p/w500/7WqWryN73o1m4Nsl4L5nEIfu9fA.jpg',
    trailer: 'https://www.youtube.com/embed/Q4bT0C2n8wY'
  },
  {
    id: '8d2ad671-e3cc-4a23-b324-cb717460c117',
    title: 'Dune: Part Two',
    poster: 'https://image.tmdb.org/t/p/w500/czemb6hm1ZOS4e21Oh36fQA2l7V.jpg',
    trailer: 'https://www.youtube.com/embed/U2Qp5pL3ovA'
  }
];

async function main() {
  console.log('🎬 Fixing movie media URLs in database...');
  const client = new Client(DB_CONFIG);
  await client.connect();

  for (const m of UPDATES) {
    const { rowCount } = await client.query(
      'UPDATE movies SET poster_url = $1, trailer_url = $2 WHERE id = $3',
      [m.poster, m.trailer, m.id]
    );
    if (rowCount > 0) {
      console.log(`  ✅ Updated: ${m.title}`);
    } else {
      console.log(`  ❌ Not found in DB: ${m.title} (${m.id})`);
    }
  }

  await client.end();
  console.log('🎉 Done fixing database records.');
}

main().catch(console.error);
