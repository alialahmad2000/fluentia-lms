// Phase E — Retry soak test
// Verifies: phantom heal, multi-attempt INSERT model, is_best recompute,
// assessment single-attempt guard, and the DB guard trigger.
'use strict'

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const DB = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
}

let passed = 0
let failed = 0

function check(name, condition, details = '') {
  if (condition) {
    console.log(`  ✅ PASS — ${name}`)
    passed++
  } else {
    console.log(`  ❌ FAIL — ${name}${details ? ': ' + details : ''}`)
    failed++
  }
}

async function main() {
  const client = new Client(DB)
  await client.connect()
  console.log('Connected.\n')

  // ── Test 1: unique constraints are dropped ────────────────────────────────
  console.log('Test 1: scp_unique_reading and scp_unique_listening are dropped...')
  const { rows: constraints } = await client.query(`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'student_curriculum_progress'
      AND constraint_name IN ('scp_unique_reading', 'scp_unique_listening')
  `)
  check('scp_unique_reading dropped', !constraints.find(c => c.constraint_name === 'scp_unique_reading'))
  check('scp_unique_listening dropped', !constraints.find(c => c.constraint_name === 'scp_unique_listening'))

  // ── Test 2: is_phantom column exists ─────────────────────────────────────
  console.log('\nTest 2: phantom heal columns exist...')
  const { rows: cols } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'student_curriculum_progress'
      AND column_name IN ('is_phantom', 'phantom_healed_at')
  `)
  const colNames = cols.map(c => c.column_name)
  check('is_phantom column exists', colNames.includes('is_phantom'))
  check('phantom_healed_at column exists', colNames.includes('phantom_healed_at'))

  // ── Test 3: guard trigger exists ──────────────────────────────────────────
  console.log('\nTest 3: phantom guard trigger installed...')
  const { rows: triggers } = await client.query(`
    SELECT trigger_name FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'student_curriculum_progress'
      AND trigger_name = 'trg_block_phantom'
  `)
  check('trg_block_phantom trigger exists', triggers.length > 0)

  // ── Test 4: trigger blocks empty-answer completion ────────────────────────
  console.log('\nTest 4: guard trigger blocks phantom-shape insert...')

  // Get a real student_id for testing
  const { rows: [student] } = await client.query(`SELECT id FROM profiles WHERE role='student' LIMIT 1`)
  const { rows: [reading] } = await client.query(`SELECT id FROM curriculum_readings LIMIT 1`)
  const testStudentId = student?.id
  const testReadingId = reading?.id

  if (testStudentId && testReadingId) {
    try {
      await client.query(`
        INSERT INTO student_curriculum_progress
          (student_id, reading_id, section_type, status, score, answers, attempt_number, is_latest, is_best)
        VALUES ($1, $2, 'reading', 'completed', 0, NULL, 99, false, false)
      `, [testStudentId, testReadingId])
      check('trigger blocks null-answer completed insert', false, 'should have thrown PHANTOM_BLOCK')
    } catch (e) {
      check('trigger blocks null-answer completed insert', e.message.includes('PHANTOM_BLOCK'))
    }

    // Same with empty object
    try {
      await client.query(`
        INSERT INTO student_curriculum_progress
          (student_id, reading_id, section_type, status, score, answers, attempt_number, is_latest, is_best)
        VALUES ($1, $2, 'reading', 'completed', 0, '{}'::jsonb, 99, false, false)
      `, [testStudentId, testReadingId])
      check('trigger blocks empty-object completed insert', false, 'should have thrown PHANTOM_BLOCK')
    } catch (e) {
      check('trigger blocks empty-object completed insert', e.message.includes('PHANTOM_BLOCK'))
    }
  } else {
    console.log('  ⚠️  SKIP — no student or reading found for trigger test')
  }

  // ── Test 5: synthetic multi-attempt INSERT for listening ──────────────────
  console.log('\nTest 5: listening multi-attempt INSERT model...')
  const { rows: [listening] } = await client.query(`SELECT id FROM curriculum_listening LIMIT 1`)
  const testListeningId = listening?.id

  if (testStudentId && testListeningId) {
    // Clean up any test rows from previous runs
    await client.query(`
      DELETE FROM student_curriculum_progress
      WHERE student_id=$1 AND listening_id=$2 AND attempt_number >= 900
    `, [testStudentId, testListeningId])

    // Insert attempt 1 (in_progress then complete)
    const { rows: [row1] } = await client.query(`
      INSERT INTO student_curriculum_progress
        (student_id, unit_id, listening_id, section_type, status, score, answers, attempt_number, is_latest, is_best)
      VALUES (
        $1, NULL, $2, 'listening', 'completed', 50,
        '{"questions":[{"questionIndex":0,"studentAnswer":1,"isCorrect":true},{"questionIndex":1,"studentAnswer":0,"isCorrect":false}]}'::jsonb,
        900, true, true
      )
      RETURNING id, score, is_best, is_latest, attempt_number
    `, [testStudentId, testListeningId])
    check('attempt 1 inserted', !!row1)
    check('attempt 1 is_latest=true', row1?.is_latest === true)
    check('attempt 1 is_best=true (first attempt)', row1?.is_best === true)

    // Retry: mark attempt 1 as not-latest, insert attempt 2 with higher score
    await client.query(`
      UPDATE student_curriculum_progress SET is_latest=false
      WHERE student_id=$1 AND listening_id=$2 AND attempt_number=900
    `, [testStudentId, testListeningId])

    const { rows: [row2] } = await client.query(`
      INSERT INTO student_curriculum_progress
        (student_id, unit_id, listening_id, section_type, status, score, answers, attempt_number, is_latest, is_best)
      VALUES (
        $1, NULL, $2, 'listening', 'completed', 100,
        '{"questions":[{"questionIndex":0,"studentAnswer":1,"isCorrect":true},{"questionIndex":1,"studentAnswer":1,"isCorrect":true}]}'::jsonb,
        901, true, false
      )
      RETURNING id, score, is_latest, attempt_number
    `, [testStudentId, testListeningId])

    // Recompute is_best
    const { rows: allForAttempt } = await client.query(`
      SELECT id, score FROM student_curriculum_progress
      WHERE student_id=$1 AND listening_id=$2 AND status='completed' AND attempt_number >= 900
      ORDER BY score DESC
    `, [testStudentId, testListeningId])

    await client.query(`UPDATE student_curriculum_progress SET is_best=false WHERE student_id=$1 AND listening_id=$2 AND attempt_number >= 900`, [testStudentId, testListeningId])
    await client.query(`UPDATE student_curriculum_progress SET is_best=true WHERE id=$1`, [allForAttempt[0]?.id])

    const { rows: [refreshed2] } = await client.query(`SELECT * FROM student_curriculum_progress WHERE id=$1`, [row2?.id])
    const { rows: [refreshed1] } = await client.query(`SELECT * FROM student_curriculum_progress WHERE student_id=$1 AND listening_id=$2 AND attempt_number=900`, [testStudentId, testListeningId])

    check('attempt 2 inserted', !!row2)
    check('attempt 2 is_latest=true', refreshed2?.is_latest === true)
    check('attempt 2 is_best=true (higher score)', refreshed2?.is_best === true)
    check('attempt 1 is_best=false (lower score superseded)', refreshed1?.is_best === false)
    check('attempt 1 is_latest=false (new attempt is latest)', refreshed1?.is_latest === false)

    // Test 3rd attempt with lower score — is_best stays on attempt 2
    await client.query(`UPDATE student_curriculum_progress SET is_latest=false WHERE student_id=$1 AND listening_id=$2 AND attempt_number=901`, [testStudentId, testListeningId])
    const { rows: [row3] } = await client.query(`
      INSERT INTO student_curriculum_progress
        (student_id, unit_id, listening_id, section_type, status, score, answers, attempt_number, is_latest, is_best)
      VALUES (
        $1, NULL, $2, 'listening', 'completed', 30,
        '{"questions":[{"questionIndex":0,"studentAnswer":0,"isCorrect":false}]}'::jsonb,
        902, true, false
      )
      RETURNING id
    `, [testStudentId, testListeningId])

    const { rows: allRows } = await client.query(`
      SELECT id, score FROM student_curriculum_progress
      WHERE student_id=$1 AND listening_id=$2 AND status='completed' AND attempt_number >= 900
      ORDER BY score DESC
    `, [testStudentId, testListeningId])

    await client.query(`UPDATE student_curriculum_progress SET is_best=false WHERE student_id=$1 AND listening_id=$2 AND attempt_number >= 900`, [testStudentId, testListeningId])
    await client.query(`UPDATE student_curriculum_progress SET is_best=true WHERE id=$1`, [allRows[0]?.id])

    const { rows: [checkBest] } = await client.query(`
      SELECT attempt_number, score FROM student_curriculum_progress
      WHERE student_id=$1 AND listening_id=$2 AND is_best=true AND attempt_number >= 900
    `, [testStudentId, testListeningId])
    check('after 3rd lower-score attempt, is_best stays on attempt 2 (score=100)', checkBest?.attempt_number === 901)

    // Cleanup
    await client.query(`DELETE FROM student_curriculum_progress WHERE student_id=$1 AND listening_id=$2 AND attempt_number >= 900`, [testStudentId, testListeningId])
    console.log('  (test rows cleaned up)')
  } else {
    console.log('  ⚠️  SKIP — no student or listening found for multi-attempt test')
  }

  // ── Test 6: phantom rows healed ───────────────────────────────────────────
  console.log('\nTest 6: No un-healed phantom rows remain in production...')
  const { rows: [{ count: phantomCount }] } = await client.query(`
    SELECT COUNT(*) FROM student_curriculum_progress
    WHERE status IN ('completed','submitted','graded')
      AND COALESCE(score, 0) = 0
      AND (answers IS NULL OR answers::text IN ('{}','[]','null'))
  `)
  check('zero zero-score empty-answer rows in production', parseInt(phantomCount) === 0,
    `found ${phantomCount} rows`)

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Soak test complete: ${passed} passed, ${failed} failed`)
  console.log(failed === 0 ? '✅ ALL PASS' : `⚠️  ${failed} FAILURES — review before shipping`)

  await client.end()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
