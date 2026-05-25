/* eslint-disable */
// Idempotent staff/teacher-preview account for رولا.
// Uses GoTrue admin REST (create user) + Supabase Management API SQL (profile/student
// upsert), both forced to IPv4 (this machine's NAT64 IPv6 path is broken).
//
// Schema-corrected vs the prompt draft:
//   - must_change_password lives on PROFILES (not students)
//   - students has NO payment_day column — omitted
const https = require('https')

const PROJECT = 'nmjexpuycmqcxuxljier'
const SUPA_HOST = `${PROJECT}.supabase.co`
const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const SR = process.env.PROD_SR // service_role JWT

const EMAIL = 'roulaabed2000@gmail.com'
const PASSWORD = 'Fluentia2025!'
const NAME = 'رولا عبدالسلام أبو معيلق'
const ACADEMIC_LEVEL = 3 // B1 = Fluency/طلاقة
const STAFF_GROUP_ID = '39f041ac-3297-4fd6-84e1-9437b5bd3c69'

function req(opts, body) {
  return new Promise((resolve, reject) => {
    const r = https.request({ ...opts, family: 4 }, (res) => {
      let b = ''; res.on('data', c => b += c)
      res.on('end', () => resolve({ status: res.statusCode, body: b }))
    })
    r.on('error', reject); if (body) r.write(body); r.end()
  })
}
async function sql(query) {
  const data = JSON.stringify({ query })
  const res = await req({ hostname: 'api.supabase.com', path: `/v1/projects/${PROJECT}/database/query`, method: 'POST',
    headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, data)
  if (res.status >= 400) throw new Error(`mgmt ${res.status}: ${res.body.slice(0,300)}`)
  return JSON.parse(res.body)
}
const esc = s => s == null ? 'NULL' : `$q$${String(s)}$q$`

async function main() {
  if (!MGMT_TOKEN || !SR) throw new Error('need SUPABASE_ACCESS_TOKEN + PROD_SR')

  // 1. Find or create auth user
  let userId
  const existing = await sql(`SELECT id::text FROM auth.users WHERE email='${EMAIL}'`)
  if (existing.length > 0) {
    userId = existing[0].id
    console.log('auth user exists:', userId)
  } else {
    const payload = JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { full_name: NAME } })
    const res = await req({ hostname: SUPA_HOST, path: '/auth/v1/admin/users', method: 'POST',
      headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, payload)
    if (res.status >= 400) throw new Error(`createUser ${res.status}: ${res.body.slice(0,300)}`)
    userId = JSON.parse(res.body).id
    console.log('auth user created:', userId)
  }

  // 2. Upsert profile (role student, must_change_password lives HERE)
  await sql(`INSERT INTO profiles (id, email, full_name, role, must_change_password)
    VALUES ('${userId}', ${esc(EMAIL)}, ${esc(NAME)}, 'student', true)
    ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email, full_name=EXCLUDED.full_name, role='student', must_change_password=true`)
  console.log('profile upserted')

  // 3. Upsert student (no payment_day; can_access_lower_levels=true)
  await sql(`INSERT INTO students (id, academic_level, package, custom_price, group_id, can_access_lower_levels, status, enrollment_date, onboarding_completed)
    VALUES ('${userId}', ${ACADEMIC_LEVEL}, 'tamayuz', 0, '${STAFF_GROUP_ID}', true, 'active', CURRENT_DATE, false)
    ON CONFLICT (id) DO UPDATE SET academic_level=${ACADEMIC_LEVEL}, group_id='${STAFF_GROUP_ID}', can_access_lower_levels=true, status='active'`)
  console.log('student upserted')

  // 4. Verify
  const v = await sql(`SELECT p.full_name, p.email, p.role, p.must_change_password,
    s.academic_level, s.can_access_lower_levels, s.status, s.custom_price, s.package, g.name AS grp, g.code
    FROM profiles p JOIN students s ON s.id=p.id LEFT JOIN groups g ON g.id=s.group_id WHERE p.id='${userId}'`)
  console.log('VERIFY:', JSON.stringify(v[0], null, 2))
}
main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
