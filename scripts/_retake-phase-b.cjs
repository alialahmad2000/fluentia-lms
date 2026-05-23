#!/usr/bin/env node
/**
 * MOCK-EXAM-RETAKE — Phase B
 *
 * Calls mock_exam_archive_and_reset for each attempt classified as
 * NEEDS_RETAKE or CRON_AUTO_SUBMITTED_EMPTY in Phase A.
 *
 * Strict criteria re-checked here (defense in depth — the script is
 * intentionally re-running the predicate rather than trusting the
 * Phase A output file, so nothing real-result can slip through).
 */
const fs = require('fs')
const env = {}
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && v.length) {
    let val = v.join('=').trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    val = val.replace(/\\n$/, '')
    env[k.trim()] = val
  }
})
const { createClient } = require('@supabase/supabase-js')
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const REASON = 'retake_after_save_chain_fix_2026-05-23'

async function main() {
  console.log('=== Phase B — Archive NEEDS_RETAKE attempts ===\n')

  const { data: attempts, error } = await admin
    .from('mock_exam_attempts')
    .select('id, student_id, exam_id, is_submitted, is_auto_submitted, score_total, writing_word_count')
    .eq('is_submitted', true)
  if (error) throw error

  const studentIds = [...new Set(attempts.map(a => a.student_id))]
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, email, is_test_account')
    .in('id', studentIds)
  const profileById = new Map((profiles || []).map(p => [p.id, p]))

  const candidates = []
  for (const a of attempts) {
    const profile = profileById.get(a.student_id) || {}
    if (profile.is_test_account === true) continue
    const { count: realAnsCount } = await admin
      .from('mock_exam_answers')
      .select('id', { count: 'exact', head: true })
      .eq('attempt_id', a.id)
      .or('selected_index.not.is.null,and(text_answer.not.is.null,text_answer.neq.)')
    // Build the safer JS-side counting (PostgREST .or() doesn't always strip empty strings well).
    const { data: ans } = await admin
      .from('mock_exam_answers')
      .select('selected_index, text_answer')
      .eq('attempt_id', a.id)
    const withData = (ans || []).filter(r => r.selected_index !== null || (r.text_answer && r.text_answer.trim() !== '')).length
    const score = a.score_total ?? 0
    const ww = a.writing_word_count ?? 0

    let bucket = null
    if (withData < 5 && score <= 5) bucket = 'NEEDS_RETAKE'
    else if (withData === 0 && ww === 0 && a.is_auto_submitted === true) bucket = 'CRON_AUTO_SUBMITTED_EMPTY'

    if (bucket) candidates.push({ attempt_id: a.id, student_id: a.student_id, name: profile.full_name, email: profile.email, withData, score, bucket })
  }

  console.log(`Candidates to archive: ${candidates.length}`)
  candidates.forEach(c => {
    console.log(`  ${c.name} <${c.email}> attempt=${c.attempt_id} (real_answers=${c.withData}, score=${c.score}, bucket=${c.bucket})`)
  })

  if (!candidates.length) {
    console.log('\nNothing to archive — exiting.')
    fs.writeFileSync('docs/MOCK-EXAM-RETAKE-PHASE-B-RAW.json', JSON.stringify({ archived: [], skipped: [] }, null, 2))
    return
  }

  const results = []
  for (const c of candidates) {
    const { data, error: archErr } = await admin.rpc('mock_exam_archive_and_reset', {
      p_attempt_id: c.attempt_id,
      p_reason: REASON,
    })
    if (archErr) {
      console.log(`  ✗ FAILED ${c.name}: ${archErr.message}`)
      results.push({ ...c, archive_result: null, error: archErr.message })
    } else {
      console.log(`  ✓ Archived ${c.name}: ${JSON.stringify(data)}`)
      results.push({ ...c, archive_result: data })
    }
  }

  // Sanity: count active attempts for each archived student
  console.log('\nPost-archive sanity check (each archived student should have 0 active attempts):')
  for (const r of results) {
    const { count } = await admin
      .from('mock_exam_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', r.student_id)
    const ok = count === 0
    console.log(`  ${r.name}: active_attempts=${count}  ${ok ? '✓' : '✗ STILL HAS ACTIVE ROWS'}`)
  }

  fs.writeFileSync('docs/MOCK-EXAM-RETAKE-PHASE-B-RAW.json', JSON.stringify({ archived: results, reason: REASON, generated_at: new Date().toISOString() }, null, 2))
  console.log('\nResults → docs/MOCK-EXAM-RETAKE-PHASE-B-RAW.json')
}
main().catch(err => { console.error(err); process.exitCode = 1 })
