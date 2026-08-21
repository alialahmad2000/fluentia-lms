#!/usr/bin/env node
/**
 * PHASE B6 — prove the coordinator's own session can do exactly what it should
 * and nothing more.
 *
 * Runs as the REAL coordinator through the ANON key — not the service role —
 * because service-role reads prove nothing about RLS. The session is minted
 * with an admin magic link (the account has must_change_password = true, so
 * there is no password to type and none is needed).
 *
 *   node scripts/verify-coordinator-rls.mjs [--email=someone@example.com]
 *
 * Assertions 2, 3 and 4 are the ones that matter: if the coordinator can read
 * a single row of payments, trainer_payroll or affiliate_payouts, STOP — do not
 * commit, do not deploy.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const REF = process.env.SUPABASE_PROJECT_REF || 'nmjexpuycmqcxuxljier'
const URL = `https://${REF}.supabase.co`

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`))
  return hit ? hit.slice(k.length + 3) : d
}

function mgmtToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN
  const raw = fs.readFileSync(path.join(ROOT, '.mcp.json'), 'utf8')
  const m = raw.match(/sbp_[A-Za-z0-9]+/)
  if (!m) throw new Error('No sbp_ token in .mcp.json and no SUPABASE_ACCESS_TOKEN')
  return m[0]
}

/**
 * The project runs the NEW key format: the runtime service key is sb_secret_*
 * and the legacy JWTs still exist alongside it. Pull both from the Management
 * API rather than trusting .env, which has drifted before.
 */
async function keys() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${mgmtToken()}`, 'User-Agent': 'curl/8.4.0' },
  })
  if (!res.ok) throw new Error(`api-keys ${res.status}: ${await res.text()}`)
  const list = await res.json()
  const secret = list.find((k) => k.type === 'secret')?.api_key
  const anonLegacy = list.find((k) => k.type === 'legacy' && k.name === 'anon')?.api_key
    || list.find((k) => String(k.api_key || '').startsWith('eyJ') && /anon/i.test(k.name || ''))?.api_key
  const publishable = list.find((k) => k.type === 'publishable')?.api_key
  return { secret, anon: anonLegacy || publishable }
}

async function mintCoordinatorSession(email, secret, anon) {
  // GoTrue admin: generate a magiclink, then redeem it on an anon client.
  // generate_link returns hashed_token at the TOP level, not under properties.
  const res = await fetch(`${URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email }),
  })
  if (!res.ok) throw new Error(`generate_link ${res.status}: ${await res.text()}`)
  const link = await res.json()
  const hashed = link.hashed_token || link.properties?.hashed_token
  if (!hashed) throw new Error('no hashed_token in generate_link response')

  const client = createClient(URL, anon, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await client.auth.verifyOtp({ token_hash: hashed, type: 'magiclink' })
  if (error) throw error
  return { client, user: data.user }
}

const results = []
const record = (name, pass, detail) => {
  results.push({ name, pass, detail })
  console.log(`  ${pass ? '✅ PASS' : '❌ FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

/** A locked table must return either an explicit refusal or an empty set. */
function locked(error, data) {
  if (error) return { ok: true, why: `blocked (${error.code || error.message})` }
  if (!data || data.length === 0) return { ok: true, why: '0 rows' }
  return { ok: false, why: `LEAKED ${data.length} row(s)` }
}

async function main() {
  const { secret, anon } = await keys()
  if (!secret || !anon) throw new Error('could not resolve both a secret and an anon/publishable key')

  const admin = createClient(URL, secret, { auth: { persistSession: false } })
  const email = arg('email') || await (async () => {
    const { data } = await admin.from('profiles').select('email').eq('role', 'coordinator').limit(1)
    if (!data?.length) throw new Error('no coordinator account exists — run scripts/create-coordinator.mjs first')
    return data[0].email
  })()

  console.log(`COORDINATOR RLS VERIFICATION\nproject ${REF}\nacting as ${email} (anon key, real session)\n`)

  const { client: sb, user } = await mintCoordinatorSession(email, secret, anon)
  console.log(`session minted for ${user.id}\n`)

  // 1 — the queue works
  {
    const { data, error } = await sb.rpc('get_coordinator_queue')
    record('1. get_coordinator_queue() returns rows', !error && Array.isArray(data) && data.length > 0,
      error ? error.message : `${data?.length ?? 0} rows`)
  }

  // 2/3/4 — money is invisible. These three decide whether this ships.
  for (const [n, table] of [[2, 'payments'], [3, 'trainer_payroll'], [4, 'affiliate_payouts']]) {
    const { data, error } = await sb.from(table).select('*').limit(5)
    const v = locked(error, data)
    record(`${n}. SELECT * FROM ${table} is blocked or empty`, v.ok, v.why)
  }

  // 5 — no write path except the RPCs
  {
    const { data: target } = await admin
      .from('student_interventions').select('id').eq('status', 'pending').limit(1).maybeSingle()
    if (!target) {
      record('5. direct UPDATE student_interventions fails', false, 'no pending row to test against')
    } else {
      const { data, error } = await sb
        .from('student_interventions').update({ status: 'acted' }).eq('id', target.id).select()
      const blocked = !!error || !data || data.length === 0
      record('5. direct UPDATE student_interventions fails (RPC-only writes)', blocked,
        error ? `blocked (${error.code || error.message})` : `${data?.length ?? 0} rows updated`)
      // Belt and braces: confirm the row is untouched even if the call "succeeded".
      const { data: after } = await admin
        .from('student_interventions').select('status').eq('id', target.id).single()
      if (after?.status !== 'pending') {
        record('5b. the row really is untouched', false, `status is now ${after?.status}`)
      }
    }
  }

  // 6 — he cannot log a day in somebody else's name
  {
    const { data: other } = await admin
      .from('profiles').select('id').eq('role', 'admin').limit(1).maybeSingle()
    const { data, error } = await sb
      .from('coordinator_daily_log')
      .insert({
        coordinator_id: other?.id ?? '00000000-0000-0000-0000-000000000000',
        log_date: '1999-01-01',
        summary: 'RLS probe — should never persist',
      })
      .select()
    const blocked = !!error || !data || data.length === 0
    record('6. inserting a daily log as another coordinator fails', blocked,
      error ? `blocked (${error.code || error.message})` : 'row was accepted')
    if (!blocked) await admin.from('coordinator_daily_log').delete().eq('log_date', '1999-01-01')
  }

  // extra — his OWN log must still work, or the console is unusable
  {
    const { data, error } = await sb
      .from('coordinator_daily_log')
      .upsert({
        coordinator_id: user.id,
        log_date: '1999-01-02',
        summary: 'RLS probe — own row, deleted immediately after this check',
      }, { onConflict: 'coordinator_id,log_date' })
      .select()
    record('7. inserting his OWN daily log succeeds', !error && data?.length === 1,
      error ? error.message : 'ok')
    await admin.from('coordinator_daily_log').delete().eq('log_date', '1999-01-02')
  }

  await sb.auth.signOut()

  const failed = results.filter((r) => !r.pass)
  const moneyFailed = results.filter((r) => !r.pass && /payments|payroll|payouts/.test(r.name))
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`${results.length - failed.length}/${results.length} passed`)
  if (moneyFailed.length) {
    console.log('\n⛔ A FINANCIAL TABLE IS READABLE BY THE COORDINATOR. Do not commit. Do not deploy.')
    process.exit(2)
  }
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => { console.error('\n💥', e.message || e); process.exit(3) })
