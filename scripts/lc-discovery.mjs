#!/usr/bin/env node
/**
 * PHASE A — Learning Coach discovery (READ ONLY).
 *
 *   A1 schema · A2 enums · A3 gender · A4 last-seen · A5 messaging path
 *   A6 platform-issue signals · A7 roster
 *
 * Runs SQL through the Supabase Management API. Token: SUPABASE_ACCESS_TOKEN
 * env, else the sbp_ token in .mcp.json.
 *
 *   node scripts/lc-discovery.mjs
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
    'profiles', 'students', 'groups', 'trainers', 'student_daily_activity',
    'unified_activity_log', 'xp_transactions', 'activity_feed', 'notifications',
    'direct_messages', 'dm_threads', 'help_requests', 'bug_reports', 'unit_progress',
    'student_curriculum_progress', 'classes', 'attendance',
    // the live DM carrier — see A5
    'group_messages',
  ]
  sub('which of the requested tables actually exist')
  const present = await sql(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN (${TABLES.map((t) => `'${t}'`).join(',')})
    ORDER BY table_name;`)
  const names = present.map((r) => r.table_name)
  for (const t of TABLES) console.log(`  ${names.includes(t) ? '✓' : '✗ MISSING'}  ${t}`)

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
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='must_change_password') AS present
    UNION ALL SELECT 'students.must_change_password',
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='must_change_password')
    UNION ALL SELECT 'students.payment_day',
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='payment_day')
    UNION ALL SELECT 'profiles.timezone',
      EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='timezone');`))
}

// ─────────────────────────────────────────────────────────────────────────────
async function a2() {
  h('A2 — ENUMS')
  sub('user_role — exact type name + values (needed for ALTER TYPE)')
  table(await sql(`
    SELECT t.typname AS enum_type_name, n.nspname AS schema,
           string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'user_role' GROUP BY 1,2;`))

  sub('other enums this build touches')
  table(await sql(`
    SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname IN ('student_status','package_type','track_type','message_type')
    GROUP BY 1 ORDER BY 1;`))

  sub('does the coach value already exist?')
  table(await sql(`
    SELECT EXISTS(SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
                  WHERE t.typname='user_role' AND e.enumlabel='coach') AS coach_exists;`))
}

// ─────────────────────────────────────────────────────────────────────────────
async function a3() {
  h('A3 — GENDER (Arabic messages are gendered; this is required)')
  sub('every gender-ish column in the schema')
  table(await sql(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema='public' AND column_name IN ('gender','sex','grammatical_gender')
    ORDER BY table_name;`))

  sub('constraint on it')
  table(await sql(`
    SELECT conrelid::regclass::text AS tbl, conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.students'::regclass AND pg_get_constraintdef(oid) ILIKE '%gender%';`))

  sub('coverage — how many active students actually have one')
  table(await sql(`
    SELECT coalesce(gender,'(null)') AS gender, count(*)
    FROM students WHERE deleted_at IS NULL AND status='active' GROUP BY 1 ORDER BY 2 DESC;`))
}

// ─────────────────────────────────────────────────────────────────────────────
async function a4() {
  h('A4 — LAST-SEEN SIGNAL')
  sub('row counts of every candidate — never build on a 0-row table')
  table(await sql(`
    SELECT 'activity_feed' AS t, count(*) FROM activity_feed
    UNION ALL SELECT 'xp_transactions', count(*) FROM xp_transactions
    UNION ALL SELECT 'unified_activity_log', count(*) FROM unified_activity_log
    UNION ALL SELECT 'student_daily_activity', count(*) FROM student_daily_activity
    UNION ALL SELECT 'student_curriculum_progress', count(*) FROM student_curriculum_progress
    UNION ALL SELECT 'submissions', count(*) FROM submissions
    UNION ALL SELECT 'student_streaks', count(*) FROM student_streaks
    UNION ALL SELECT 'student_notes', count(*) FROM student_notes
    UNION ALL SELECT 'churn_predictions', count(*) FROM churn_predictions;`))

  sub('per active student: every candidate side by side')
  table(await sql(`
    SELECT p.full_name,
      s.last_active_at                                                                  AS students_last_active_at,
      (SELECT max(d.activity_date) FROM student_daily_activity d WHERE d.student_id=s.id) AS max_daily_activity,
      (SELECT max(u.occurred_at) FROM unified_activity_log u WHERE u.student_id=s.id)     AS max_unified_log,
      (SELECT max(x.created_at)  FROM xp_transactions x WHERE x.student_id=s.id)          AS max_xp,
      (SELECT max(a.created_at)  FROM activity_feed a WHERE a.student_id=s.id)            AS max_activity_feed
    FROM students s JOIN profiles p ON p.id=s.id
    WHERE s.deleted_at IS NULL AND s.status='active'
    ORDER BY s.last_active_at DESC NULLS LAST;`))

  sub('freshness race — how often each beats students.last_active_at')
  table(await sql(`
    WITH c AS (
      SELECT s.id, s.last_active_at AS base,
        (SELECT max(x.created_at) FROM xp_transactions x WHERE x.student_id=s.id)      AS xp,
        (SELECT max(u.occurred_at) FROM unified_activity_log u WHERE u.student_id=s.id) AS ual,
        (SELECT max(a.created_at) FROM activity_feed a WHERE a.student_id=s.id)         AS feed,
        (SELECT max(c2.updated_at) FROM student_curriculum_progress c2 WHERE c2.student_id=s.id) AS scp
      FROM students s WHERE s.deleted_at IS NULL AND s.status='active')
    SELECT count(*) AS active_students,
      count(*) FILTER (WHERE xp   > coalesce(base,'epoch')) AS xp_fresher,
      count(*) FILTER (WHERE ual  > coalesce(base,'epoch')) AS unified_log_fresher,
      count(*) FILTER (WHERE feed > coalesce(base,'epoch')) AS activity_feed_fresher,
      count(*) FILTER (WHERE scp  > coalesce(base,'epoch')) AS curriculum_progress_fresher
    FROM c;`))
}

// ─────────────────────────────────────────────────────────────────────────────
async function a5() {
  h('A5 — EXISTING MESSAGING PATH (reuse, never invent a second one)')
  sub('legacy vs live message store')
  table(await sql(`
    SELECT 'direct_messages (legacy table)' AS store, count(*) FROM direct_messages
    UNION ALL SELECT 'group_messages WHERE dm_thread_id IS NOT NULL (live)', count(*)
      FROM group_messages WHERE dm_thread_id IS NOT NULL;`))

  sub('triggers on group_messages — what actually delivers the notification')
  table(await sql(`
    SELECT tgname, pg_get_triggerdef(t.oid) AS def
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='group_messages' AND NOT t.tgisinternal;`))

  sub('can_dm() — does it know about a coach?')
  const defs = await sql(`
    SELECT pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='can_dm';`)
  console.log(`  coach branch present: ${defs[0]?.def.includes("'coach'") ? 'YES' : 'NO  ← lc_send_message could not deliver'}`)

  sub('RLS on the delivery tables')
  table(await sql(`
    SELECT tablename, policyname, cmd, coalesce(qual,'-') AS qual, coalesce(with_check,'-') AS with_check
    FROM pg_policies WHERE schemaname='public' AND tablename IN ('dm_threads','group_messages','notifications')
    ORDER BY tablename, cmd, policyname;`))

  sub('app implementation')
  console.log('  src/features/chat/queries/useDM.js')
  console.log('    getOrCreateDMThread(otherId) → supabase.rpc("dm_get_or_create_thread", { p_other })')
  console.log('    useSendDM(threadId)          → insert into group_messages { dm_thread_id, sender_id, body }')
  console.log('    → trigger trg_dm_notify → dm_notify_push() → edge fn send-push-notification')
  console.log('      → writes the in-app notifications row AND sends web push, in one call')
}

// ─────────────────────────────────────────────────────────────────────────────
async function a6() {
  h('A6 — PLATFORM-ISSUE SIGNALS')
  for (const t of ['help_requests', 'bug_reports']) {
    sub(`${t} — shape`)
    table(await sql(`
      SELECT column_name, data_type, is_nullable FROM information_schema.columns
      WHERE table_schema='public' AND table_name='${t}' ORDER BY ordinal_position;`))
    sub(`${t} — how it links out`)
    table(await sql(`
      SELECT conname, pg_get_constraintdef(oid) AS def
      FROM pg_constraint WHERE conrelid='public.${t}'::regclass AND contype='f';`))
    sub(`${t} — counts by status`)
    table(await sql(`SELECT coalesce(status,'(null)') AS status, count(*) FROM ${t} GROUP BY 1 ORDER BY 2 DESC;`))
  }

  sub('open issues per active student (what the radar will surface)')
  table(await sql(`
    SELECT p.full_name,
      (SELECT count(*) FROM help_requests h WHERE h.student_id=s.id AND coalesce(h.status,'open') <> 'resolved') AS open_help,
      (SELECT count(*) FROM bug_reports b WHERE b.reporter_id=s.id AND b.status <> 'resolved') AS open_bugs
    FROM students s JOIN profiles p ON p.id=s.id
    WHERE s.deleted_at IS NULL AND s.status='active'
    ORDER BY 2 DESC, 3 DESC;`))
}

// ─────────────────────────────────────────────────────────────────────────────
async function a7() {
  h('A7 — ROSTER')
  sub('students by status / deleted')
  table(await sql(`
    SELECT coalesce(status::text,'(null)') AS status,
           count(*) FILTER (WHERE deleted_at IS NULL) AS live,
           count(*) FILTER (WHERE deleted_at IS NOT NULL) AS soft_deleted
    FROM students GROUP BY 1 ORDER BY 2 DESC;`))

  sub('active students per group')
  table(await sql(`
    SELECT coalesce(g.name,'(no group)') AS grp, coalesce(g.code,'—') AS code, count(*) AS students
    FROM students s LEFT JOIN groups g ON g.id=s.group_id
    WHERE s.deleted_at IS NULL AND s.status='active' GROUP BY 1,2 ORDER BY 3 DESC;`))

  sub('active students per package / level')
  table(await sql(`
    SELECT coalesce(package::text,'(none)') AS package, coalesce(academic_level::text,'—') AS level, count(*)
    FROM students WHERE deleted_at IS NULL AND status='active' GROUP BY 1,2 ORDER BY 3 DESC;`))

  sub('staff')
  table(await sql(`SELECT role::text, count(*) FROM profiles GROUP BY 1 ORDER BY 2 DESC;`))
}

// ─────────────────────────────────────────────────────────────────────────────
const t0 = Date.now()
console.log(`LEARNING COACH — PHASE A DISCOVERY\nproject ${REF}\nrun ${new Date().toISOString()}`)
for (const step of [a1, a2, a3, a4, a5, a6, a7]) await step()
console.log(`\n${'═'.repeat(78)}\nDone in ${((Date.now() - t0) / 1000).toFixed(1)}s — READ ONLY, nothing was written.`)
