#!/usr/bin/env node
// Sweep the same authenticated-vs-service-role check across other curriculum
// tables and at the reading_passage_audio layer to make sure no other table
// has a hidden interest-based RLS or substitution.

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
const SVC = env.SUPABASE_SERVICE_ROLE_KEY
const ANON = env.VITE_SUPABASE_ANON_KEY

const svc = createClient(URL, SVC, { auth: { persistSession: false } })

async function mintSession(email) {
  const { data: link } = await svc.auth.admin.generateLink({ type: 'magiclink', email })
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const r = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
  return r.data.session
}

function clientFor(tok) {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${tok}` } },
  })
}

async function pickProfiles() {
  const { data: ui } = await svc.from('user_interests').select('user_id').eq('has_completed_survey', true).limit(3)
  const interestIds = ui.map(r => r.user_id)
  const { data: testProfs } = await svc.from('profiles').select('id, email').in('id', interestIds).eq('role', 'student').not('email','is',null).limit(2)
  const { data: ctlPool } = await svc.from('profiles').select('id, email').eq('role','student').not('email','is',null).limit(100)
  const ctl = ctlPool.find(p => !interestIds.includes(p.id))
  return { test: testProfs[0], ctl }
}

async function sweepTable(table, sample, svcTok, testTok, ctlTok) {
  const { data: svcRows, error } = await svc.from(table).select('*').limit(sample)
  if (error) return { table, error: error.message }
  const testRes = await clientFor(testTok).from(table).select('*').limit(sample)
  const ctlRes = await clientFor(ctlTok).from(table).select('*').limit(sample)
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b)
  return {
    table,
    service_rows: svcRows?.length || 0,
    test_rows: testRes.data?.length || 0,
    control_rows: ctlRes.data?.length || 0,
    test_err: testRes.error?.message || null,
    ctl_err: ctlRes.error?.message || null,
    test_equal_svc: same(svcRows, testRes.data),
    ctl_equal_svc: same(svcRows, ctlRes.data),
  }
}

async function main() {
  const { test, ctl } = await pickProfiles()
  console.log(`test=${test.email}, control=${ctl.email}`)
  const testSession = await mintSession(test.email)
  const ctlSession = await mintSession(ctl.email)

  const tables = [
    'curriculum_readings',
    'curriculum_listening',
    'curriculum_vocabulary',
    'reading_passage_audio',
    'curriculum_grammar',
  ]
  const out = []
  for (const t of tables) {
    const r = await sweepTable(t, 20, null, testSession.access_token, ctlSession.access_token)
    out.push(r)
    console.log(`${t}: svc=${r.service_rows} test=${r.test_rows} ctl=${r.control_rows} test_eq=${r.test_equal_svc} ctl_eq=${r.ctl_equal_svc} ${r.error||r.test_err||r.ctl_err||''}`)
  }

  fs.writeFileSync(
    path.resolve(__dirname, '../../../docs/audits/personalization-killswitch/sweep-related-tables.json'),
    JSON.stringify({ test, ctl, results: out }, null, 2)
  )
}

main().catch(e => { console.error(e); process.exit(1) })
