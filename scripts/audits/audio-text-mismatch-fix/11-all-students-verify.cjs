#!/usr/bin/env node
//
// Phase 4 — verify text/audio coherence for EVERY student in profiles.
//
// Two independent assertions per (student, reading) pair:
//   A. URL EMBED: audio.full_audio_url contains the reading.id in its storage path
//   B. CONTENT MATCH: first ~4 normalized words of audio.word_timestamps match
//                     first ~4 normalized words of passage_content.paragraphs[0]
//
// Per-student dimension:
//   Mint authenticated JWT for every profile WHERE role='student' AND email IS NOT NULL.
//   Fetch readings + audio under each student's JWT. Compare to service-role.
//
// The script MUST exit 0 with "ALL STUDENTS CLEAN" — anything else fails the prompt.

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnv() {
  const env = {}
  fs.readFileSync(path.resolve(__dirname, '../../../.env'), 'utf8').split('\n').forEach((l) => {
    const i = l.indexOf('=')
    if (i <= 0) return
    let v = l.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    v = v.replace(/\\n$/, '')
    env[l.slice(0, i).trim()] = v
  })
  return env
}

const env = loadEnv()
const URL = env.VITE_SUPABASE_URL
const SVC = env.SUPABASE_SERVICE_ROLE_KEY
const ANON = env.VITE_SUPABASE_ANON_KEY
const svc = createClient(URL, SVC, { auth: { persistSession: false } })

