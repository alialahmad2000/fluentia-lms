// Phase A — Deeper phantom scan: check for null-selected answers in completed rows
'use strict'

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

async function main() {
  const client = new Client(DB_CONFIG)
  await client.connect()
  console.log('Connected to DB\n')

  const results = {}

  // ── Find Lian's student_id ──
  console.log('Looking for student "ليان" / Lian...')
  const { rows: lianRows } = await client.query(`
    SELECT p.id, p.full_name, p.role, u.email
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.full_name ILIKE '%ليان%'
       OR p.full_name ILIKE '%lian%'
       OR u.email ILIKE '%lian%'
    LIMIT 10
  `)
  results.lian_candidates = lianRows
  console.log('Lian candidates:', lianRows.map(r => `${r.full_name} (${r.email})`).join(', '))

  // ── Extended phantom: completed listening with null studentAnswer in answers ──
  console.log('\nChecking completed LISTENING rows for null-studentAnswer phantom pattern...')
  const { rows: listeningPhantoms } = await client.query(`
    SELECT id, student_id, listening_id, score, status, created_at, completed_at,
           answers, attempt_number, is_latest, is_best
    FROM student_curriculum_progress
    WHERE section_type = 'listening'
      AND status IN ('completed','submitted','graded')
    ORDER BY created_at DESC
    LIMIT 200
  `)

  // In JS: filter for rows where any question has studentAnswer = null
  const listeningPhantomsFiltered = listeningPhantoms.filter(row => {
    const qs = row.answers?.questions
    if (!qs || !Array.isArray(qs)) return false
    // Check if ALL answers are null (phantom) or if score is suspiciously low
    const allNull = qs.every(q => q.studentAnswer === null || q.studentAnswer === undefined)
    const anyNull = qs.some(q => q.studentAnswer === null || q.studentAnswer === undefined)
    return allNull || (row.score === 0 && anyNull)
  })
  results.listening_phantoms_extended = listeningPhantomsFiltered
  console.log(`  Found ${listeningPhantomsFiltered.length} completed listening rows with null answers`)
  listeningPhantomsFiltered.slice(0, 5).forEach(r => {
    const nullCount = (r.answers?.questions || []).filter(q => q.studentAnswer === null).length
    const total = (r.answers?.questions || []).length
    console.log(`    id=${r.id}, student=${r.student_id}, score=${r.score}, null_answers=${nullCount}/${total}, created=${r.created_at?.toISOString()?.slice(0,16)}`)
  })

  // ── Extended phantom: completed READING rows with low score ──
  console.log('\nChecking completed READING rows for phantom pattern...')
  const { rows: readingCompleted } = await client.query(`
    SELECT id, student_id, reading_id, score, status, created_at, completed_at, answers
    FROM student_curriculum_progress
    WHERE section_type = 'reading'
      AND status IN ('completed','submitted','graded')
      AND COALESCE(score, 0) = 0
    ORDER BY created_at DESC
    LIMIT 50
  `)
  results.reading_zero_score = readingCompleted
  console.log(`  Completed reading rows with score=0: ${readingCompleted.length}`)

  // ── Distribution of completed rows by section ──
  console.log('\nDistribution of all completed rows by section_type...')
  const { rows: sectionDist } = await client.query(`
    SELECT section_type,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE COALESCE(score,0) = 0) AS zero_score,
           AVG(score) FILTER (WHERE score IS NOT NULL) AS avg_score,
           MIN(score) FILTER (WHERE score IS NOT NULL) AS min_score
    FROM student_curriculum_progress
    WHERE status IN ('completed','submitted','graded')
    GROUP BY section_type
    ORDER BY total DESC
  `)
  results.section_distribution = sectionDist
  console.log('Section | Total | Zero-score | Avg score | Min score')
  sectionDist.forEach(r => {
    console.log(`  ${r.section_type?.padEnd(25)} | ${String(r.total).padStart(5)} | ${String(r.zero_score).padStart(10)} | ${r.avg_score ? Number(r.avg_score).toFixed(1) : 'N/A'} | ${r.min_score ?? 'N/A'}`)
  })

  // ── Check Lian's specific rows ──
  if (lianRows.length > 0) {
    const lianId = lianRows[0].id
    console.log(`\nLian's completed activities (student_id=${lianId}):`)
    const { rows: lianActivities } = await client.query(`
      SELECT id, section_type, status, score, created_at, completed_at, attempt_number, is_latest, is_best,
             answers
      FROM student_curriculum_progress
      WHERE student_id = $1
        AND status IN ('completed','submitted','graded')
      ORDER BY completed_at DESC
      LIMIT 50
    `, [lianId])
    results.lian_completed = lianActivities
    lianActivities.forEach(r => {
      const q = r.answers?.questions
      const nullCount = q ? q.filter(x => x.studentAnswer === null).length : '?'
      const totalQ = q ? q.length : '?'
      console.log(`  ${r.section_type?.padEnd(20)} | score=${r.score ?? 'null'} | attempt=${r.attempt_number} | nullAnswers=${nullCount}/${totalQ} | ${r.completed_at?.toISOString()?.slice(0,16)}`)
    })

    // In-progress rows with null answers (potential pre-phantom state)
    console.log(`\nLian's in_progress rows:`)
    const { rows: lianInProgress } = await client.query(`
      SELECT id, section_type, status, score, created_at, answers, attempt_number
      FROM student_curriculum_progress
      WHERE student_id = $1
        AND status = 'in_progress'
      ORDER BY created_at DESC
    `, [lianId])
    results.lian_in_progress = lianInProgress
    lianInProgress.forEach(r => {
      const q = r.answers?.questions
      const nullCount = q ? q.filter(x => x.studentAnswer === null).length : (r.answers ? JSON.stringify(r.answers).slice(0,80) : 'no answers')
      console.log(`  ${r.section_type?.padEnd(20)} | score=${r.score ?? 'null'} | attempt=${r.attempt_number} | answers_info=${nullCount}`)
    })
  }

  // ── Check for "null-selectedAnswer in listening" pattern more broadly ──
  console.log('\nAll completed listening rows in last 30 days:')
  const { rows: recentListening } = await client.query(`
    SELECT id, student_id, listening_id, score, status, created_at, completed_at,
           answers, attempt_number
    FROM student_curriculum_progress
    WHERE section_type = 'listening'
      AND status IN ('completed','submitted','graded')
      AND created_at > NOW() - INTERVAL '30 days'
    ORDER BY created_at DESC
    LIMIT 100
  `)
  const recentListeningPhantoms = recentListening.filter(row => {
    const qs = row.answers?.questions
    if (!qs || !Array.isArray(qs)) return false
    return qs.some(q => q.studentAnswer === null || q.studentAnswer === undefined)
  })
  results.recent_listening_with_null_answers = recentListeningPhantoms
  console.log(`  ${recentListening.length} completed listening rows in last 30 days`)
  console.log(`  ${recentListeningPhantoms.length} of those have null studentAnswer entries (phantom risk)`)
  recentListeningPhantoms.forEach(r => {
    const qs = r.answers?.questions || []
    const nullCount = qs.filter(q => q.studentAnswer === null).length
    console.log(`    student=${r.student_id}, score=${r.score}, nullAnswers=${nullCount}/${qs.length}, when=${r.created_at?.toISOString()?.slice(0,16)}`)
  })

  // ── Save ──
  const outDir = path.join(__dirname, '..', 'discovery')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(
    path.join(outDir, 'phantom-scan-deep.json'),
    JSON.stringify(results, null, 2)
  )
  console.log('\nDeep scan results saved to discovery/phantom-scan-deep.json')
  console.log('=== Done ===')

  await client.end()
}

main().catch(e => { console.error('Error:', e.message); process.exit(1) })
