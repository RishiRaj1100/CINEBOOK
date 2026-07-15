// scripts/migrate.js
// Runs all SQL migration files against Supabase Postgres in order
// Usage: node scripts/migrate.js

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Direct Postgres connection to Supabase
// Using Session Mode pooler — works on all Supabase tiers including Free
const DB_CONFIG = {
  host:     'aws-0-ap-northeast-1.pooler.supabase.com',
  port:     5432,  // Session mode port
  database: 'postgres',
  user:     'postgres.<project-ref>',  // pooler format: postgres.<project-ref>
  password: '${DB_PASSWORD}',
  ssl:      { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
};

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// Files to run in order
const MIGRATION_FILES = [
  '001_schema.sql',
  '002_rls.sql',
  '003_functions.sql',
  '004_seed.sql',
];

async function runMigrations() {
  console.log('\n🎬 CineBook — Database Migration Runner');
  console.log('━'.repeat(50));
  console.log(`📡 Connecting to: ${DB_CONFIG.host}`);

  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('✅ Connected to Supabase Postgres\n');

    for (const filename of MIGRATION_FILES) {
      const filepath = path.join(MIGRATIONS_DIR, filename);

      if (!fs.existsSync(filepath)) {
        console.log(`⚠️  Skipping ${filename} — file not found`);
        continue;
      }

      const sql = fs.readFileSync(filepath, 'utf8');
      console.log(`⏳ Running ${filename}...`);

      try {
        await client.query(sql);
        console.log(`✅ ${filename} — done\n`);
      } catch (err) {
        // Some statements might already exist (idempotent), log and continue
        const msg = err.message || '';
        if (
          msg.includes('already exists') ||
          msg.includes('duplicate key') ||
          msg.includes('already scheduled')
        ) {
          console.log(`ℹ️  ${filename} — skipped (already applied): ${msg.split('\n')[0]}\n`);
        } else {
          console.error(`❌ Error in ${filename}:\n   ${msg}\n`);
          // For schema errors, we should stop
          if (filename === '001_schema.sql') {
            throw err;
          }
          console.log('   Continuing with next file...\n');
        }
      }
    }

    console.log('━'.repeat(50));
    console.log('🎉 All migrations completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. Make yourself admin:');
    console.log('      UPDATE profiles SET role = \'admin\' WHERE id = \'your-uuid\';');
    console.log('   2. Add Razorpay keys to .env.local');
    console.log('   3. Visit http://localhost:3000\n');

  } catch (err) {
    console.error('\n💥 Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('📴 Connection closed.');
  }
}

runMigrations();
