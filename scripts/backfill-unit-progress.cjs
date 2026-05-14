/**
 * Backfill speaking progress rows for students who have speaking_recordings
 * but no completed student_curriculum_progress row for section_type='speaking'.
 *
 * Idempotent: safe to re-run. Only INSERTs; never deletes or modifies existing rows.
 *
 * Usage: node scripts/backfill-unit-progress.cjs
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
  console.log('[backfill] Connected to DB')

  const start = Date.now()
  const report = {
    scanned: 0,
    inserted: 0,
    skipped: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  }

  // ─── Bug 2: Speaking recordings without progress row ──────────────────────────
  console.log('[backfill] Scanning speaking_recordings for missing progress rows...')

  const { rows: speakingGaps } = await client.query(`
    SELECT DISTINCT sr.student_id, sr.unit_id, MAX(sr.created_at) AS latest_rec_at
    FROM speaking_recordings sr
    WHERE NOT EXISTS (
      SELECT 1 FROM student_curriculum_progress scp
      WHERE scp.student_id = sr.student_id
        AND scp.unit_id = sr.unit_id
        AND scp.section_type = 'speaking'
        AND scp.status = 'completed'
    )
    GROUP BY sr.student_id, sr.unit_id
  `)

  console.log(`[backfill] Found ${speakingGaps.length} (student, unit) pair(s) missing a speaking progress row`)
  report.scanned += speakingGaps.length

  for (const row of speakingGaps) {
    const { student_id, unit_id, latest_rec_at } = row
    try {
      // Double-check: does a completed row already exist? (race-condition guard)
      const { rows: existing } = await client.query(`
        SELECT id FROM student_curriculum_progress
        WHERE student_id = $1 AND unit_id = $2 AND section_type = 'speaking' AND status = 'completed'
        LIMIT 1
      `, [student_id, unit_id])

      if (existing.length > 0) {
        console.log(`  [skip] ${student_id} / ${unit_id} — row already exists`)
        report.skipped++
        continue
      }

      await client.query(`
        INSERT INTO student_curriculum_progress
          (student_id, unit_id, section_type, status, completed_at, is_best, is_latest)
        VALUES ($1, $2, 'speaking', 'completed', $3, true, true)
      `, [student_id, unit_id, latest_rec_at])

      console.log(`  [insert] speaking progress for student ${student_id} / unit ${unit_id}`)
      report.inserted++
    } catch (err) {
      console.error(`  [error] ${student_id} / ${unit_id}:`, err.message)
      report.errors.push({ student_id, unit_id, error: err.message })
    }
  }

  // ─── Bug 3: Listening stuck in limbo — reset hasSaved-deadlocked rows ────────
  console.log('[backfill] Scanning listening rows stuck in limbo (in_progress with non-null answers)...')

  const { rows: listeningLimbo } = await client.query(`
    SELECT id, student_id, unit_id, listening_id, answers, attempt_number
    FROM student_curriculum_progress
    WHERE section_type = 'listening'
      AND status = 'in_progress'
      AND answers IS NOT NULL
      AND answers != '{}'::jsonb
      AND answers ? 'questions'
      AND (
        SELECT COUNT(*) FROM jsonb_array_elements(answers->'questions') q
        WHERE q->>'studentAnswer' IS NOT NULL AND q->>'studentAnswer' != 'null'
      ) > 0
  `)

  console.log(`[backfill] Found ${listeningLimbo.length} listening row(s) with answers but stuck in_progress`)
  report.scanned += listeningLimbo.length

  for (const row of listeningLimbo) {
    const { id, answers } = row
    try {
      // Skip rows whose student has no students record (e.g. admin/test accounts)
      // because triggers like trg_feed_section_completed write to activity_feed
      // with a FK to students.id — they will fail for non-student profiles.
      const { rows: studentCheck } = await client.query(`
        SELECT id FROM students WHERE id = $1 LIMIT 1
      `, [row.student_id])
      if (studentCheck.length === 0) {
        console.log(`  [skip] listening row ${id} — student ${row.student_id} has no students record (admin/test?)`)
        report.skipped++
        continue
      }

      // Compute score from saved answers
      const questions = answers.questions || []
      const answered = questions.filter(q => q.studentAnswer !== null && q.studentAnswer !== 'null')
      const correct = answered.filter(q => q.isCorrect).length
      const total = answered.length
      const score = total > 0 ? Math.round((correct / total) * 100) : 0

      // Check if there's already a completed row for this student+listening
      const { rows: existing } = await client.query(`
        SELECT id FROM student_curriculum_progress
        WHERE student_id = $1 AND listening_id = $2 AND status = 'completed'
        LIMIT 1
      `, [row.student_id, row.listening_id])

      if (existing.length > 0) {
        // Mark this limbo row as abandoned
        await client.query(`
          UPDATE student_curriculum_progress
          SET status = 'abandoned', is_latest = false, is_best = false
          WHERE id = $1
        `, [id])
        console.log(`  [abandoned] limbo row ${id} — completed row exists`)
        report.inserted++
      } else {
        // Graduate this row to completed
        await client.query(`
          UPDATE student_curriculum_progress
          SET status = 'completed',
              score = $2,
              completed_at = NOW(),
              is_best = true,
              is_latest = true
          WHERE id = $1
        `, [id, score])
        console.log(`  [completed] graduated limbo row ${id} with score ${score}%`)
        report.inserted++
      }
    } catch (err) {
      console.error(`  [error] listening row ${id}:`, err.message)
      report.errors.push({ id, error: err.message })
    }
  }

  await client.end()

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  report.elapsed_seconds = parseFloat(elapsed)

  console.log('\n─── BACKFILL SUMMARY ───────────────────────────────')
  console.log(`  Scanned:  ${report.scanned}`)
  console.log(`  Inserted: ${report.inserted}`)
  console.log(`  Skipped:  ${report.skipped}`)
  console.log(`  Errors:   ${report.errors.length}`)
  console.log(`  Time:     ${elapsed}s`)
  if (report.errors.length) {
    console.log('  Errors detail:', JSON.stringify(report.errors, null, 2))
  }

  // Save audit report
  const auditDir = path.join(__dirname, '..', 'docs', 'audits')
  if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const auditPath = path.join(auditDir, `backfill-unit-progress-${ts}.md`)
  fs.writeFileSync(auditPath, `# Backfill Unit Progress — ${report.timestamp}\n\n` +
    `| | |\n|---|---|\n` +
    `| Scanned | ${report.scanned} |\n` +
    `| Inserted/Fixed | ${report.inserted} |\n` +
    `| Skipped | ${report.skipped} |\n` +
    `| Errors | ${report.errors.length} |\n` +
    `| Elapsed | ${elapsed}s |\n\n` +
    (report.errors.length ? `## Errors\n\`\`\`json\n${JSON.stringify(report.errors, null, 2)}\n\`\`\`\n` : '')
  )
  console.log(`  Report saved: ${auditPath}`)
}

run().catch(err => {
  console.error('[backfill] Fatal error:', err)
  process.exit(1)
})
