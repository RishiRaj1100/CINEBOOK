// scripts/fetch-osm-theaters.js
// Fetches real cinema halls in Mumbai, Delhi, and Bangalore from OpenStreetMap (Overpass API)
// Inserts them into Supabase, creates default screens/seats, and generates showtimes (Optimized Batching).

const { Client } = require('pg');

const { DB_CONFIG, TMDB_API_KEY } = require('./db-config');


const FAMOUS_INDIAN_CINEMAS = [
  { name: 'Maratha Mandir Cinema', city: 'Mumbai', address: '22, M M Marg, Gilder Path, Mumbai Central' },
  { name: 'Metro INOX Cinemas', city: 'Mumbai', address: '1, Mahatma Gandhi Road, Dhobi Talao, Junction' },
  { name: 'Regal Cinema', city: 'Mumbai', address: 'Colaba Causeway, opp. Chhatrapati Shivaji Maharaj Vastu Sangrahalaya' },
  { name: 'PVR Icon Infiniti Mall', city: 'Mumbai', address: 'Infiniti Mall, Link Rd, Phase D, Shastri Nagar, Versova' },
  { name: 'PVR Plaza Connaught Place', city: 'Delhi', address: 'H-Block, Connaught Place, Middle Circle, New Delhi' },
  { name: 'Delite Cinema', city: 'Delhi', address: 'Asaf Ali Road, Delite Cinema Building, near Turkman Gate' },
  { name: 'INOX Nehru Place', city: 'Delhi', address: 'Epicuria Food Mall, Nehru Place Metro Station, New Delhi' },
  { name: 'Urvashi Theatre', city: 'Bangalore', address: '40, Lalbagh Road, near Minerva Circle, Sudhama Nagar' },
  { name: 'PVR Forum Mall Koramangala', city: 'Bangalore', address: 'The Forum Mall, Hosur Rd, Koramangala, Bengaluru' },
  { name: 'Cinepolis Royal Meenakshi Mall', city: 'Bangalore', address: 'Bannerghatta Main Rd, Hulimavu, Bengaluru' },
  { name: 'Prasads Multiplex', city: 'Hyderabad', address: 'LIC Division, NTR Marg, Central Hyderabad' },
  { name: 'PVR Galleria Mall', city: 'Hyderabad', address: 'Galleria Mall, Panjagutta, Hyderabad' },
  { name: 'Sandhya 70mm', city: 'Hyderabad', address: 'RTC X Roads, Hyderabad' },
  { name: 'Sathyam Cinemas', city: 'Chennai', address: '8, Thiru-vi-ka Road, Royapettah, Chennai' },
  { name: 'Devi Cineplex', city: 'Chennai', address: 'Devi Theatre Building, Anna Salai, Chennai' },
  { name: 'Nandan Cinema', city: 'Kolkata', address: '1/1, AJC Bose Rd, Kolkata' },
  { name: 'PVR Mani Square', city: 'Kolkata', address: 'Mani Square Mall, EM Bypass, Kolkata' },
  { name: 'E-Square Multiplex', city: 'Pune', address: 'E-Square, University Road, Shivaji Nagar, Pune' },
  { name: 'PVR Phoenix Marketcity', city: 'Pune', address: 'Phoenix Marketcity, Viman Nagar, Pune' },
  { name: 'PVR Acropolis Mall', city: 'Ahmedabad', address: 'Acropolis Mall, Thaltej, S.G. Highway, Ahmedabad' },
  { name: 'Shenoys Theatre', city: 'Kochi', address: 'Shenoys Junction, MG Road, Ernakulam, Kochi' },
  { name: 'PVR Lulu Mall', city: 'Kochi', address: 'Lulu Mall, Edappally, Kochi' },
  { name: 'Raj Mandir Cinema', city: 'Jaipur', address: 'B-1, Bhagwan Das Road, Panch Batti, C-Scheme, Jaipur' },
  { name: 'PVR Mall of Jaipur', city: 'Jaipur', address: 'Mall of Jaipur, Vaishali Nagar, Jaipur' }
];

