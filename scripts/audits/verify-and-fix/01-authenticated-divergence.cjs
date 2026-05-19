#!/usr/bin/env node
//
// Phase 1 — authenticated divergence test, with the same query the React
// tree actually runs (NOT a prompt-supplied placeholder).
//
// Test query (matches src/pages/student/curriculum/tabs/ReadingTab.jsx):
//   .from('curriculum_readings').select('*').eq('unit_id', $1).order('sort_order')
// Audio query (matches src/hooks/useReadingPassageAudio.js):
//   .from('reading_passage_audio').select('full_audio_url, full_duration_ms, word_timestamps, paragraph_audio, voice_id').eq('passage_id', $1).maybeSingle()
//
// Test plan:
//   1. Pick a student WITH user_interests (Layan) and the explicit Sara control.
//   2. Mint authenticated JWT for each via auth.admin.generateLink('magiclink') → verifyOtp.
//   3. For test unit 00ca3625... run BOTH queries (reading list + per-row audio)
//      under service-role AND under each student's session.
//   4. Field-by-field diff. The verdict that matters most: across the 2 students,
//      do they get the SAME reading.id at sort_order=0 + the SAME full_audio_url
//      for that reading?

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnv() {
  const env = {}
  fs.readFileSync(path.resolve(__dirname, '../../../.env'), 'utf8').split('\n').forEach((line) => {
    const idx = line.indexOf('=')
    if (idx <= 0) return
    let v = line.slice(idx + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    v = v.replace(/\\n$/, '')
    env[line.slice(0, idx).trim()] = v
  })
  return env
}

const env = loadEnv()
const URL = env.VITE_SUPABASE_URL
const SVC = env.SUPABASE_SERVICE_ROLE_KEY
const ANON = env.VITE_SUPABASE_ANON_KEY

const TEST_UNIT_ID = '00ca3625-46ee-4e38-95da-2255f522aff8'
const TEST_EMAIL_INTEREST = 'layan88700@gmail.com'
const CONTROL_EMAIL = 'sarashrahili22@gmail.com'

const svc = createClient(URL, SVC, { auth: { persistSession: false } })

async function mintSession(email) {
  const { data: link, error } = await svc.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw new Error(`generateLink(${email}) failed: ${error.message}`)
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const r = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  if (!r.data?.session?.access_token) throw new Error(`verifyOtp(${email}) failed`)
  return r.data.session
}

function authedClient(tok) {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${tok}` } },
  })
}

async function readingsFor(client) {
  return client
    .from('curriculum_readings')
    .select('*')
    .eq('unit_id', TEST_UNIT_ID)
    .order('sort_order')
}

async function audioFor(client, passage_id) {
  return client
    .from('reading_passage_audio')
    .select('full_audio_url, full_duration_ms, word_timestamps, paragraph_audio, voice_id')
    .eq('passage_id', passage_id)
    .maybeSingle()
}

function pickFields(row, fields) {
  const out = {}
  for (const f of fields) out[f] = row?.[f]
  return out
}

;(async () => {
  console.log(`Unit under test: ${TEST_UNIT_ID}`)
  console.log(`Test (has interests): ${TEST_EMAIL_INTEREST}`)
  console.log(`Control (no interests): ${CONTROL_EMAIL}`)

  // Confirm Sara really has no interests (else the control is invalid)
  const sara = await svc.from('profiles').select('id, email').eq('email', CONTROL_EMAIL).maybeSingle()
  if (!sara.data) throw new Error('control profile not found by email')
  const saraInterests = await svc.from('user_interests').select('user_id, interests, has_completed_survey').eq('user_id', sara.data.id).maybeSingle()
  console.log(`  control user_interests row: ${saraInterests.data ? JSON.stringify(saraInterests.data) : 'NONE'}`)

  // Mint
  const sessTest = await mintSession(TEST_EMAIL_INTEREST)
  const sessCtl = await mintSession(CONTROL_EMAIL)
  console.log(`  ✅ both sessions minted`)

  // Run the queries via 3 routes
  const svcRes = await readingsFor(svc)
  const testRes = await readingsFor(authedClient(sessTest.access_token))
  const ctlRes = await readingsFor(authedClient(sessCtl.access_token))

  if (svcRes.error || testRes.error || ctlRes.error) {
    console.log('errors:', svcRes.error, testRes.error, ctlRes.error)
  }

  // The columns that matter for the text/audio pairing
  const COMPARE_FIELDS = [
    'id', 'unit_id', 'reading_label', 'title_ar', 'title_en',
    'passage_word_count', 'passage_audio_url', 'audio_duration_seconds',
    'sort_order',
  ]

  const result = {
    generated_at: new Date().toISOString(),
    unit_id: TEST_UNIT_ID,
    article_counts: {
      service: svcRes.data?.length || 0,
      test: testRes.data?.length || 0,
      control: ctlRes.data?.length || 0,
    },
    per_article: [],
    cross_student_diffs: [],
    audio_path_check: [],
  }

  const svcByOrder = new Map((svcRes.data || []).map(r => [r.sort_order, r]))
  const testByOrder = new Map((testRes.data || []).map(r => [r.sort_order, r]))
  const ctlByOrder = new Map((ctlRes.data || []).map(r => [r.sort_order, r]))

  for (const so of svcByOrder.keys()) {
    const s = svcByOrder.get(so)
    const t = testByOrder.get(so)
    const c = ctlByOrder.get(so)

    const slim = (row) => pickFields(row, COMPARE_FIELDS)

    const test_vs_svc = COMPARE_FIELDS.filter(f => s[f] !== t?.[f])
    const ctl_vs_svc = COMPARE_FIELDS.filter(f => s[f] !== c?.[f])
    const test_vs_ctl = COMPARE_FIELDS.filter(f => t?.[f] !== c?.[f])

    // Now check the audio table for the same passage id under all 3 roles
    const aSvc = await audioFor(svc, s.id)
    const aTest = await audioFor(authedClient(sessTest.access_token), s.id)
    const aCtl = await audioFor(authedClient(sessCtl.access_token), s.id)

    const audioFields = ['full_audio_url', 'full_duration_ms', 'voice_id']
    const aDiffTest = audioFields.filter(f => aSvc.data?.[f] !== aTest.data?.[f])
    const aDiffCtl = audioFields.filter(f => aSvc.data?.[f] !== aCtl.data?.[f])

    // Does the audio URL embed the article id? (defensive — confirms not swapped)
    const urlEmbedsId = aSvc.data?.full_audio_url?.includes(s.id) ?? false

    const per = {
      sort_order: so,
      reading_id: s.id,
      title_en: s.title_en,
      passage_audio_url: s.passage_audio_url,
      full_audio_url_from_audio_table: aSvc.data?.full_audio_url,
      url_in_two_tables_matches: s.passage_audio_url === aSvc.data?.full_audio_url,
      url_embeds_reading_id: urlEmbedsId,
      test_vs_svc_diff_fields: test_vs_svc,
      ctl_vs_svc_diff_fields: ctl_vs_svc,
      test_vs_ctl_diff_fields: test_vs_ctl,
      audio_diff_test_vs_svc: aDiffTest,
      audio_diff_ctl_vs_svc: aDiffCtl,
      service_row: slim(s),
      test_row: slim(t),
      control_row: slim(c),
    }
    result.per_article.push(per)

    if (test_vs_ctl.length > 0) {
      result.cross_student_diffs.push({
        sort_order: so,
        fields: test_vs_ctl,
        test_id: t?.id,
        ctl_id: c?.id,
        test_audio: t?.passage_audio_url,
        ctl_audio: c?.passage_audio_url,
      })
    }

    if (!urlEmbedsId) {
      result.audio_path_check.push({
        sort_order: so,
        reading_id: s.id,
        full_audio_url: aSvc.data?.full_audio_url,
        warning: 'audio_url does not embed reading_id',
      })
    }
  }

  // Cross-student summary
  const anyTestSvcDiff = result.per_article.some(p => p.test_vs_svc_diff_fields.length > 0)
  const anyCtlSvcDiff = result.per_article.some(p => p.ctl_vs_svc_diff_fields.length > 0)
  const anyTestCtlDiff = result.cross_student_diffs.length > 0
  const allUrlsEmbedId = result.audio_path_check.length === 0

  result.verdict = {
    test_student_rows_differ_from_service: anyTestSvcDiff,
    control_student_rows_differ_from_service: anyCtlSvcDiff,
    test_student_rows_differ_from_control_student: anyTestCtlDiff,
    every_audio_url_embeds_its_reading_id: allUrlsEmbedId,
    pass: !anyTestSvcDiff && !anyCtlSvcDiff && !anyTestCtlDiff && allUrlsEmbedId,
  }

  fs.writeFileSync(
    path.resolve(__dirname, '../../../docs/audits/verify-and-fix/divergence.json'),
    JSON.stringify(result, null, 2)
  )

  console.log('\n=== verdict ===')
  for (const [k, v] of Object.entries(result.verdict)) {
    console.log(`  ${k}: ${v}`)
  }
  if (anyTestCtlDiff) {
    console.log('\nFirst diff:')
    console.log(JSON.stringify(result.cross_student_diffs[0], null, 2))
  }

  process.exit(result.verdict.pass ? 0 : 1)
})().catch(e => { console.error(e); process.exit(99) })
