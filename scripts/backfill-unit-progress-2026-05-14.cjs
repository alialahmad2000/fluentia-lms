/**
 * Idempotent backfill: recompute unit_progress for every (student, unit) pair
 * that has ANY activity rows in student_curriculum_progress or speaking_recordings.
 *
 * Runs via pg directly (not Supabase SDK) to avoid row-limit issues.
 * Safe to re-run — recompute_unit_progress_for() uses ON CONFLICT DO UPDATE.
 *
 * Usage: node scripts/backfill-unit-progress-2026-05-14.cjs
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const DB_CONFIG = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
}

async function run() {
  const client = new Client(DB_CONFIG)
  await client.connect()
  console.log('[backfill] Connected')

  const start = Date.now()
  let done = 0, errs = 0

  // Collect every distinct (student_id, unit_id) pair
  const { rows: pairs } = await client.query(`
    SELECT DISTINCT student_id, unit_id
    FROM student_curriculum_progress
    WHERE unit_id IS NOT NULL
    UNION
    SELECT DISTINCT student_id, unit_id
    FROM speaking_recordings
    WHERE unit_id IS NOT NULL
    ORDER BY student_id, unit_id
  `)

  console.log(`[backfill] Recomputing ${pairs.length} (student, unit) pairs...`)

  for (const { student_id, unit_id } of pairs) {
    try {
      await client.query(
        'SELECT recompute_unit_progress_for($1, $2)',
        [student_id, unit_id]
      )
      done++
      if (done % 50 === 0) console.log(`  ${done}/${pairs.length}...`)
    } catch (err) {
      errs++
      console.error(`  [error] ${student_id}/${unit_id}: ${err.message}`)
    }
  }

  // Sanity counts
  const { rows: [{ at100 }] } = await client.query(
    `SELECT COUNT(*) AS at100 FROM unit_progress WHERE percentage = 100`
  )
  const { rows: [{ total_rows }] } = await client.query(
    `SELECT COUNT(*) AS total_rows FROM unit_progress`
  )
  const { rows: [{ orphans }] } = await client.query(`
    SELECT COUNT(*) AS orphans
    FROM student_curriculum_progress scp
    LEFT JOIN unit_progress up ON up.student_id = scp.student_id AND up.unit_id = scp.unit_id
    WHERE scp.unit_id IS NOT NULL AND up.id IS NULL
  `)

  await client.end()

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log('\n─── BACKFILL SUMMARY ─────────────────')
  console.log(`  Pairs scanned:    ${pairs.length}`)
  console.log(`  Succeeded:        ${done - errs}`)
  console.log(`  Errors:           ${errs}`)
  console.log(`  unit_progress rows: ${total_rows}`)
  console.log(`  Pairs at 100%:    ${at100}`)
  console.log(`  Orphans (no row): ${orphans}`)
  console.log(`  Time:             ${elapsed}s`)

  // Save audit report
  const ts = new Date().toISOString().replace(/[:.]/g,'_').slice(0,19)
  const auditPath = path.join(__dirname,'..','docs','audits',`backfill-unit-progress-${ts}.md`)
  fs.mkdirSync(path.dirname(auditPath), { recursive: true })
  fs.writeFileSync(auditPath, [
    `# Backfill unit_progress — ${new Date().toISOString()}`,
    '',
    `| Metric | Value |`,
    `|---|---|`,
    `| Pairs | ${pairs.length} |`,
    `| Succeeded | ${done - errs} |`,
    `| Errors | ${errs} |`,
    `| Total rows | ${total_rows} |`,
    `| At 100% | ${at100} |`,
    `| Orphans | ${orphans} |`,
    `| Elapsed | ${elapsed}s |`,
  ].join('\n'))
  console.log(`  Report: ${auditPath}`)
}

run().catch(err => { console.error('[backfill] Fatal:', err.message); process.exit(1) })
