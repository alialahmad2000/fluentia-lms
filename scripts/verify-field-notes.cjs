#!/usr/bin/env node
/**
 * «دفتر الميدان» verification — runs the app's EXACT student-side query against
 * production, twice, from two different identities:
 *
 *   1. anon / unauthenticated  → must return 0 rows.
 *      This is the check that matters. The platform has shipped a table before
 *      whose answer keys any logged-in caller could read straight off the API, so
 *      "the page works" is never sufficient evidence — the query has to be proven
 *      to return nothing when it should.
 *
 *   2. service role (RLS bypassed) → must return the seeded rows.
 *      Proves the data is really there, so a 0 from step 1 is RLS doing its job
 *      rather than an empty table.
 *
 * The authenticated-student path is covered separately by driving the real UI in
 * a real non-admin session (admin-only testing hides RLS failures).
 *
 * Usage: node scripts/verify-field-notes.cjs
 */
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const MALAK = '28a83f30-9474-4869-8f08-f63dc40c767d'

if (!URL || !ANON || !SERVICE) {
  console.error('missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

/** Byte-for-byte the query FieldNotes.jsx issues. */
const studentQuery = (client, studentId) =>
  client
    .from('field_notes')
    .select('*, field_note_exercises(*)')
    .eq('student_id', studentId)
    .eq('is_published', true)
    .order('occurred_on', { ascending: false, nullsFirst: false })
    .order('sort_order', { ascending: true })

const main = async () => {
  let failed = false
  const check = (label, pass, detail) => {
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
    if (!pass) failed = true
  }

  // 1 · anonymous caller
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: anonRows, error: anonErr } = await studentQuery(anon, MALAK)
  check(
    'anonymous read of the student query returns 0 rows',
    (anonRows || []).length === 0,
    `rows=${(anonRows || []).length}${anonErr ? ` err=${anonErr.message}` : ''}`,
  )

  const { data: anonEx } = await anon.from('field_note_exercises').select('id, answer')
  check(
    'anonymous read of field_note_exercises returns 0 rows',
    (anonEx || []).length === 0,
    `rows=${(anonEx || []).length}`,
  )

  // 2 · service role — the data really is there
  const svc = createClient(URL, SERVICE, { auth: { persistSession: false } })
  const { data: rows, error } = await studentQuery(svc, MALAK)
  if (error) { console.error('service query failed:', error.message); process.exit(1) }

  const n = (rows || []).length
  check('service-role student query returns Malak\'s notes', n > 0, `rows=${n}`)
  check('exactly 10 published notes', n === 10, `rows=${n}`)

  const exCounts = (rows || []).map((r) => (r.field_note_exercises || []).length)
  const total = exCounts.reduce((a, b) => a + b, 0)
  check('every note has >= 3 exercises', exCounts.every((c) => c >= 3), `min=${Math.min(...exCounts)} total=${total}`)

  const { data: others } = await svc
    .from('field_notes').select('student_id').neq('student_id', MALAK)
  const strays = (others || []).filter((r) => r.student_id !== MALAK)
  console.log(`INFO  rows on other students: ${strays.length}` +
    (strays.length ? ' (test account fixture — see report)' : ''))

  // forbidden marketing vocabulary must never reach a student surface
  const BANNED = ['معهد', 'دورة', 'مذهل', 'مميز', 'استثنائية', 'الأفضل', 'حبيبتي', 'كلاس تجريبي']
  const blob = JSON.stringify(rows)
  const hits = BANNED.filter((w) => blob.includes(w))
  check('no forbidden words in the copy', hits.length === 0, hits.join(', ') || 'clean')

  console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS')
  process.exit(failed ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
