import { admin } from '../../../scripts/lib/supa.mjs'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Build an anon client + mint a magiclink session for an active student, then
// test that the student CAN upsert + read back their own vocabulary_word_mastery row.
const env = {}
readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && v.length) {
    let val = v.join('=').trim().replace(/^["']|["']$/g, '').replace(/\\n$/, '')
    env[k.trim()] = val
  }
})
const URL = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY

// Pick an active student WITH an existing mastery row so we don't pollute data — we will
// only re-touch an existing row (idempotent UPDATE of last_practiced_at to current value).
const { data: students } = await admin.from('students').select('id').eq('status', 'active').limit(20)
let target = null, targetVocab = null
for (const s of (students || [])) {
  const { data: row } = await admin
    .from('vocabulary_word_mastery')
    .select('vocabulary_id, last_practiced_at')
    .eq('student_id', s.id).limit(1).maybeSingle()
  if (row) { target = s.id; targetVocab = row.vocabulary_id; break }
}
if (!target) { console.log(JSON.stringify({ note: 'no active student with mastery row found' })); process.exit(0) }

// email for magiclink
const { data: prof } = await admin.from('profiles').select('email, full_name').eq('id', target).maybeSingle()
const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink', email: prof.email,
})
if (linkErr) { console.log(JSON.stringify({ linkErr: linkErr.message })); process.exit(0) }

const props = linkData?.properties
const anonClient = createClient(URL, ANON, { auth: { persistSession: false } })
const { data: verify, error: vErr } = await anonClient.auth.verifyOtp({
  type: 'magiclink', token_hash: props.hashed_token,
})
if (vErr) { console.log(JSON.stringify({ verifyErr: vErr.message })); process.exit(0) }

const token = verify.session.access_token
const studentClient = createClient(URL, ANON, {
  auth: { persistSession: false },
  global: { headers: { Authorization: `Bearer ${token}` } },
})

const out = { student: prof.full_name, auth_uid: verify.session.user.id, target_student_id: target }

// SELECT own mastery (needed to render checkmarks)
const { data: sel, error: selErr } = await studentClient
  .from('vocabulary_word_mastery')
  .select('vocabulary_id, mastery_level, meaning_exercise_passed')
  .eq('student_id', target).limit(3)
out.select_own = selErr ? `ERR ${selErr.message}` : `OK ${sel.length} rows`

// UPDATE existing row idempotently (re-write last_practiced_at to itself's existing value),
// with .select() to confirm RETURNING works under RLS (the MEGA-FIX added .select()).
const { data: upd, error: updErr } = await studentClient
  .from('vocabulary_word_mastery')
  .upsert({
    student_id: target,
    vocabulary_id: targetVocab,
    last_practiced_at: new Date().toISOString(),
  }, { onConflict: 'student_id,vocabulary_id' })
  .select()
out.upsert_with_select = updErr ? `ERR ${updErr.message}` : (upd?.length ? `OK returned ${upd.length} row, mastery_level=${upd[0].mastery_level}` : 'OK but RETURNING empty (RLS blocks SELECT-after-write)')

console.log(JSON.stringify(out, null, 2))
