/**
 * Apply VOCAB-PREMIUM Prompt 04 — Hard Words Training migration.
 * Pattern mirrors scripts/_apply-srs-fsrs-migration.cjs (direct pg).
 *
 * Idempotent. Verifies columns, table, policies, RPCs deployed.
 */
require('dotenv').config()
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const sql = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/20260520180000_hard_words_training.sql'),
  'utf8'
)

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
})

;(async () => {
  await client.connect()
  console.log('Connected. Applying hard-words migration...\n')

  await client.query(sql)
  console.log('Migration applied.\n')

  console.log('=== New hw_* columns on curriculum_vocabulary_srs ===')
  const { rows: cols } = await client.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'curriculum_vocabulary_srs'
      AND column_name LIKE 'hw_%'
    ORDER BY column_name
  `)
  console.table(cols)

  console.log('=== hard_words_drill_log table state ===')
  const { rows: tableState } = await client.query(`
    SELECT
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='hard_words_drill_log') AS table_exists,
      (SELECT COUNT(*) FROM pg_policies WHERE tablename='hard_words_drill_log') AS policy_count,
      (SELECT COUNT(*) FROM hard_words_drill_log) AS row_count
  `)
  console.table(tableState)

  console.log('=== RPCs deployed ===')
  const { rows: rpcs } = await client.query(`
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name IN ('get_hard_words_for_student','get_hard_words_count','get_hard_words_breakdown')
    ORDER BY routine_name
  `)
  console.table(rpcs)

  console.log('=== Probe: hard words count for top 5 students by mastery rows ===')
  const { rows: probes } = await client.query(`
    SELECT
      s.student_id,
      COUNT(*) AS total_srs_rows,
      get_hard_words_count(s.student_id) AS hard_count
    FROM (
      SELECT DISTINCT student_id FROM curriculum_vocabulary_srs
    ) s
    JOIN curriculum_vocabulary_srs cvs ON cvs.student_id = s.student_id
    GROUP BY s.student_id
    ORDER BY total_srs_rows DESC
    LIMIT 5
  `)
  console.table(probes)

  await client.end()
  console.log('\nDone.')
})().catch((e) => {
  console.error('FATAL:', e.message)
  console.error(e.stack)
  process.exit(1)
})
