/**
 * Apply VOCAB-PREMIUM Prompt 08 polish-prefs migration.
 * Idempotent — re-runnable.
 */
require('dotenv').config()
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const sql = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/20260521120000_vocab_polish_prefs.sql'),
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
  console.log('Connected. Applying vocab polish prefs migration...\n')
  await client.query(sql)
  console.log('Migration applied.\n')

  const { rows } = await client.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND column_name IN (
        'vocab_view_mode_default',
        'vocab_card_autoplay_audio',
        'vocab_tap_behavior',
        'vocab_onboarding_completed_at',
        'last_vocab_visit_at'
      )
    ORDER BY column_name
  `)
  console.log('=== New profile columns ===')
  console.table(rows)

  await client.end()
  console.log('\nDone.')
})().catch((e) => {
  console.error('FATAL:', e.message)
  process.exit(1)
})
