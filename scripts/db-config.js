// scripts/db-config.js
// Shared database configuration — reads from environment variables only.
// Never hardcode credentials here. Set them in .env.local or your shell.
//
// Required env vars:
//   DB_HOST      — Supabase pooler host  (e.g. aws-0-ap-northeast-1.pooler.supabase.com)
//   DB_USER      — Supabase pooler user  (e.g. postgres.<project-ref>)
//   DB_PASSWORD  — Supabase DB password
//   DB_NAME      — Database name         (default: postgres)
//   DB_PORT      — Port                  (default: 5432)
//   TMDB_API_KEY — TMDB v3 API key

'use strict';

// Load .env.local if present (for local development convenience)
try {
  const dotenv = require('dotenv');
  const path   = require('path');
  dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
} catch {
  // dotenv is optional — env vars may already be set in the shell
}

function requireEnv(name) {
  const val = process.env[name];
  if (!val) {
    console.error(`\n❌  Missing required environment variable: ${name}`);
    console.error('    Set it in .env.local or export it in your shell.\n');
    process.exit(1);
  }
  return val;
}

const DB_CONFIG = {
  host:     requireEnv('DB_HOST'),
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'postgres',
  user:     requireEnv('DB_USER'),
  password: requireEnv('DB_PASSWORD'),
  ssl:      { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
};

const TMDB_API_KEY = requireEnv('TMDB_API_KEY');

module.exports = { DB_CONFIG, TMDB_API_KEY };
