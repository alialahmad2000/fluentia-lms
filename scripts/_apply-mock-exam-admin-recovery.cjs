// Apply the mock_exam_admin_force_submit recovery RPC migration (2026-05-23 incident fix).
// One-shot. Idempotent — CREATE OR REPLACE FUNCTION.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATION = path.join(__dirname, '../supabase/migrations/20260523020000_mock_exam_admin_recovery.sql');

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
  console.log('Connected. Applying mock_exam_admin_force_submit migration...\n');

  const sql = fs.readFileSync(MIGRATION, 'utf8');
  await client.query(sql);
  console.log('Migration applied.\n');

  const { rows: fns } = await client.query(`
    SELECT proname, pg_get_function_arguments(oid) AS args
    FROM pg_proc
    WHERE proname = 'mock_exam_admin_force_submit'
  `);
  console.log('=== mock_exam_admin_force_submit ===');
  console.table(fns);

  const { rows: grants } = await client.query(`
    SELECT grantee, privilege_type
    FROM information_schema.routine_privileges
    WHERE routine_name = 'mock_exam_admin_force_submit'
    ORDER BY grantee
  `);
  console.log('=== grants ===');
  console.table(grants);

  await client.end();
  console.log('\nDone.');
})().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
