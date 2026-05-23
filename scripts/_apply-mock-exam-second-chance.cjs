// Apply the SECOND-CHANCE + lossless auto-submit migration via pooler.
// Idempotent. Safe to re-run.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATION = path.join(__dirname, '../supabase/migrations/20260523040000_mock_exam_second_chance_lossless.sql');

const c = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: process.env.SUPABASE_DB_PASSWORD || 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await c.connect();
  console.log('Connected. Applying second-chance migration...\n');
  await c.query(fs.readFileSync(MIGRATION, 'utf8'));
  console.log('Migration applied.\n');

  // Also write the pg_net app settings so the AI grading cron has the supabase URL + service-role key
  // ALTER SYSTEM ... requires superuser; instead use ALTER DATABASE which most Supabase projects allow.
  const supaUrl  = process.env.VITE_SUPABASE_URL || 'https://nmjexpuycmqcxuxljier.supabase.co';
  const srKey    = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (srKey) {
    try {
      await c.query(`ALTER DATABASE postgres SET app.settings.supabase_url = '${supaUrl.replace(/'/g, "''")}'`);
      await c.query(`ALTER DATABASE postgres SET app.settings.service_role_key = '${srKey.replace(/'/g, "''")}'`);
      console.log('app.settings configured for pg_net AI grading cron.\n');
    } catch (e) {
      console.log('ALTER DATABASE failed (cron AI grading will skip cleanly):', e.message);
    }
  } else {
    console.log('No SUPABASE_SERVICE_ROLE_KEY env — skipping app.settings; AI cron will return skipped.\n');
  }

  // Verify
  const t = await c.query(`SELECT to_regclass('public.mock_exam_attempts_archive') AS arch`);
  console.log('archive table:', t.rows[0]);

  const r = await c.query(`
    SELECT routine_name FROM information_schema.routines
     WHERE routine_schema='public'
       AND routine_name IN (
         'mock_exam_archive_and_reset',
         'mock_exam_cron_auto_submit_expired',
         'mock_exam_cron_grade_pending_writing'
       )
     ORDER BY routine_name
  `);
  console.log('routines:', r.rows.map(x => x.routine_name));

  const j = await c.query(`SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'mock-exam-%' ORDER BY jobname`);
  console.log('cron jobs:');
  console.table(j.rows);

  await c.end();
  console.log('\nDone.');
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
