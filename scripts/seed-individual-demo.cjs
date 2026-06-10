#!/usr/bin/env node
// Create the DEMO individual (1-on-1) student for the Marketing Manager track.
// Idempotent. Pattern follows seed-izzuldeen-trainer.cjs:
//   GoTrue admin REST needs the sb_secret_* key (legacy service_role JWT is rejected),
//   revealed via Management API; profile/students rows upserted via Management API SQL.
// Usage: node scripts/seed-individual-demo.cjs
const fs = require('fs')
const path = require('path')

const REF = 'nmjexpuycmqcxuxljier'
const SUPABASE_URL = `https://${REF}.supabase.co`
const EMAIL = 'indiv-demo-marketing@fluentia.academy'
const PASSWORD = 'Fluentia2025!'
const FULL_NAME = 'سلطان الحربي (تجريبي — مسار فردي)'
const DISPLAY_NAME = 'سلطان'

function mgmtToken() {
  const raw = fs.readFileSync(path.join(__dirname, '..', '.mcp.json'), 'utf8')
  const m = raw.match(/sbp_[A-Za-z0-9]+/)
  if (!m) throw new Error('No sbp_ token in .mcp.json')
  return m[0]
}

async function mgmt(pathname, init = {}) {
  const res = await fetch(`https://api.supabase.com${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${mgmtToken()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'curl/8.4.0',
      ...(init.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${pathname} HTTP ${res.status}: ${text.slice(0, 300)}`)
  try { return JSON.parse(text) } catch { return text }
}

const sql = (q) => mgmt(`/v1/projects/${REF}/database/query`, { method: 'POST', body: JSON.stringify({ query: q }) })

async function main() {
  // 1) secret key for GoTrue admin
  const keys = await mgmt(`/v1/projects/${REF}/api-keys?reveal=true`)
  const secret = (keys || []).find((k) => k.type === 'secret')?.api_key
  if (!secret) throw new Error('no sb_secret key found')

  // 2) auth user (idempotent — look up first)
  let userId = null
  const lookup = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: { Authorization: `Bearer ${secret}`, apikey: secret },
  }).then((r) => r.json())
  userId = (lookup?.users || []).find((u) => u.email === EMAIL)?.id || null

  if (!userId) {
    const created = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, apikey: secret, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { full_name: FULL_NAME } }),
    }).then((r) => r.json())
    userId = created?.id
    if (!userId) throw new Error(`auth create failed: ${JSON.stringify(created).slice(0, 300)}`)
    console.log('auth user created:', userId)
  } else {
    console.log('auth user exists:', userId)
  }

  // 3) profile + students rows (demo: test account, no forced password change)
  await sql(`
    insert into public.profiles (id, full_name, display_name, email, role, is_test_account, must_change_password)
    values ('${userId}', '${FULL_NAME}', '${DISPLAY_NAME}', '${EMAIL}', 'student', true, false)
    on conflict (id) do update set
      full_name = excluded.full_name, display_name = excluded.display_name,
      role = 'student', is_test_account = true, must_change_password = false;
  `)
  await sql(`
    insert into public.students (id, study_mode, specialization_id, group_id, academic_level, package, gender, status, onboarding_completed, enrollment_date)
    select '${userId}', 'individual', s.id, null, 3, 'private', 'male', 'active', true, current_date
    from public.specializations s where s.slug = 'marketing_manager'
    on conflict (id) do update set
      study_mode = 'individual',
      specialization_id = (select id from public.specializations where slug = 'marketing_manager'),
      group_id = null, package = 'private', gender = 'male', status = 'active',
      onboarding_completed = true, deleted_at = null;
  `)

  const check = await sql(`
    select p.role, p.is_test_account, st.study_mode, st.specialization_id is not null as has_spec, st.group_id
    from public.profiles p join public.students st on st.id = p.id where p.id = '${userId}';
  `)
  console.log('verify:', JSON.stringify(check))
  console.log(`\nDEMO LOGIN → ${EMAIL} / ${PASSWORD}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
