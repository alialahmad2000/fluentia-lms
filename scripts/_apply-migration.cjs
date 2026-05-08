require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

const sql = fs.readFileSync(
  require('path').join(__dirname, '../supabase/migrations/20260505120000_speaking_evaluation_queue.sql'),
  'utf8'
);

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await client.connect();
  console.log('Connected. Applying migration...\n');

  // Run the migration
  await client.query(sql);
  console.log('Migration applied.\n');

  // Confirm columns exist
  const { rows: cols } = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'speaking_recordings'
      AND column_name IN ('evaluation_status','evaluation_attempts','last_attempt_at','last_error')
    ORDER BY column_name
  `);
  console.log('=== New columns confirmed ===');
  console.table(cols);

  // Print backfill rowcount
  const { rows: counts } = await client.query(`
    SELECT evaluation_status, COUNT(*) AS cnt
    FROM speaking_recordings
    GROUP BY evaluation_status
    ORDER BY evaluation_status
  `);
  console.log('=== evaluation_status distribution after backfill ===');
  console.table(counts);

  // Confirm notification enum
  const { rows: enumVals } = await client.query(`
    SELECT e.enumlabel
    FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname LIKE '%notification%type%'
      AND e.enumlabel LIKE '%speaking%'
    ORDER BY e.enumsortorder
  `);
  console.log('speaking* notification type enum values:', enumVals.map(r => r.enumlabel));

  await client.end();
  console.log('\nDone.');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
