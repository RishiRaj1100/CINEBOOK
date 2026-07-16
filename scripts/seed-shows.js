// scripts/seed-shows.js
// Creates sample shows with seats so the app works end-to-end
// Seats are generated for each screen, shows for next 3 days

const { Client } = require('pg');

const { DB_CONFIG, TMDB_API_KEY } = require('./db-config');


function getSeatType(rowLabel) {
  const recliners = ['A', 'B', 'C'];
  const premium   = ['D', 'E', 'F'];
  if (recliners.includes(rowLabel)) return 'recliner';
  if (premium.includes(rowLabel))   return 'premium';
  return 'regular';
}

const PRICE_MULTIPLIER = { regular: 1.0, premium: 1.5, recliner: 2.0 };

async function seedShows() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  console.log('\n🌱 CineBook — Seeding Shows & Seats (Optimized Batching)');
  console.log('━'.repeat(55));

  // Get screens
  const { rows: screens } = await client.query(`
    SELECT s.*, t.name as theater_name, t.city
    FROM screens s
    JOIN theaters t ON t.id = s.theater_id
    ORDER BY s.id
  `);

  // Get movies
  const { rows: movies } = await client.query(`SELECT id, title FROM movies WHERE is_active = true ORDER BY id`);

  console.log(`📽️  Found ${movies.length} movies, ${screens.length} screens\n`);

  // ── Step 1: Create seats for each screen ────────────────────────
  console.log('🪑 Creating seats...');
  for (const screen of screens) {
    const { rows: existing } = await client.query(
      'SELECT COUNT(*) FROM seats WHERE screen_id = $1', [screen.id]
    );
    if (parseInt(existing[0].count) > 0) {
      console.log(`   ↩️  ${screen.theater_name} / ${screen.name} — seats already exist`);
      continue;
    }

    const rows = Array.from({ length: screen.total_rows }, (_, i) =>
      String.fromCharCode(65 + i)
    );

    const seats = [];
    for (const row of rows) {
      const seatType = getSeatType(row);
      for (let num = 1; num <= screen.total_columns; num++) {
        seats.push({ row_label: row, seat_number: num, seat_type: seatType });
      }
    }

    // Batch insert using chunking
    const chunkSize = 100;
    for (let j = 0; j < seats.length; j += chunkSize) {
      const chunk = seats.slice(j, j + chunkSize);
      const values = chunk.map((s, idx) => {
        const baseIndex = idx * 4;
        return `($${baseIndex + 1}::uuid, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`;
      }).join(', ');
      const params = chunk.flatMap(s => [screen.id, s.row_label, s.seat_number, s.seat_type]);

      await client.query(
        `INSERT INTO seats (screen_id, row_label, seat_number, seat_type) VALUES ${values}
         ON CONFLICT (screen_id, row_label, seat_number) DO NOTHING`,
        params
      );
    }
    console.log(`   ✅ ${screen.theater_name} / ${screen.name} — ${seats.length} seats created`);
  }

  // ── Step 2: Create shows for the next 3 days ────────────────────
  console.log('\n📅 Creating shows for next 3 days...');

  const SHOW_TIMES = ['09:30', '13:00', '16:30', '20:00'];
  const BASE_PRICES = {
    regular:  18000,
    premium:  25000,
    recliner: 40000,
  };

  let showsCreated = 0;

  // We distribute all movies sequentially across 3 days * 15 screens * 4 showtimes = 180 slots
  const totalSlots = 3 * screens.length * SHOW_TIMES.length;
  
  for (let slot = 0; slot < totalSlots; slot++) {
    const day = Math.floor(slot / (screens.length * SHOW_TIMES.length));
    const screenSlotIndex = slot % (screens.length * SHOW_TIMES.length);
    const screenIndex = Math.floor(screenSlotIndex / SHOW_TIMES.length);
    const timeIndex = screenSlotIndex % SHOW_TIMES.length;

    const movie  = movies[slot % movies.length];
    const screen = screens[screenIndex];
    const time   = SHOW_TIMES[timeIndex];

    const date = new Date();
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    const startTime = new Date(`${dateStr}T${time}:00+05:30`);
    const endTime   = new Date(startTime.getTime() + 180 * 60 * 1000);

    // Check if show already exists
    const { rows: existing } = await client.query(
      'SELECT id FROM shows WHERE screen_id = $1 AND start_time = $2',
      [screen.id, startTime.toISOString()]
    );

    let showId;
    if (existing.length > 0) {
      showId = existing[0].id;
    } else {
      const basePrice = BASE_PRICES.regular;
      const { rows: [show] } = await client.query(
        `INSERT INTO shows (movie_id, screen_id, start_time, end_time, base_price, is_active)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, true) RETURNING id`,
        [movie.id, screen.id, startTime.toISOString(), endTime.toISOString(), basePrice]
      );
      showId = show.id;
      showsCreated++;
    }

      // Get seats for this screen
      const { rows: seats } = await client.query(
        'SELECT id, seat_type FROM seats WHERE screen_id = $1',
        [screen.id]
      );

      // Batch insert show seats in chunks of 100 (super fast!)
      if (seats.length > 0) {
        const chunkSize = 100;
        for (let j = 0; j < seats.length; j += chunkSize) {
          const chunk = seats.slice(j, j + chunkSize);
          const values = chunk.map((s, idx) => {
            const baseIndex = idx * 4;
            return `($${baseIndex + 1}::uuid, $${baseIndex + 2}::uuid, $${baseIndex + 3}, $${baseIndex + 4})`;
          }).join(', ');
          const params = chunk.flatMap(s => [
            showId, s.id,
            Math.round(BASE_PRICES.regular * PRICE_MULTIPLIER[s.seat_type]),
            'available'
          ]);
          await client.query(
            `INSERT INTO show_seats (show_id, seat_id, price, status) VALUES ${values}
             ON CONFLICT (show_id, seat_id) DO NOTHING`,
            params
          );
        }
      }
    }
  
    console.log(`   ✅ Created/verified scheduled shows with seats`);

  // Summary
  const { rows: totals } = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM seats)      AS seats,
      (SELECT COUNT(*) FROM shows)      AS shows,
      (SELECT COUNT(*) FROM show_seats) AS show_seats
  `);

  console.log('━'.repeat(55));
  console.log('📊 Database Summary:');
  console.log(`   🪑 Seats:      ${totals[0].seats}`);
  console.log(`   🎬 Shows:      ${totals[0].shows}`);
  console.log(`   💺 Show Seats: ${totals[0].show_seats}`);
  console.log('\n🎉 App is fully ready!');
  console.log('   👉 Visit http://localhost:3000\n');

  await client.end();
}

seedShows().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
