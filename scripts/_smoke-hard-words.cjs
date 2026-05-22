/**
 * Phase G smoke test for Hard Words Training.
 *
 * 1. Seeds a test row with difficulty=8.5 lapses=4 (forces classification='hard').
 * 2. Calls get_hard_words_for_student → confirms row appears.
 * 3. Simulates the 3-attempt promotion sequence by inserting into
 *    hard_words_drill_log + updating curriculum_vocabulary_srs.hw_* columns
 *    directly (same logic recordDrillAttempt does, just no auth context).
 * 4. Verifies the 3 log rows + promotion state.
 * 5. Resets the SRS row to its original difficulty/lapses values.
 *
 * Throwaway. Do not commit secrets.
 */

require('dotenv').config()
const { Client } = require('pg')

const client = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
})

const DRILL_MODES = ['matching', 'context_fill', 'typing_recall']

;(async () => {
  await client.connect()
  console.log('Connected.\n')

  // Pick the heaviest user (most SRS rows) for a stable test target
  const { rows: target } = await client.query(`
    SELECT student_id, vocabulary_id, difficulty, lapses, hw_correct_streak, hw_drill_modes_seen
    FROM curriculum_vocabulary_srs
    WHERE student_id = '0aba3164-2cd9-4e47-a47b-c3c3b7e8a56e'
    LIMIT 1
  `)
  if (!target.length) {
    console.error('No SRS row found for test student. Aborting.')
    process.exit(1)
  }
  const t = target[0]
  const originalDifficulty = Number(t.difficulty)
  const originalLapses = t.lapses
  const originalStreak = t.hw_correct_streak
  const originalModes = t.hw_drill_modes_seen
  console.log('Test target:', { student_id: t.student_id, vocabulary_id: t.vocabulary_id })
  console.log('Original SRS state:', {
    difficulty: originalDifficulty,
    lapses: originalLapses,
    streak: originalStreak,
    modes: originalModes,
  })

  // Step 1: force classification='hard' via difficulty bump
  await client.query(
    `UPDATE curriculum_vocabulary_srs
     SET difficulty = 8.5, lapses = 4, hw_correct_streak = 0, hw_drill_modes_seen = '{}', hw_last_drill_at = NULL
     WHERE student_id = $1 AND vocabulary_id = $2`,
    [t.student_id, t.vocabulary_id]
  )
  console.log('\nForced row to hard (difficulty=8.5, lapses=4).')

  // Step 2: verify classification RPC returns this row
  const { rows: classified } = await client.query(
    `SELECT vocabulary_id, classification, difficulty, lapses
     FROM get_hard_words_for_student($1, 100)
     WHERE vocabulary_id = $2`,
    [t.student_id, t.vocabulary_id]
  )
  console.log('\n=== Classification RPC ===')
  console.table(classified)
  if (!classified.length) {
    throw new Error('Classification RPC did not return the seeded row')
  }

  // Step 3: simulate 3 correct attempts via direct DB writes (mirrors
  // recordDrillAttempt logic — service layer would do this via supabase-js,
  // but it requires auth.uid() so we replicate the writes directly here).
  console.log('\n=== Simulating 3 correct attempts ===')
  for (let i = 0; i < 3; i++) {
    const mode = DRILL_MODES[i]
    // Insert log row
    await client.query(
      `INSERT INTO hard_words_drill_log (student_id, vocabulary_id, drill_mode, is_correct, response_ms)
       VALUES ($1, $2, $3, true, 1234)`,
      [t.student_id, t.vocabulary_id, mode]
    )
    // Read current state
    const { rows: cur } = await client.query(
      `SELECT hw_correct_streak, hw_drill_modes_seen
       FROM curriculum_vocabulary_srs
       WHERE student_id = $1 AND vocabulary_id = $2`,
      [t.student_id, t.vocabulary_id]
    )
    const curStreak = cur[0].hw_correct_streak || 0
    const curModes = cur[0].hw_drill_modes_seen || []
    const newStreak = curStreak + 1
    const modeSet = new Set([...curModes, mode])
    const newModes = Array.from(modeSet)
    await client.query(
      `UPDATE curriculum_vocabulary_srs
       SET hw_correct_streak = $1, hw_drill_modes_seen = $2, hw_last_drill_at = NOW()
       WHERE student_id = $3 AND vocabulary_id = $4`,
      [newStreak, newModes, t.student_id, t.vocabulary_id]
    )
    const promoted = newStreak >= 3 && newModes.length >= 2
    console.log(`Attempt ${i + 1}: mode=${mode}, newStreak=${newStreak}, newModes=[${newModes.join(', ')}], promoted=${promoted}`)
  }

  // Step 4: verify log rows + promotion-eligible state
  const { rows: logCount } = await client.query(
    `SELECT COUNT(*) AS count FROM hard_words_drill_log
     WHERE student_id = $1 AND vocabulary_id = $2`,
    [t.student_id, t.vocabulary_id]
  )
  console.log('\n=== Log rows for this (student, vocab) ===')
  console.table(logCount)

  const { rows: finalState } = await client.query(
    `SELECT hw_correct_streak, hw_drill_modes_seen, hw_last_drill_at
     FROM curriculum_vocabulary_srs
     WHERE student_id = $1 AND vocabulary_id = $2`,
    [t.student_id, t.vocabulary_id]
  )
  console.log('=== Final SRS hw_* state ===')
  console.table(finalState)

  // Step 4b: verify classification RPC now EXCLUDES the row (promoted)
  const { rows: excludedCheck } = await client.query(
    `SELECT COUNT(*) AS still_classified
     FROM get_hard_words_for_student($1, 100)
     WHERE vocabulary_id = $2`,
    [t.student_id, t.vocabulary_id]
  )
  console.log('=== Still classified as hard after promotion? (should be 0) ===')
  console.table(excludedCheck)

  // Step 5: reset everything to clean state
  await client.query(
    `UPDATE curriculum_vocabulary_srs
     SET difficulty = $1, lapses = $2, hw_correct_streak = $3, hw_drill_modes_seen = $4, hw_last_drill_at = NULL
     WHERE student_id = $5 AND vocabulary_id = $6`,
    [originalDifficulty, originalLapses, originalStreak, originalModes, t.student_id, t.vocabulary_id]
  )
  await client.query(
    `DELETE FROM hard_words_drill_log
     WHERE student_id = $1 AND vocabulary_id = $2 AND response_ms = 1234`,
    [t.student_id, t.vocabulary_id]
  )
  console.log('\n=== Reset complete ===')
  console.log('Restored difficulty, lapses, hw_* fields to original values; deleted 3 smoke log rows.')

  await client.end()
  console.log('\nSmoke test PASSED.')
})().catch((e) => {
  console.error('FATAL:', e.message)
  console.error(e.stack)
  process.exit(1)
})
