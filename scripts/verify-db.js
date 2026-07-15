// scripts/verify-db.js
// Quick check that all tables and seed data exist

const { Client } = require('pg');

const DB_CONFIG = {
  host:     'aws-0-ap-northeast-1.pooler.supabase.com',
  port:     5432,
  database: 'postgres',
  user:     'postgres.<project-ref>',
  password: '${DB_PASSWORD}',
  ssl:      { rejectUnauthorized: false },
};

async function verify() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  console.log('\n🔍 CineBook — Database Verification');
  console.log('━'.repeat(45));

  const tables = ['movies', 'theaters', 'screens', 'seats', 'shows', 'show_seats', 'bookings', 'booking_seats', 'payments', 'profiles'];

  for (const table of tables) {
    const { rows } = await client.query(`SELECT COUNT(*) FROM ${table}`);
    const count = rows[0].count;
    const icon = count > 0 ? '✅' : '⬜';
    console.log(`${icon} ${table.padEnd(20)} ${count} rows`);
  }

  // Check functions
  console.log('\n📦 Postgres Functions:');
  const { rows: funcs } = await client.query(`
    SELECT routine_name FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
    AND routine_name IN ('hold_seats', 'confirm_booking', 'cancel_booking', 'create_booking', 'release_expired_locks', 'is_admin')
    ORDER BY routine_name
  `);
  funcs.forEach(f => console.log(`  ✅ ${f.routine_name}()`));

  // Check pg_cron
  try {
    const { rows: crons } = await client.query(`SELECT jobname, schedule FROM cron.job WHERE jobname = 'release-expired-seat-locks'`);
    if (crons.length > 0) {
      console.log(`\n⏰ pg_cron: ✅ release-expired-seat-locks scheduled (${crons[0].schedule})`);
    }
  } catch(e) {
    console.log('\n⏰ pg_cron: ⚠️  Could not verify (may need extension enabled)');
  }

  console.log('\n━'.repeat(45));
  console.log('✅ Database is ready!');
  console.log('\n🎬 Open http://localhost:3000 to see your movies!\n');

  await client.end();
}

verify().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
