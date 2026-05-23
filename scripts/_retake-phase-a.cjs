#!/usr/bin/env node
/**
 * MOCK-EXAM-RETAKE — Phase A
 *
 * A.1 classify every submitted real-student attempt (NEEDS_RETAKE / REAL_RESULT / CRON_EMPTY)
 * A.2 verify SECURITY DEFINER on the 5 critical RPCs
 * A.3 smoke test save_answer end-to-end as the mock-test-a1 user
 *
 * READ-ONLY for the production data (only the smoke test creates + tears down a
 * scratch attempt for the synthetic test account).
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

const URL = env.VITE_SUPABASE_URL
const SR  = env.SUPABASE_SERVICE_ROLE_KEY
const ANON = env.VITE_SUPABASE_ANON_KEY
if (!URL || !SR || !ANON) { console.error('missing env'); process.exit(1) }

const admin = createClient(URL, SR, { auth: { persistSession: false } })
const findings = { generated_at: new Date().toISOString() }

function section(title) {
  console.log('\n' + '='.repeat(70))
  console.log(title)
  console.log('='.repeat(70))
}

async function A1_classify() {
  section('A.1 — Classify every submitted attempt')

  const { data: attempts, error } = await admin
    .from('mock_exam_attempts')
    .select('id, student_id, exam_id, is_submitted, is_auto_submitted, submitted_at, started_at, score_total, writing_word_count, writing_response')
    .eq('is_submitted', true)
  if (error) { console.error(error.message); return [] }

  const studentIds = [...new Set(attempts.map(a => a.student_id))]
  const examIds    = [...new Set(attempts.map(a => a.exam_id))]

  const [{ data: profiles }, { data: exams }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, role, is_test_account').in('id', studentIds),
    admin.from('mock_exams').select('id, code').in('id', examIds),
  ])
  const profileById = new Map((profiles || []).map(p => [p.id, p]))
  const examById = new Map((exams || []).map(e => [e.id, e]))

  // For each attempt: count answers and answers_with_data
  const rows = []
  for (const a of attempts) {
    const { data: ans, error: ansErr } = await admin
      .from('mock_exam_answers')
      .select('id, selected_index, text_answer')
      .eq('attempt_id', a.id)
    if (ansErr) console.error('answer fetch error for', a.id, ansErr.message)
    const total = (ans || []).length
    const withData = (ans || []).filter(r =>
      r.selected_index !== null
      || (r.text_answer !== null && r.text_answer.trim() !== '')
    ).length

    const profile = profileById.get(a.student_id) || {}
    const exam = examById.get(a.exam_id) || {}

    let bucket
    if (profile.is_test_account) bucket = 'TEST_ACCOUNT_IGNORE'
    else if (withData < 5 && (a.score_total ?? 0) <= 5) bucket = 'NEEDS_RETAKE'
    else if (withData === 0 && (a.writing_word_count ?? 0) === 0 && a.is_auto_submitted === true) bucket = 'CRON_AUTO_SUBMITTED_EMPTY'
    else bucket = 'REAL_RESULT'

    rows.push({
      attempt_id: a.id,
      student_id: a.student_id,
      student_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      is_test_account: profile.is_test_account,
      exam_code: exam.code,
      started_ksa: a.started_at,
      submitted_ksa: a.submitted_at,
      is_auto_submitted: a.is_auto_submitted,
      score_total: a.score_total,
      writing_word_count: a.writing_word_count,
      writing_chars: (a.writing_response || '').length,
      answers_total: total,
      answers_with_data: withData,
      bucket,
    })
  }

  rows.sort((a, b) => a.answers_with_data - b.answers_with_data || (a.student_name || '').localeCompare(b.student_name || '', 'ar'))

  rows.forEach(r => {
    console.log(
      `  ${(r.student_name || '?').padEnd(28)} | ${r.exam_code?.padEnd(20) || ''} | role=${r.role} test=${r.is_test_account}`
      + ` | ans=${r.answers_total}/${r.answers_with_data}_real | writing_words=${r.writing_word_count} chars=${r.writing_chars}`
      + ` | auto=${r.is_auto_submitted} | score=${r.score_total} | ${r.bucket}`
    )
  })

  const needs = rows.filter(r => r.bucket === 'NEEDS_RETAKE')
  const cronEmpty = rows.filter(r => r.bucket === 'CRON_AUTO_SUBMITTED_EMPTY')
  const real = rows.filter(r => r.bucket === 'REAL_RESULT')
  console.log(`\n  Buckets: NEEDS_RETAKE=${needs.length}  CRON_AUTO_SUBMITTED_EMPTY=${cronEmpty.length}  REAL_RESULT=${real.length}  TEST=${rows.length - needs.length - cronEmpty.length - real.length}`)
  console.log('\n  Students to RESET (NEEDS_RETAKE + CRON_AUTO_SUBMITTED_EMPTY):')
  ;[...needs, ...cronEmpty].forEach(r => console.log(`    - ${r.student_name} <${r.email}> attempt=${r.attempt_id} (${r.bucket})`))
  console.log('\n  Students NOT to touch (real results):')
  real.forEach(r => console.log(`    - ${r.student_name} <${r.email}> ans=${r.answers_with_data}, score=${r.score_total}`))

  findings.A1 = { rows, needs_retake_count: needs.length, cron_empty_count: cronEmpty.length, real_result_count: real.length }
  return [...needs, ...cronEmpty]
}

async function A2_securityDefiner() {
  section('A.2 — Verify SECURITY DEFINER on critical mock_exam RPCs')

  // Try via Supabase Management API (uses SUPABASE_ACCESS_TOKEN from .mcp.json env).
  // If unavailable, fall back to migration-file grep.
  const accessToken = (() => {
    try {
      const mcp = JSON.parse(fs.readFileSync('.mcp.json', 'utf8'))
      return mcp?.mcpServers?.supabase?.env?.SUPABASE_ACCESS_TOKEN
    } catch { return null }
  })()
  const projectRef = 'nmjexpuycmqcxuxljier'

  const targetRpcs = ['mock_exam_save_answer', 'mock_exam_save_writing', 'mock_exam_submit', 'mock_exam_start', 'mock_exam_admin_force_submit']

  if (accessToken) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `SELECT proname, prosecdef AS is_security_definer, proconfig AS search_path
                  FROM pg_proc
                  WHERE proname IN (${targetRpcs.map(s => `'${s}'`).join(',')})
                    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
                  ORDER BY proname`,
          read_only: true,
        }),
      })
      const text = await res.text()
      console.log('  Management API status:', res.status)
      console.log('  ' + text.replace(/\n/g, '\n  '))
      // Try to parse and verify
      try {
        const json = JSON.parse(text)
        const rows = Array.isArray(json) ? json : (json.data || json.result || [])
        const allDefiner = rows.every(r => r.is_security_definer === true)
        findings.A2 = { rows, all_security_definer: allDefiner, source: 'management_api' }
        if (allDefiner && rows.length === targetRpcs.length) console.log('\n  ✓ All 5 RPCs are SECURITY DEFINER')
        else console.log('\n  ✗ One or more RPCs are NOT SECURITY DEFINER — investigate')
        return
      } catch { /* fall through to file grep */ }
    } catch (e) {
      console.log('  Management API fetch failed:', e.message)
    }
  }

  // Fallback: migration file grep
  console.log('  Fallback: scanning migration files')
  const migs = fs.readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort()
  const out = {}
  for (const rpc of targetRpcs) {
    const matches = []
    for (const f of migs) {
      const src = fs.readFileSync('supabase/migrations/' + f, 'utf8')
      const re = new RegExp(`CREATE\\s+(OR\\s+REPLACE\\s+)?FUNCTION\\s+(public\\.)?${rpc}\\b`, 'i')
      if (re.test(src)) matches.push(f)
    }
    const latest = matches.sort().slice(-1)[0]
    if (!latest) { out[rpc] = { found: false }; console.log(`  ${rpc}: NOT FOUND`); continue }
    const src = fs.readFileSync('supabase/migrations/' + latest, 'utf8')
    // find the function block and check for SECURITY DEFINER between CREATE and the next $$
    const idx = src.search(new RegExp(`FUNCTION\\s+(public\\.)?${rpc}\\b`, 'i'))
    const body = src.slice(idx, idx + 2000)
    const hasDefiner = /SECURITY\s+DEFINER/i.test(body)
    out[rpc] = { found: true, latest_file: latest, security_definer: hasDefiner }
    console.log(`  ${rpc}: file=${latest} security_definer=${hasDefiner}`)
  }
  const allDefiner = Object.values(out).every(v => v.found && v.security_definer)
  findings.A2 = { source: 'file_grep', rpcs: out, all_security_definer: allDefiner }
  console.log(allDefiner ? '\n  ✓ All 5 RPCs are SECURITY DEFINER (migration file grep)' : '\n  ✗ At least one RPC lacks SECURITY DEFINER — investigate')
}

