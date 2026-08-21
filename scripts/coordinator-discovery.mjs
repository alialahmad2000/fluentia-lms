#!/usr/bin/env node
/**
 * PHASE A — Coordinator Console discovery (READ ONLY).
 *
 * Prints every fact the console build depends on, straight from production:
 *   A1 schema · A2 intervention engine · A3 producer + expiry job
 *   A4 activity-signal reliability · A5 messaging path · A6 coordinator wiring
 *
 * Runs SQL through the Supabase Management API (same path as scripts/_mgmt-query.cjs).
 * Token: SUPABASE_ACCESS_TOKEN env, else the sbp_ token in .mcp.json.
 *
 *   node scripts/coordinator-discovery.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const REF = process.env.SUPABASE_PROJECT_REF || 'nmjexpuycmqcxuxljier'

function token() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN
  const raw = fs.readFileSync(path.join(ROOT, '.mcp.json'), 'utf8')
  const m = raw.match(/sbp_[A-Za-z0-9]+/)
  if (!m) throw new Error('No sbp_ token in .mcp.json and no SUPABASE_ACCESS_TOKEN')
  return m[0]
}
const TOKEN = token()

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
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`)
  return JSON.parse(text)
}

const h = (t) => console.log(`\n${'═'.repeat(78)}\n${t}\n${'═'.repeat(78)}`)
const sub = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 72 - t.length))}`)
const table = (rows) => {
  if (!rows?.length) return console.log('  (no rows)')
  for (const r of rows) console.log('  ' + JSON.stringify(r))
}

// ─────────────────────────────────────────────────────────────────────────────
async function a1() {
  h('A1 — SCHEMA (information_schema.columns)')
  const TABLES = [
    'student_interventions', 'profiles', 'students', 'groups', 'student_daily_activity',
    'unified_activity_log', 'notifications', 'direct_messages', 'dm_threads',
    'help_requests', 'bug_reports', 'unit_progress', 'student_curriculum_progress',
    // the real DM carrier — see A5
    'group_messages',
  ]
  const rows = await sql(`
    SELECT table_name,
           string_agg(column_name || ':' || data_type || CASE WHEN is_nullable='NO' THEN '!' ELSE '' END,
                      ', ' ORDER BY ordinal_position) AS cols
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name IN (${TABLES.map((t) => `'${t}'`).join(',')})
    GROUP BY table_name ORDER BY table_name;`)
  for (const r of rows) {
    sub(r.table_name)
    console.log('  ' + r.cols.split(', ').join('\n  '))
  }

  sub('column-location checks the brief flagged')
  table(await sql(`
    SELECT 'profiles.must_change_password' AS check,
           EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles'  AND column_name='must_change_password') AS present
    UNION ALL SELECT 'students.must_change_password',
           EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students'  AND column_name='must_change_password')
    UNION ALL SELECT 'students.payment_day',
           EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students'  AND column_name='payment_day')
    UNION ALL SELECT 'profiles.timezone',
           EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles'  AND column_name='timezone');`))
}

// ─────────────────────────────────────────────────────────────────────────────
async function a2() {
  h('A2 — INTERVENTION ENGINE')

  sub('rows by status')
  table(await sql(`SELECT status, count(*) FROM student_interventions GROUP BY 1 ORDER BY 2 DESC;`))

  sub('every reason_code ever used  (the console needs an English label for each)')
  table(await sql(`SELECT reason_code, count(*), count(*) FILTER (WHERE status='pending') AS pending
                   FROM student_interventions GROUP BY 1 ORDER BY 2 DESC;`))

  sub('every severity ever used')
  table(await sql(`SELECT severity, count(*), count(*) FILTER (WHERE status='pending') AS pending
                   FROM student_interventions GROUP BY 1 ORDER BY 2 DESC;`))

  sub('generated_by')
  table(await sql(`SELECT generated_by, count(*) FROM student_interventions GROUP BY 1;`))

  sub('⚠ message-column COVERAGE — is the Arabic message really pre-written?')
  table(await sql(`
    SELECT status, reason_code, count(*) AS rows,
           count(suggested_message_ar) AS has_suggested_message_ar,
           count(short_message)        AS has_short_message,
           count(suggested_action_ar)  AS has_suggested_action_ar,
           count(reason_ar)            AS has_reason_ar
    FROM student_interventions GROUP BY 1,2 ORDER BY 1, 3 DESC;`))

  sub('pending queue shape — rows per student (are they duplicates?)')
  table(await sql(`
    SELECT p.full_name, s.status::text AS student_status, (s.deleted_at IS NOT NULL) AS deleted,
           count(*) AS pending_rows, min(i.created_at)::date AS oldest, max(i.created_at)::date AS newest,
           string_agg(DISTINCT i.reason_code, ',') AS codes
    FROM student_interventions i
    JOIN students s ON s.id = i.student_id
    JOIN profiles p ON p.id = i.student_id
    WHERE i.status='pending' GROUP BY 1,2,3 ORDER BY pending_rows DESC;`))

  sub('5 sample pending rows — ALL columns')
  const samples = await sql(`SELECT * FROM student_interventions WHERE status='pending' ORDER BY created_at DESC LIMIT 5;`)
  for (const s of samples) console.log('  ' + JSON.stringify(s, null, 2).split('\n').join('\n  '))

  sub('does acted_by exist on student_interventions? (expected: no, until Phase B)')
  table(await sql(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name='student_interventions'
      AND column_name IN ('acted_by','action_channel','blocker_type');`))
}

// ─────────────────────────────────────────────────────────────────────────────
async function a3() {
  h('A3 — WHO GENERATES, WHO EXPIRES')

  sub('cron.job — every scheduled job (producer + expiry live here)')
  table(await sql(`SELECT jobid, schedule, jobname, left(command, 160) AS command FROM cron.job ORDER BY jobid;`))

  sub('edge functions in supabase/functions/ that reference student_interventions')
  const fnDir = path.join(ROOT, 'supabase', 'functions')
  for (const d of fs.readdirSync(fnDir)) {
    const f = path.join(fnDir, d, 'index.ts')
    if (fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes('student_interventions')) {
      console.log(`  supabase/functions/${d}/index.ts`)
    }
  }

  sub('THE EXPIRY WINDOW — expire_stale_interventions / unsnooze_expired_interventions')
  const defs = await sql(`
    SELECT p.proname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('expire_stale_interventions','unsnooze_expired_interventions');`)
  for (const d of defs) console.log('\n  ' + d.def.split('\n').join('\n  '))

  sub('oldest pending row → how long until it expires')
  table(await sql(`
    SELECT min(created_at)::date AS oldest_pending,
           7 - extract(day FROM now() - min(created_at))::int AS days_left_for_oldest
    FROM student_interventions WHERE status='pending';`))
}

// ─────────────────────────────────────────────────────────────────────────────
async function a4() {
  h('A4 — ACTIVITY SIGNAL RELIABILITY ("last seen")')

  sub('row counts of every candidate signal table')
  table(await sql(`
    SELECT 'student_daily_activity' AS t, count(*) FROM student_daily_activity
    UNION ALL SELECT 'unified_activity_log', count(*) FROM unified_activity_log
    UNION ALL SELECT 'xp_transactions', count(*) FROM xp_transactions
    UNION ALL SELECT 'student_curriculum_progress', count(*) FROM student_curriculum_progress
    UNION ALL SELECT 'submissions', count(*) FROM submissions
    UNION ALL SELECT 'student_streaks', count(*) FROM student_streaks
    UNION ALL SELECT 'student_notes', count(*) FROM student_notes
    UNION ALL SELECT 'churn_predictions', count(*) FROM churn_predictions;`))

  sub('per active student: every "last seen" candidate side by side')
  table(await sql(`
    SELECT p.full_name,
           s.last_active_at                                                                       AS students_last_active_at,
           pr.last_active_at                                                                      AS profiles_last_active_at,
           (SELECT max(activity_date) FROM student_daily_activity d WHERE d.student_id=s.id)      AS max_student_daily_activity,
           (SELECT max(occurred_at)   FROM unified_activity_log  u WHERE u.student_id=s.id)       AS max_unified_activity_log,
           (SELECT max(created_at)    FROM xp_transactions       x WHERE x.student_id=s.id)       AS max_xp_transactions,
           (SELECT max(updated_at)    FROM student_curriculum_progress c WHERE c.student_id=s.id) AS max_curriculum_progress
    FROM students s
    JOIN profiles p  ON p.id = s.id
    JOIN profiles pr ON pr.id = s.id
    WHERE s.deleted_at IS NULL AND s.status='active'
    ORDER BY s.last_active_at DESC NULLS LAST;`))

  sub('freshness race — which signal is most recent, per student')
  table(await sql(`
    WITH c AS (
      SELECT s.id,
        s.last_active_at AS a_students,
        (SELECT max(activity_date)::timestamptz FROM student_daily_activity d WHERE d.student_id=s.id) AS b_sda,
        (SELECT max(occurred_at) FROM unified_activity_log u WHERE u.student_id=s.id)                  AS c_ual,
        (SELECT max(created_at)  FROM xp_transactions x WHERE x.student_id=s.id)                       AS d_xp,
        (SELECT max(updated_at)  FROM student_curriculum_progress p WHERE p.student_id=s.id)           AS e_scp
      FROM students s WHERE s.deleted_at IS NULL AND s.status='active')
    SELECT
      count(*) FILTER (WHERE d_xp  > coalesce(a_students,'epoch')) AS xp_fresher_than_students_last_active,
      count(*) FILTER (WHERE c_ual > coalesce(a_students,'epoch')) AS ual_fresher,
      count(*) FILTER (WHERE e_scp > coalesce(a_students,'epoch')) AS progress_fresher,
      count(*) FILTER (WHERE b_sda > coalesce(a_students,'epoch')) AS daily_rollup_fresher
    FROM c;`))
}

// ─────────────────────────────────────────────────────────────────────────────
async function a5() {
  h('A5 — MESSAGING PATH (reuse, never invent a second one)')

  sub('RLS on the messaging tables')
  table(await sql(`
    SELECT tablename, policyname, cmd, coalesce(qual,'-') AS qual, coalesce(with_check,'-') AS with_check
    FROM pg_policies WHERE schemaname='public'
      AND tablename IN ('dm_threads','group_messages','direct_messages','notifications')
    ORDER BY tablename, cmd, policyname;`))

  sub('triggers on group_messages (this is what fires the push + in-app notification)')
  table(await sql(`
    SELECT tgname, pg_get_triggerdef(t.oid) AS def
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='group_messages' AND NOT t.tgisinternal;`))

  sub('can_dm() — does it have a coordinator branch?')
  const defs = await sql(`
    SELECT pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='can_dm';`)
  for (const d of defs) console.log('\n  ' + d.def.split('\n').join('\n  '))
  console.log(`\n  coordinator branch present: ${defs[0]?.def.includes('coordinator') ? 'YES' : 'NO  ← coordinators cannot open a DM thread'}`)

  sub('legacy vs live message store')
  table(await sql(`
    SELECT 'direct_messages (legacy)' AS store, count(*) FROM direct_messages
    UNION ALL SELECT 'group_messages WHERE dm_thread_id IS NOT NULL (live)', count(*) FROM group_messages WHERE dm_thread_id IS NOT NULL;`))

  sub('app implementation')
  console.log('  src/features/chat/queries/useDM.js')
  console.log('    getOrCreateDMThread(otherId)  → supabase.rpc("dm_get_or_create_thread", { p_other })')
  console.log('    useSendDM(threadId)           → insert into group_messages { dm_thread_id, sender_id, body, type }')
  console.log('    → trigger trg_dm_notify → dm_notify_push() → edge fn send-push-notification')
  console.log('      → inserts the in-app notifications row AND sends web push (one call, both channels)')
}

// ─────────────────────────────────────────────────────────────────────────────
async function a6() {
  h('A6 — CURRENT COORDINATOR WIRING')

  sub('every RLS policy mentioning coordinator')
  table(await sql(`
    SELECT tablename, policyname, cmd, coalesce(qual,'-') AS qual, coalesce(with_check,'-') AS with_check
    FROM pg_policies WHERE schemaname='public'
      AND (coalesce(qual,'') ILIKE '%coordinator%' OR coalesce(with_check,'') ILIKE '%coordinator%')
    ORDER BY tablename, policyname;`))

  sub('is_coordinator_staff() helper')
  const defs = await sql(`
    SELECT pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='is_coordinator_staff';`)
  for (const d of defs) console.log('\n  ' + d.def.split('\n').join('\n  '))

  sub('user_role enum + existing coordinator accounts')
  table(await sql(`SELECT string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS user_role_enum
                   FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='user_role';`))
  table(await sql(`SELECT id, email, full_name, must_change_password FROM profiles WHERE role='coordinator';`))

  sub('existing files under a coordinator path in src/')
  const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) walk(p, out)
      else if (/coordinator/i.test(p)) out.push(path.relative(ROOT, p))
    }
    return out
  }
  for (const f of walk(path.join(ROOT, 'src'))) console.log('  ' + f)

  sub('existing /coordinator routes in src/App.jsx')
  const app = fs.readFileSync(path.join(ROOT, 'src', 'App.jsx'), 'utf8').split('\n')
  app.forEach((l, i) => { if (/coordinator/i.test(l)) console.log(`  App.jsx:${i + 1}  ${l.trim()}`) })
}

// ─────────────────────────────────────────────────────────────────────────────
const t0 = Date.now()
console.log(`COORDINATOR CONSOLE — PHASE A DISCOVERY\nproject ${REF}\nrun ${new Date().toISOString()}`)
for (const step of [a1, a2, a3, a4, a5, a6]) await step()
console.log(`\n${'═'.repeat(78)}\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s — READ ONLY, nothing was written.`)
