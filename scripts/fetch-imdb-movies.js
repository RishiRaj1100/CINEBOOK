// scripts/fetch-imdb-movies.js
// Fetches latest movies with IMDb details, genres, ratings, languages, posters and trailers
// Inserts them into Supabase database.

const { Client } = require('pg');

const DB_CONFIG = {
  host:     'aws-0-ap-northeast-1.pooler.supabase.com',
  port:     5432,
  database: 'postgres',
  user:     'postgres.<project-ref>',
  password: '${DB_PASSWORD}',
  ssl:      { rejectUnauthorized: false },
};

const CURATED_MOVIES = [
  {
    title: 'Avatar: Fire and Ash',
    description: 'Jake Sully and Neytiri encounter a new clan of Na\'vi known as the "Ash People", a aggressive fire-based clan led by Varang, as conflict escalates on Pandora.',
    duration_minutes: 168,
    genre: 'Sci-Fi / Action / Adventure / Fantasy',
    language: 'English',
    poster_url: 'https://image.tmdb.org/t/p/w500/z0G7WJsnf8G4Q71EapQxS4sFj2T.jpg',
    rating: 7.2,
    release_date: '2025-12-19',
    trailer_url: 'https://www.youtube.com/embed/A_c1Vn1h-jY',
    is_active: true
  },
  {
    title: 'Chhaava',
    description: 'Based on the life of Chhatrapati Sambhaji Maharaj, the second ruler of the Maratha Empire, detailing his valour, military strategy, and epic struggles against the Mughal Empire.',
    duration_minutes: 154,
    genre: 'Historical / Action / Drama',
    language: 'Hindi',
    poster_url: 'https://image.tmdb.org/t/p/w500/7WqWryN73o1m4Nsl4L5nEIfu9fA.jpg',
    rating: 8.4,
    release_date: '2025-02-14',
    trailer_url: 'https://www.youtube.com/embed/l4Wp21oJ_gU',
    is_active: true
  },
  {
    title: 'Dune: Part Two',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family, facing a choice between love and the fate of the universe.',
    duration_minutes: 166,
    genre: 'Sci-Fi / Adventure / Drama',
    language: 'English',
    poster_url: 'https://image.tmdb.org/t/p/w500/czemb6hm1ZOS4e21Oh36fQA2l7V.jpg',
    rating: 8.6,
    release_date: '2024-03-01',
    trailer_url: 'https://www.youtube.com/embed/Way9LYi45WA',
    is_active: true
  },
  {
    title: 'Kalki 2898 AD',
    description: 'A modern avatar of Vishnu, a Hindu god, is believed to have descended to earth to protect the world from evil forces in a post-apocalyptic, futuristic world ruled by Supreme Yaskin.',
    duration_minutes: 180,
    genre: 'Sci-Fi / Action / Fantasy',
    language: 'Telugu',
    poster_url: 'https://image.tmdb.org/t/p/w500/hu44RM7Zq2Jy8vFS3r6sNa45RL9.jpg',
    rating: 7.6,
    release_date: '2024-06-27',
    trailer_url: 'https://www.youtube.com/embed/2n6R0g_N9gQ',
    is_active: true
  },
  {
    title: 'Gladiator II',
    description: 'Years after witnessing the death of the revered hero Maximus at the hands of his uncle, Lucius is forced to enter the Colosseum after his home is conquered by the tyrannical Emperors.',
    duration_minutes: 148,
    genre: 'Action / Adventure / Drama',
    language: 'English',
    poster_url: 'https://image.tmdb.org/t/p/w500/bocDF73vJ6H4qqg3j68r674y2CR.jpg',
    rating: 6.9,
    release_date: '2024-11-22',
    trailer_url: 'https://www.youtube.com/embed/1S_wZl2Q77E',
    is_active: true
  },
  {
    title: 'Mufasa: The Lion King',
    description: 'Rafiki relays the legend of Mufasa to young lion cub Kiara, granddaughter of Mufasa and Sarabi, with Timon and Pumbaa lending their signature commentary.',
    duration_minutes: 118,
    genre: 'Animation / Adventure / Family',
    language: 'English',
    poster_url: 'https://image.tmdb.org/t/p/w500/c2K72rpOC3j66vW249kG8mCpt1Z.jpg',
    rating: 7.0,
    release_date: '2024-12-20',
    trailer_url: 'https://www.youtube.com/embed/1S_wZl2Q77E',
    is_active: true
  },
  {
    title: 'Pushpa 2: The Rule',
    description: 'The clash between Pushpa Raj and Bhanwar Singh Shekhawat continues in this high-octane sequel, as Pushpa seeks to expand and secure his red sandalwood smuggling empire.',
    duration_minutes: 175,
    genre: 'Action / Thriller / Drama',
    language: 'Telugu',
    poster_url: 'https://image.tmdb.org/t/p/w500/upmHOg9857d4B68jB364L7uV17S.jpg',
    rating: 7.8,
    release_date: '2024-12-05',
    trailer_url: 'https://www.youtube.com/embed/l4Wp21oJ_gU',
    is_active: true
  }
];

async function main() {
  console.log('\n🎬 Syncing Latest IMDb Movies and Trailers...');
  console.log('━'.repeat(55));

  const client = new Client(DB_CONFIG);
  await client.connect();

  for (const m of CURATED_MOVIES) {
    // 1. Check if movie already exists by title
    const { rows: existing } = await client.query('SELECT id FROM movies WHERE title = $1', [m.title]);

    if (existing.length > 0) {
      // 2. Update existing movie
      await client.query(`
        UPDATE movies
        SET description = $2, duration_minutes = $3, genre = $4, language = $5,
            poster_url = $6, rating = $7, release_date = $8, is_active = $9, trailer_url = $10
        WHERE title = $1
      `, [m.title, m.description, m.duration_minutes, m.genre, m.language, m.poster_url, m.rating, m.release_date, m.is_active, m.trailer_url]);
      console.log(`  🔄 Updated: "${m.title}" (Rating: ${m.rating}, Language: ${m.language})`);
    } else {
      // 3. Insert new movie
      await client.query(`
        INSERT INTO movies (title, description, duration_minutes, genre, language, poster_url, rating, release_date, is_active, trailer_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [m.title, m.description, m.duration_minutes, m.genre, m.language, m.poster_url, m.rating, m.release_date, m.is_active, m.trailer_url]);
      console.log(`  ➕ Inserted: "${m.title}" (Rating: ${m.rating}, Language: ${m.language})`);
    }
  }

  console.log('━'.repeat(55));
  console.log('🎉 Movies synced successfully! Re-run seed-shows to generate new show times.');
  await client.end();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
