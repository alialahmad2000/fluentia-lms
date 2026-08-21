#!/usr/bin/env node
/**
 * PHASE D — provision a coordinator account for the console.
 *
 *   node scripts/create-coordinator.mjs \
 *     --email="someone@example.com" --name="Full Name" --timezone="Africa/Nairobi"
 *
 * Optional: --password="…" (defaults to the standard temp password)
 *           --language=en|ar (defaults to en — this role reads English)
 *
 * No hardcoded account values: everything comes from the flags. Idempotent —
 * running it twice on the same email upgrades the existing account instead of
 * failing, so it is safe to re-run after a typo in the name or timezone.
 *
 * Every write is read back and asserted. A profiles UPDATE that matches no row
 * returns success with no rows; this script treats that as a failure.
 *
 * NOTE — a profiles row already exists by the time we get there: auth.users has
 * an on_auth_user_created trigger (handle_new_user) that inserts one with the
 * default role. So the profile write is an UPSERT that promotes it, never a
 * plain INSERT.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const REF = process.env.SUPABASE_PROJECT_REF || 'nmjexpuycmqcxuxljier'
const SUPA_URL = `https://${REF}.supabase.co`
const APP_URL = 'https://app.fluentia.academy'
const DEFAULT_PASSWORD = 'Fluentia2025!'

// ── args ───────────────────────────────────────────────────────────────────
const arg = (k) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`))
  return hit ? hit.slice(k.length + 3) : undefined
}
const email = arg('email')
const name = arg('name')
const timezone = arg('timezone')
const password = arg('password') || DEFAULT_PASSWORD
const language = arg('language') || 'en'

if (!email || !name || !timezone) {
  console.error(`usage:
  node scripts/create-coordinator.mjs \\
    --email="..." --name="..." --timezone="Africa/Nairobi" [--password="..."] [--language=en|ar]`)
  process.exit(2)
}
if (!['en', 'ar'].includes(language)) {
  console.error(`--language must be en or ar (profiles.ui_language CHECK)`); process.exit(2)
}
try {
  new Intl.DateTimeFormat('en', { timeZone: timezone })
} catch {
  console.error(`--timezone "${timezone}" is not a zone this machine's Intl knows. Use an IANA name, e.g. Africa/Nairobi.`)
  process.exit(2)
}

// ── plumbing ───────────────────────────────────────────────────────────────
function mgmtToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN
  const raw = fs.readFileSync(path.join(ROOT, '.mcp.json'), 'utf8')
  const m = raw.match(/sbp_[A-Za-z0-9]+/)
  if (!m) throw new Error('No sbp_ token in .mcp.json and no SUPABASE_ACCESS_TOKEN')
  return m[0]
}
const TOKEN = mgmtToken()

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'curl/8.4.0', // Cloudflare 1010s the default UA
    },
    body: JSON.stringify({ query }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`SQL ${res.status}: ${text.slice(0, 400)}`)
  return JSON.parse(text)
}

async function serviceKey() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'curl/8.4.0' },
  })
  if (!res.ok) throw new Error(`api-keys ${res.status}`)
  const keys = await res.json()
  // The GoTrue admin API wants a JWT-shaped key; the new sb_secret_* key is
  // accepted too, but the legacy service_role JWT is the safer default here.
  return keys.find((k) => k.name === 'service_role')?.api_key
    || keys.find((k) => k.type === 'secret')?.api_key
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`

// ── run ────────────────────────────────────────────────────────────────────
const service = await serviceKey()
if (!service) throw new Error('could not resolve a service key')

const H = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }

// 1. auth user (idempotent)
let uid
const created = await fetch(`${SUPA_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: name } }),
})
const createdBody = await created.json()
if (createdBody?.id) {
  uid = createdBody.id
  console.log(`✅ auth user created — ${uid}`)
} else {
  const rows = await sql(`select id from auth.users where lower(email) = lower(${q(email)});`)
  uid = rows?.[0]?.id
  if (!uid) throw new Error(`could not create or find the user: ${JSON.stringify(createdBody).slice(0, 300)}`)
  console.log(`↻  auth user already existed — ${uid} (password left as it was)`)
}

// 2. profile — promote to coordinator
await sql(`
  insert into public.profiles (id, full_name, role, ui_language, must_change_password, timezone, email)
  values (${q(uid)}, ${q(name)}, 'coordinator', ${q(language)}, true, ${q(timezone)}, ${q(email)})
  on conflict (id) do update set
    full_name = excluded.full_name,
    role = 'coordinator',
    ui_language = excluded.ui_language,
    must_change_password = true,
    timezone = excluded.timezone;
`)

// 3. read it back — an UPDATE that matched nothing also "succeeds"
const [profile] = await sql(`
  select id, full_name, role::text as role, ui_language, must_change_password, timezone, email
  from public.profiles where id = ${q(uid)};
`)
if (!profile) throw new Error('the profile row is not there after the write')
const problems = []
if (profile.role !== 'coordinator') problems.push(`role is ${profile.role}, not coordinator`)
if (profile.timezone !== timezone) problems.push(`timezone is ${profile.timezone}, not ${timezone}`)
if (profile.must_change_password !== true) problems.push('must_change_password did not stick')
if (profile.full_name !== name) problems.push(`full_name is ${profile.full_name}`)
if (problems.length) {
  console.error('\n❌ the write did not persist as asked:')
  for (const p of problems) console.error(`   · ${p}`)
  process.exit(1)
}

console.log(`✅ profile verified — ${JSON.stringify(profile)}`)

console.log(`
──────────────────────────────────────────────────────────────
  Coordinator ready

  Sign in    ${APP_URL}/login
  Email      ${email}
  Password   ${password}   (they are forced to change it on first sign-in)
  Timezone   ${timezone}

  Their screens
    ${APP_URL}/coordinator/queue   the queue — worked to empty every day
    ${APP_URL}/coordinator/log     the daily log

  They can read no Arabic and cannot edit the outreach text. When the
  pre-written message does not fit, their only route is Escalate, which
  lands in /admin/coordinator-escalations.
──────────────────────────────────────────────────────────────`)
