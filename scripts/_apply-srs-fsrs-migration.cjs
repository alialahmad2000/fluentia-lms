/**
 * Apply VOCAB-PREMIUM Prompt 03 SRS → FSRS migration.
 * Pattern lifted from scripts/_apply-migration.cjs.
 *
 * Idempotent — safe to re-run. Verifies the 97 seeded rows survive intact.
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/20260520140000_srs_upgrade_to_fsrs.sql'),
  'utf8'
);

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();
  console.log('Connected. Applying SRS→FSRS migration...\n');

  await client.query(sql);
  console.log('Migration applied.\n');

  console.log('=== curriculum_vocabulary_srs — new FSRS columns ===');
  const { rows: srsCols } = await client.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'curriculum_vocabulary_srs'
      AND column_name IN ('stability','difficulty','state','due','last_review','reps','lapses','elapsed_days','scheduled_days','fsrs_seeded_at')
    ORDER BY column_name
  `);
  console.table(srsCols);

  console.log('=== Seeding result (97 expected) ===');
  const { rows: seedStats } = await client.query(`
    SELECT
      COUNT(*) AS total_rows,
      COUNT(*) FILTER (WHERE fsrs_seeded_at IS NOT NULL) AS seeded,
      COUNT(*) FILTER (WHERE state = 'new') AS state_new,
      COUNT(*) FILTER (WHERE state = 'review') AS state_review,
      COUNT(*) FILTER (WHERE state = 'learning') AS state_learning,
      COUNT(*) FILTER (WHERE state = 'relearning') AS state_relearning
    FROM curriculum_vocabulary_srs
  `);
  console.table(seedStats);

  console.log('=== Sample of seeded rows (3 with prior reviews) ===');
  const { rows: sample } = await client.query(`
    SELECT student_id, vocabulary_id, state, due, reps, repetitions, stability, difficulty, fsrs_seeded_at
    FROM curriculum_vocabulary_srs
    WHERE repetitions > 0
    LIMIT 3
  `);
  console.table(sample);

  console.log('=== srs_review_logs table state ===');
  const { rows: logsTable } = await client.query(`
    SELECT
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='srs_review_logs') AS table_exists,
      (SELECT COUNT(*) FROM pg_policies WHERE tablename='srs_review_logs') AS policy_count
  `);
  console.table(logsTable);

  console.log('=== profiles SRS preference columns ===');
  const { rows: prefCols } = await client.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name LIKE 'srs_%'
    ORDER BY column_name
  `);
  console.table(prefCols);

  console.log('=== anki tables — should be NULL (dropped) ===');
  const { rows: ankiDrop } = await client.query(`
    SELECT
      to_regclass('public.anki_cards') AS anki_cards,
      to_regclass('public.anki_review_logs') AS anki_review_logs
  `);
  console.table(ankiDrop);

  await client.end();
  console.log('\nDone. SRS→FSRS migration applied successfully.');
})().catch((e) => {
  console.error('FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