async function A3_smokeTest() {
  section('A.3 — Smoke test: save_answer as a non-admin user')

  const TEST_EMAIL = 'mock-test-a1@fluentia.academy'
  const TEST_PW    = 'MockTest2025!'

  // 1. Verify the test user exists
  const { data: testProfile } = await admin
    .from('profiles')
    .select('id, full_name, email, role, is_test_account')
    .eq('email', TEST_EMAIL)
    .maybeSingle()
  if (!testProfile) {
    console.log(`  ✗ Test user ${TEST_EMAIL} not found — cannot smoke test`)
    findings.A3 = { pass: false, reason: 'no_test_user' }
    return false
  }
  console.log(`  Test user: ${testProfile.full_name} (${testProfile.id}, is_test=${testProfile.is_test_account})`)

  // 2. Pre-clean: archive any existing active attempt for the test user so we start fresh.
  const { data: existing } = await admin
    .from('mock_exam_attempts')
    .select('id, is_submitted')
    .eq('student_id', testProfile.id)
  if (existing && existing.length) {
    for (const a of existing) {
      console.log('  Pre-clean: archiving existing test attempt ' + a.id)
      const { error: archErr } = await admin.rpc('mock_exam_archive_and_reset', {
        p_attempt_id: a.id,
        p_reason: 'smoke_test_pre_clean_2026-05-23',
      })
      if (archErr) console.log('    archive error (continuing anyway):', archErr.message)
    }
  }

  // 3. Sign in as the test user via anon client.
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PW })
  if (signInErr) {
    console.log('  ✗ Sign-in failed:', signInErr.message)
    findings.A3 = { pass: false, reason: 'sign_in_failed', error: signInErr.message }
    return false
  }
  const authed = createClient(URL, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
  })

  // 4. Start fresh attempt
  const { data: startRes, error: startErr } = await authed.rpc('mock_exam_start', { p_exam_code: 'midterm-mock-a1' })
  if (startErr) {
    console.log('  ✗ mock_exam_start failed:', startErr.message)
    findings.A3 = { pass: false, reason: 'start_failed', error: startErr.message }
    return false
  }
  const attemptId = startRes.attempt_id
  console.log('  ✓ mock_exam_start succeeded — attempt_id=' + attemptId)

  // 5. Save an answer (pick first MCQ from the returned question set)
  const firstMcq = (startRes.questions || []).find(q => q.question_type === 'mcq')
  if (!firstMcq) {
    console.log('  ✗ no MCQ found in returned questions')
    findings.A3 = { pass: false, reason: 'no_mcq' }
    return false
  }
  const { error: saveErr } = await authed.rpc('mock_exam_save_answer', {
    p_attempt_id: attemptId,
    p_question_id: firstMcq.id,
    p_selected_index: 1,
    p_text_answer: null,
  })
  if (saveErr) {
    console.log('  ✗ mock_exam_save_answer FAILED:', saveErr.message)
    findings.A3 = { pass: false, reason: 'save_failed', error: saveErr.message }
    return false
  }
  console.log('  ✓ mock_exam_save_answer returned no error')

  // 6. Verify the row landed (via service role — bypass RLS)
  const { data: persisted, error: persistedErr } = await admin
    .from('mock_exam_answers')
    .select('id, attempt_id, question_id, selected_index, text_answer')
    .eq('attempt_id', attemptId)
    .eq('question_id', firstMcq.id)
    .maybeSingle()
  if (persistedErr || !persisted) {
    console.log('  ✗ Row NOT persisted in mock_exam_answers — SAVE CHAIN IS BROKEN', persistedErr?.message)
    findings.A3 = { pass: false, reason: 'not_persisted' }
    return false
  }
  if (persisted.selected_index !== 1) {
    console.log('  ✗ Row persisted but selected_index mismatch:', persisted)
    findings.A3 = { pass: false, reason: 'wrong_data', persisted }
    return false
  }
  console.log('  ✓ Row persisted with selected_index=1 — save chain end-to-end OK')

  // 7. Cleanup — archive the smoke-test attempt so the test student starts clean for Ali
  const { error: cleanErr } = await admin.rpc('mock_exam_archive_and_reset', {
    p_attempt_id: attemptId,
    p_reason: 'smoke_test_cleanup_2026-05-23',
  })
  if (cleanErr) console.log('  (cleanup) archive error:', cleanErr.message)
  else console.log('  ✓ smoke-test attempt cleaned up')

  findings.A3 = { pass: true, attempt_id_tested: attemptId, question_id_tested: firstMcq.id }
  console.log('\n  >>>>> SMOKE TEST PASS: save chain is healthy, safe to proceed to Phase B <<<<<')
  return true
}

;(async () => {
  await A1_classify()
  await A2_securityDefiner()
  const ok = await A3_smokeTest()
  fs.writeFileSync('docs/MOCK-EXAM-RETAKE-PHASE-A-RAW.json', JSON.stringify(findings, null, 2))
  console.log('\nRaw findings → docs/MOCK-EXAM-RETAKE-PHASE-A-RAW.json')
  if (!ok) {
    console.log('\n*** Smoke test FAILED — DO NOT proceed to Phase B ***')
    process.exitCode = 2
  }
})()
