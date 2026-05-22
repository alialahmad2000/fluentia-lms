// Apply the audio_event_log migration via the pooler.
// One-shot. Idempotent — uses IF NOT EXISTS / DROP IF EXISTS throughout.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATION = path.join(__dirname, '../supabase/migrations/20260522100000_audio_event_log.sql');

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: process.env.SUPABASE_DB_PASSWORD || 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  console.log('Connected. Applying audio_event_log migration...\n');

  const sql = fs.readFileSync(MIGRATION, 'utf8');
  await client.query(sql);
  console.log('Migration applied.\n');

  const { rows: cols } = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'audio_event_log'
    ORDER BY ordinal_position
  `);
  console.log('=== audio_event_log columns ===');
  console.table(cols);

  const { rows: policies } = await client.query(`
    SELECT policyname, cmd
    FROM pg_policies
    WHERE tablename = 'audio_event_log'
    ORDER BY policyname
  `);
  console.log('=== RLS policies ===');
  console.table(policies);

  const { rows: indexes } = await client.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'audio_event_log'
    ORDER BY indexname
  `);
  console.log('=== indexes ===');
  console.table(indexes);

  await client.end();
  console.log('\nDone.');
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
