#!/usr/bin/env node
// Authenticated-student JWT impersonation comparison.
//
// 1. Pick a test student (has user_interests) and a control student (none).
// 2. Mint a real Supabase session for each via auth.admin.generateLink('magiclink')
//    then exchange the OTP for an access_token.
// 3. Run the SAME SELECT (`from('curriculum_readings').eq('unit_id',...)`)
//    via:
//      - service_role (RLS bypass) — "ground truth"
//      - authenticated test student JWT
//      - authenticated control student JWT
// 4. Diff field-by-field. Report rows_differ + sample.
//
// This is the dispositive check the previous audits skipped.

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnv() {
  const env = {}
  const text = fs.readFileSync(path.resolve(__dirname, '../../../.env'), 'utf8')
  text.split('\n').forEach((line) => {
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
const SVC = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY
const ANON = env.VITE_SUPABASE_ANON_KEY
if (!URL || !SVC || !ANON) { console.error('missing env (need VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VITE_SUPABASE_ANON_KEY)'); process.exit(1) }

const svc = createClient(URL, SVC, { auth: { persistSession: false } })

const COLUMNS = [
  'id', 'unit_id', 'reading_label', 'title_ar', 'title_en',
  'passage_word_count', 'passage_audio_url', 'audio_duration_seconds',
  'sort_order', 'is_published',
]

async function pickStudents() {
  // Test student: has interests
  const { data: ui } = await svc
    .from('user_interests')
    .select('user_id, interests, has_completed_survey')
    .eq('has_completed_survey', true)
    .limit(10)
  if (!ui || !ui.length) throw new Error('No students with completed interest survey')

  const testUserIds = ui.map(r => r.user_id)
  const { data: testProfiles } = await svc
    .from('profiles')
    .select('id, email, full_name, role')
    .in('id', testUserIds)
    .eq('role', 'student')
    .not('email', 'is', null)
  if (!testProfiles?.length) throw new Error('No student profiles found among interest-tagged users')

  // Control student: NO interests, role=student, email present
  const { data: allStudents } = await svc
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'student')
    .not('email', 'is', null)
    .limit(200)
  const interestUserIdSet = new Set(testUserIds)
  const control = (allStudents || []).find(p => !interestUserIdSet.has(p.id))
  if (!control) throw new Error('No control student (no-interests, role=student) found')

  return { test: testProfiles[0], control, interestedUserIds: testUserIds }
}

async function pickTestUnits(limit = 5) {
  // Multi-article units (≥ 2 readings each)
  const { data: rows } = await svc.from('curriculum_readings').select('unit_id')
  const counts = {}
  rows.forEach(r => { counts[r.unit_id] = (counts[r.unit_id] || 0) + 1 })
  return Object.entries(counts).filter(([, n]) => n >= 2).slice(0, limit).map(([u]) => u)
}

// Mint an authenticated session for a profile via auth.admin.generateLink + verifyOtp
async function mintSession(email) {
  const { data: link, error: linkErr } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkErr) throw new Error(`generateLink failed for ${email}: ${linkErr.message}`)

  // Extract hashed_token + email_otp from the action_link (Supabase returns these in properties)
  const props = link.properties
  if (!props) throw new Error('generateLink returned no properties for ' + email)

  // Try the modern path: hashed_token + verifyOtp({type: 'magiclink', token_hash, type})
  const tokenHash = props.hashed_token || props.token || props.email_otp
  if (!tokenHash) throw new Error('No usable token in generateLink response for ' + email)

  const anonClient = createClient(URL, ANON, { auth: { persistSession: false } })
  let session = null
  let lastErr = null
  // Try a few token+type combinations
  const attempts = [
    { token_hash: props.hashed_token, type: 'magiclink' },
    { token_hash: props.hashed_token, type: 'email' },
    { token: props.email_otp, type: 'email', email },
    { token: props.email_otp, type: 'magiclink', email },
  ].filter(a => a.token_hash || a.token)
  for (const a of attempts) {
    const r = await anonClient.auth.verifyOtp(a)
    if (r.data?.session?.access_token) { session = r.data.session; break }
    lastErr = r.error
  }
  if (!session) throw new Error(`verifyOtp failed for ${email}: ${lastErr?.message || 'unknown'}`)
  return session
}

function readingsAsAuthenticated(accessToken) {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

function diff(rowA, rowB) {
  const out = []
  for (const k of COLUMNS) {
    if (rowA?.[k] !== rowB?.[k]) out.push(k)
  }
  return out
}

async function main() {
  fs.mkdirSync(path.resolve(__dirname, '../../../docs/audits/personalization-killswitch'), { recursive: true })

  console.log('=== picking test + control students ===')
  const { test, control, interestedUserIds } = await pickStudents()
  console.log(`  test (has interests): ${test.email}  (${test.id})`)
  console.log(`  control (no interests): ${control.email}  (${control.id})`)
  console.log(`  total interest-tagged students: ${interestedUserIds.length}`)

  console.log('\n=== picking 5 multi-article units ===')
  const units = await pickTestUnits(5)
  console.log(`  ${units.length} units: ${units.join(', ').slice(0, 200)}...`)

  console.log('\n=== minting JWT sessions ===')
  let testSession, controlSession
  let mintErr = null
  try { testSession = await mintSession(test.email) ; console.log(`  ✅ test session minted (expires ${testSession.expires_at})`) }
  catch (e) { mintErr = e; console.log(`  ❌ test mint failed: ${e.message}`) }
  try { controlSession = await mintSession(control.email); console.log(`  ✅ control session minted`) }
  catch (e) { mintErr = mintErr || e; console.log(`  ❌ control mint failed: ${e.message}`) }

  if (!testSession || !controlSession) {
    fs.writeFileSync(
      path.resolve(__dirname, '../../../docs/audits/personalization-killswitch/impersonation-comparison.json'),
      JSON.stringify({ error: 'jwt_mint_failed', details: String(mintErr) }, null, 2)
    )
    console.log('\n🛑 JWT mint failed — cannot do authenticated-session comparison.')
    console.log('   Fallback (skipping for now): would need raw SQL via SECURITY DEFINER helper.')
    process.exit(2)
  }

  const result = {
    generated_at: new Date().toISOString(),
    test_profile: { id: test.id, email: test.email },
    control_profile: { id: control.id, email: control.email },
    units: [],
  }

  for (const unit_id of units) {
    // Ground truth via service-role
    const { data: svcRows, error: svcErr } = await svc
      .from('curriculum_readings')
      .select(COLUMNS.join(','))
      .eq('unit_id', unit_id)
      .order('sort_order')
    if (svcErr) throw svcErr

    const testClient = readingsAsAuthenticated(testSession.access_token)
    const { data: testRows, error: testErr } = await testClient
      .from('curriculum_readings')
      .select(COLUMNS.join(','))
      .eq('unit_id', unit_id)
      .order('sort_order')
    if (testErr) console.log(`  ❌ test SELECT err on ${unit_id}: ${testErr.message}`)

    const ctlClient = readingsAsAuthenticated(controlSession.access_token)
    const { data: ctlRows } = await ctlClient
      .from('curriculum_readings')
      .select(COLUMNS.join(','))
      .eq('unit_id', unit_id)
      .order('sort_order')

    const byOrder = new Map(svcRows.map(r => [r.sort_order, r]))
    const tByOrder = new Map((testRows || []).map(r => [r.sort_order, r]))
    const cByOrder = new Map((ctlRows || []).map(r => [r.sort_order, r]))

    const unitOut = {
      unit_id,
      service_count: svcRows.length,
      test_count: testRows?.length || 0,
      control_count: ctlRows?.length || 0,
      test_diffs: [],
      control_diffs: [],
    }
    for (const so of byOrder.keys()) {
      const s = byOrder.get(so)
      const t = tByOrder.get(so)
      const c = cByOrder.get(so)
      const dt = diff(s, t)
      if (dt.length) unitOut.test_diffs.push({ sort_order: so, fields: dt, svc_id: s.id, test_id: t?.id, svc_title: s.title_en, test_title: t?.title_en })
      const dc = diff(s, c)
      if (dc.length) unitOut.control_diffs.push({ sort_order: so, fields: dc, svc_id: s.id, ctl_id: c?.id })
    }
    result.units.push(unitOut)
  }

  const anyTestDiff = result.units.some(u => u.test_diffs.length > 0)
  const anyCtlDiff = result.units.some(u => u.control_diffs.length > 0)
  result.rows_differ_test = anyTestDiff
  result.rows_differ_control = anyCtlDiff

  fs.writeFileSync(
    path.resolve(__dirname, '../../../docs/audits/personalization-killswitch/impersonation-comparison.json'),
    JSON.stringify(result, null, 2)
  )

  console.log('\n=== verdict ===')
  console.log(`  units checked: ${result.units.length}`)
  console.log(`  test student rows differ from service-role: ${anyTestDiff ? '🔴 YES' : '🟢 NO'}`)
  console.log(`  control student rows differ from service-role: ${anyCtlDiff ? '🔴 YES' : '🟢 NO'}`)
  if (anyTestDiff) {
    console.log('\n  Sample diff:')
    console.log(JSON.stringify(result.units.find(u => u.test_diffs.length)?.test_diffs[0], null, 2))
  }

  process.exit(anyTestDiff || anyCtlDiff ? 1 : 0)
}

main().catch(e => { console.error(e); process.exit(99) })
