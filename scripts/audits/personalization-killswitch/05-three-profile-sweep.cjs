#!/usr/bin/env node
// Three-profile sweep: 3 students × 5 multi-article units = 15 combos.
// All 15 must return identical canonical rows + must successfully read the
// app_config kill-switch and observe value=false.

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

const svc = createClient(URL, SVC, { auth: { persistSession: false } })

async function mintSession(email) {
  const { data: link, error } = await svc.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw error
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const r = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  if (!r.data?.session?.access_token) throw new Error('verifyOtp failed for ' + email)
  return r.data.session
}

function clientFor(tok) {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${tok}` } },
  })
}

const COLS = 'id, unit_id, reading_label, title_ar, title_en, passage_word_count, passage_audio_url, audio_duration_seconds, sort_order'

;(async () => {
  // Pick 3 students:
  //   - student #1: has interests, has_completed_survey = true
  //   - student #2: another with interests
  //   - student #3: no interests
  const { data: ui } = await svc.from('user_interests').select('user_id').eq('has_completed_survey', true).limit(10)
  const interestIds = ui.map(r => r.user_id)
  const { data: profsWithInterests } = await svc.from('profiles').select('id, email').in('id', interestIds).eq('role','student').not('email','is',null).limit(5)
  const { data: profsNoInterests } = await svc.from('profiles').select('id, email').eq('role','student').not('email','is',null).limit(50)
  const ctl = profsNoInterests.find(p => !interestIds.includes(p.id))
  const subjects = [profsWithInterests[0], profsWithInterests[1], ctl].filter(Boolean)
  if (subjects.length !== 3) { console.error('Could not pick 3 distinct students'); process.exit(1) }
  console.log('Subjects:')
  subjects.forEach((s, i) => console.log(`  #${i+1}: ${s.email} (id=${s.id})`))

  // 5 multi-article units
  const { data: allRows } = await svc.from('curriculum_readings').select('unit_id')
  const counts = {}
  allRows.forEach(r => counts[r.unit_id] = (counts[r.unit_id] || 0) + 1)
  const units = Object.entries(counts).filter(([,n]) => n >= 2).slice(0, 5).map(([u]) => u)
  console.log(`Units: ${units.length}`)

  // Mint
  const sessions = await Promise.all(subjects.map(s => mintSession(s.email)))

  const result = { generated_at: new Date().toISOString(), subjects, units, combos: [], flag_reads: [] }

  // Confirm each session can read app_config + observes value=false
  for (let i = 0; i < subjects.length; i++) {
    const c = clientFor(sessions[i].access_token)
    const { data, error } = await c.from('app_config').select('key, value').eq('key', 'personalization_enabled').maybeSingle()
    result.flag_reads.push({ subject: subjects[i].email, value: data?.value ?? null, error: error?.message ?? null })
  }

  // Service-role ground truth per unit
  const svcByUnit = {}
  for (const u of units) {
    const { data } = await svc.from('curriculum_readings').select(COLS).eq('unit_id', u).order('sort_order')
    svcByUnit[u] = data
  }

  // 3 × 5 = 15 combinations
  for (let i = 0; i < subjects.length; i++) {
    const client = clientFor(sessions[i].access_token)
    for (const u of units) {
      const { data, error } = await client.from('curriculum_readings').select(COLS).eq('unit_id', u).order('sort_order')
      const svcRows = svcByUnit[u]
      const equal = JSON.stringify(data) === JSON.stringify(svcRows)
      result.combos.push({
        subject: subjects[i].email,
        unit_id: u,
        service_count: svcRows.length,
        student_count: data?.length || 0,
        equal,
        error: error?.message ?? null,
      })
    }
  }

  const allEqual = result.combos.every(c => c.equal)
  const allFlagFalse = result.flag_reads.every(f => f.value === false && !f.error)
  result.verdict = {
    all_15_combos_equal: allEqual,
    all_subjects_read_flag_as_false: allFlagFalse,
    pass: allEqual && allFlagFalse,
  }

  fs.writeFileSync(
    path.resolve(__dirname, '../../../docs/audits/personalization-killswitch/three-profile-sweep.json'),
    JSON.stringify(result, null, 2)
  )

  console.log('\n=== verdict ===')
  console.log(`  combos: ${result.combos.length}`)
  console.log(`  all combos equal to service-role: ${allEqual ? '✅' : '❌'}`)
  console.log(`  all subjects see flag=false: ${allFlagFalse ? '✅' : '❌'}`)
  console.log(`  overall: ${result.verdict.pass ? '✅ PASS' : '❌ FAIL'}`)

  process.exit(result.verdict.pass ? 0 : 1)
})().catch(e => { console.error(e); process.exit(99) })