async function fetchRealCinemas(city) {
  try {
    const fetch = (await import('node-fetch')).default;
    const query = `
      [out:json][timeout:15];
      area[name="${city}"]->.searchArea;
      (
        node["amenity"="cinema"](area.searchArea);
        way["amenity"="cinema"](area.searchArea);
      );
      out center 15;
    `;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Overpass API returned status ' + response.status);

    const data = await response.json();
    const elements = data.elements || [];

    const cinemas = [];
    for (const el of elements) {
      const name = el.tags?.name;
      if (name && !name.toLowerCase().includes('closed') && !name.toLowerCase().includes('demolished')) {
        const road = el.tags?.['addr:street'] || el.tags?.['addr:suburb'] || 'Main Road';
        const house = el.tags?.['addr:housenumber'] || '';
        const address = `${house} ${road}`.trim();
        cinemas.push({
          name: name,
          city: city,
          address: address.length > 5 ? address : `Real Location, ${city}`
        });
      }
    }
    return cinemas;
  } catch (err) {
    console.log(`⚠️  Could not fetch live OSM data for ${city}. Using curated famous cinemas.`);
    return FAMOUS_INDIAN_CINEMAS.filter(c => c.city === city);
  }
}

async function main() {
  console.log('\n🗺️  CineBook — Integrating Real Cinema Hall API (OpenStreetMap)');
  console.log('━'.repeat(65));

  const client = new Client(DB_CONFIG);
  await client.connect();

  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Kochi', 'Jaipur'];
  let allCinemas = [];

  for (const city of cities) {
    console.log(`📡 Fetching real cinemas in ${city} via OSM Overpass API...`);
    const cinemas = await fetchRealCinemas(city);
    console.log(`   Found ${cinemas.length} real cinemas.`);
    allCinemas = allCinemas.concat(cinemas);
  }

  console.log(`\n⏳ Synced ${allCinemas.length} total cinemas. Syncing with database...\n`);

  for (const c of allCinemas) {
    // 1. Insert or update theater
    const { rows: existing } = await client.query(
      'SELECT id FROM theaters WHERE name = $1 AND city = $2', [c.name, c.city]
    );

    let theaterId;
    if (existing.length > 0) {
      theaterId = existing[0].id;
      await client.query(
        'UPDATE theaters SET address = $1 WHERE id = $2', [c.address, theaterId]
      );
    } else {
      const { rows: [inserted] } = await client.query(
        'INSERT INTO theaters (name, city, address) VALUES ($1, $2, $3) RETURNING id',
        [c.name, c.city, c.address]
      );
      theaterId = inserted.id;
      console.log(`  ➕ Added Theater: "${c.name}" (${c.city})`);
    }

    // 2. Create default screen for this theater if none exists
    const { rows: screens } = await client.query(
      'SELECT id FROM screens WHERE theater_id = $1', [theaterId]
    );

    if (screens.length === 0) {
      const { rows: [screen] } = await client.query(
        `INSERT INTO screens (theater_id, name, total_rows, total_columns)
         VALUES ($1::uuid, 'Audi 1 - Prime', 10, 15) RETURNING id`,
        [theaterId]
      );

      // Generate seats for this screen
      const rows = Array.from({ length: 10 }, (_, i) => String.fromCharCode(65 + i)); // A-J
      const seats = [];
      for (const row of rows) {
        const seatType = ['A', 'B'].includes(row) ? 'recliner' : ['C', 'D', 'E'].includes(row) ? 'premium' : 'regular';
        for (let num = 1; num <= 15; num++) {
          seats.push({ row_label: row, seat_number: num, seat_type: seatType });
        }
      }

      // Batch insert seats in chunks of 100
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
      console.log(`     Created "Audi 1 - Prime" with ${seats.length} seats.`);
    }
  }

  console.log('━'.repeat(65));
  console.log('🎉 Real theaters synced successfully! Now run `npm run db:seed` to link them to movies.');

  await client.end();
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