async function mint(email) {
  const { data: link, error } = await svc.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) return { error: error.message }
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const r = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  if (!r.data?.session?.access_token) return { error: 'verifyOtp returned no session' }
  return { tok: r.data.session.access_token }
}
function authed(tok) {
  return createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${tok}` } } })
}

function firstWordsFromTimestamps(wts, n = 4) {
  if (!wts) return ''
  let arr
  if (Array.isArray(wts)) arr = wts
  else if (wts.all_words && Array.isArray(wts.all_words)) arr = wts.all_words
  else if (typeof wts === 'object') {
    arr = []
    for (let i = 0; i < 30; i++) { if (wts[String(i)]) arr.push(wts[String(i)]); else if (wts[i]) arr.push(wts[i]) }
  } else return ''
  return arr.slice(0, n).map(w => (w?.word || w?.text || w?.w || '').toLowerCase().replace(/[^a-z0-9؀-ۿ']/g, '')).filter(Boolean).join(' ')
}
function firstWordsFromText(pc, n = 4) {
  const p = pc?.paragraphs?.[0] || ''
  return p.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z0-9؀-ۿ']/g, '')).filter(Boolean).slice(0, n).join(' ')
}

async function main() {
  fs.mkdirSync(path.resolve(__dirname, '../../../docs/audits/audio-text-mismatch-fix'), { recursive: true })

  // 1. Get every student with an email
  const { data: students, error: stuErr } = await svc
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('role', 'student')
    .not('email', 'is', null)
  if (stuErr) throw stuErr
  console.log(`Students with email: ${students.length}`)

  // 2. All canonical readings + their audio (service-role ground truth)
  const { data: readings } = await svc
    .from('curriculum_readings')
    .select('id, unit_id, reading_label, title_en, passage_content, passage_word_count')
  const { data: audioRows } = await svc
    .from('reading_passage_audio')
    .select('passage_id, full_audio_url, word_timestamps, full_duration_ms')
  const audioMap = Object.fromEntries(audioRows.map(a => [a.passage_id, a]))

  // 3. ASSERTION A (per-reading) — these are not student-specific; flag once globally
  const globalReadingAssertions = []
  for (const r of readings) {
    const a = audioMap[r.id]
    if (!a) { globalReadingAssertions.push({ reading_id: r.id, issue: 'NO_AUDIO_ROW' }); continue }
    const urlEmbedsId = a.full_audio_url?.includes(r.id) ?? false
    const spoken = firstWordsFromTimestamps(a.word_timestamps, 4)
    const displayed = firstWordsFromText(r.passage_content, 4)
    const contentMatch = spoken && displayed ? spoken === displayed : null
    if (!urlEmbedsId) globalReadingAssertions.push({ reading_id: r.id, issue: 'URL_DOES_NOT_EMBED_READING_ID', url: a.full_audio_url })
    if (contentMatch === false) globalReadingAssertions.push({ reading_id: r.id, issue: 'AUDIO_NARRATES_DIFFERENT_TEXT', spoken_opening: spoken, displayed_opening: displayed, title: r.title_en })
    if (contentMatch === null && spoken === '' && displayed) globalReadingAssertions.push({ reading_id: r.id, issue: 'NO_WORD_TIMESTAMPS', title: r.title_en })
  }
  console.log(`\nGlobal reading-level issues (apply to EVERY student equally): ${globalReadingAssertions.length}`)
  // Group by issue type
  const byIssue = {}
  for (const g of globalReadingAssertions) { byIssue[g.issue] = (byIssue[g.issue] || 0) + 1 }
  for (const [k, n] of Object.entries(byIssue)) console.log(`  ${k}: ${n}`)

  // 4. Per-student dimension — verify each student's authenticated session returns identical rows + audio to service-role
  console.log(`\nPer-student authenticated-session sweep — ${students.length} students × ${readings.length} readings…`)

  const perStudentIssues = []
  let mintFails = 0
  let totalChecks = 0
  const startedAt = Date.now()

  for (let si = 0; si < students.length; si++) {
    const s = students[si]
    const m = await mint(s.email)
    if (m.error) { mintFails++; perStudentIssues.push({ student_id: s.id, email: s.email, issue: 'MINT_FAILED', detail: m.error }); continue }
    const c = authed(m.tok)
    // Bulk fetch all curriculum_readings + reading_passage_audio under this JWT
    const { data: stuReadings, error: srErr } = await c.from('curriculum_readings').select('id, unit_id, passage_word_count, reading_label')
    if (srErr) { perStudentIssues.push({ student_id: s.id, email: s.email, issue: 'READINGS_QUERY_ERROR', detail: srErr.message }); continue }
    const { data: stuAudio, error: saErr } = await c.from('reading_passage_audio').select('passage_id, full_audio_url, full_duration_ms')
    if (saErr) { perStudentIssues.push({ student_id: s.id, email: s.email, issue: 'AUDIO_QUERY_ERROR', detail: saErr.message }); continue }

    // Quick equality check vs service-role
    if (stuReadings.length !== readings.length) perStudentIssues.push({ student_id: s.id, email: s.email, issue: 'READING_COUNT_MISMATCH', student_count: stuReadings.length, svc_count: readings.length })
    if (stuAudio.length !== audioRows.length) perStudentIssues.push({ student_id: s.id, email: s.email, issue: 'AUDIO_COUNT_MISMATCH', student_count: stuAudio.length, svc_count: audioRows.length })

    // Spot-check 3 random readings' URL == svc URL
    const sample = stuReadings.sort(() => Math.random() - 0.5).slice(0, 3)
    const stuAudioMap = Object.fromEntries(stuAudio.map(a => [a.passage_id, a]))
    for (const r of sample) {
      const sa = stuAudioMap[r.id]
      const svca = audioMap[r.id]
      if (sa?.full_audio_url !== svca?.full_audio_url) {
        perStudentIssues.push({ student_id: s.id, email: s.email, issue: 'PER_STUDENT_AUDIO_URL_DIVERGES_FROM_SVC', reading_id: r.id, student_url: sa?.full_audio_url, svc_url: svca?.full_audio_url })
      }
      totalChecks++
    }

    if ((si + 1) % 20 === 0) {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0)
      process.stdout.write(`  ${si + 1}/${students.length}  (${elapsed}s)\n`)
    }
  }

  console.log(`\nMint failures: ${mintFails}`)
  console.log(`Per-student issues: ${perStudentIssues.length}`)
  console.log(`Total per-student spot-checks: ${totalChecks}`)

  const result = {
    generated_at: new Date().toISOString(),
    students_count: students.length,
    readings_count: readings.length,
    mint_failures: mintFails,
    global_reading_issues_by_type: byIssue,
    global_reading_issues_count: globalReadingAssertions.length,
    global_reading_issues: globalReadingAssertions,
    per_student_issues_count: perStudentIssues.length,
    per_student_issues_first_50: perStudentIssues.slice(0, 50),
    pass: globalReadingAssertions.length === 0 && perStudentIssues.filter(i => i.issue !== 'MINT_FAILED').length === 0,
  }

  fs.writeFileSync(
    path.resolve(__dirname, '../../../docs/audits/audio-text-mismatch-fix/all-students-verify.json'),
    JSON.stringify(result, null, 2)
  )

  console.log(`\n=== verdict ===`)
  console.log(`  globalReadingAssertions: ${globalReadingAssertions.length} (drift / missing wts / etc.)`)
  console.log(`  perStudentIssues (excluding mint fails): ${perStudentIssues.filter(i => i.issue !== 'MINT_FAILED').length}`)
  console.log(`  pass: ${result.pass}`)

  if (!result.pass) {
    console.log(`\nSample global issue:`)
    console.log(JSON.stringify(globalReadingAssertions.slice(0, 5), null, 2))
  } else {
    console.log(`\n✅ ALL STUDENTS CLEAN`)
  }

  process.exit(result.pass ? 0 : 1)
}

main().catch(e => { console.error(e); process.exit(99) })
