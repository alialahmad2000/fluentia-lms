// RLS forge test for «محادثات جاهزة». Runs as REAL logged-in students (magiclink
// session), not service-role — a service-role read proves nothing about what a
// student can reach. Mirrors the phrase-bank verification.
//
//   node scripts/verify-mosab-dialogues-rls.cjs
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const ANON = process.env.VITE_SUPABASE_ANON_KEY
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
const MOSAB = '4fb98807-526d-4675-adb5-eb938b31b948'
const MOSAB_EMAIL = 'mosab05113@gmail.com'
const OTHER_EMAIL = 'khojah2002@gmail.com'   // a different real student (magiclink, no password needed)

const svc = createClient(URL, SVC, { auth: { persistSession: false } })
let pass = 0, fail = 0
const check = (label, ok, detail = '') => {
  console.log(`${ok ? '  ✅' : '  ❌'} ${label}${detail ? ' — ' + detail : ''}`)
  ok ? pass++ : fail++
}

/** Mint a real session without knowing the password. `hashed_token` is TOP-level. */
async function sessionFor(email) {
  const { data, error } = await svc.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) throw new Error(`generateLink ${email}: ${error.message}`)
  const token = data?.hashed_token || data?.properties?.hashed_token
  if (!token) throw new Error(`no hashed_token for ${email}`)
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: v, error: verr } = await anon.auth.verifyOtp({ token_hash: token, type: 'magiclink' })
  if (verr) throw new Error(`verifyOtp ${email}: ${verr.message}`)
  return createClient(URL, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${v.session.access_token}` } },
  })
}

;(async () => {
  console.log('\n── as مصعب (the owner) ───────────────────────────────────────')
  const mosab = await sessionFor(MOSAB_EMAIL)

  const { data: scen, error: sErr } = await mosab
    .from('dialogue_scenarios').select('id, scenario_key, full_audio_url')
    .eq('student_id', MOSAB).order('sort_order')
  check('reads his 15 scenarios', scen?.length === 15, sErr?.message || `${scen?.length}`)
  check('every scene has a full audio track', (scen || []).every((s) => s.full_audio_url))

  const ids = (scen || []).map((s) => s.id)
  const { data: lines } = await mosab.from('dialogue_lines').select('id, audio_url, start_ms').in('scenario_id', ids)
  check('reads all 184 lines', lines?.length === 184, `${lines?.length}`)
  check('every line has audio + timing', (lines || []).every((l) => l.audio_url && l.start_ms !== null))

  const { data: exprs } = await mosab.from('dialogue_expressions').select('id').in('scenario_id', ids)
  check('reads the 59 expressions', exprs?.length === 59, `${exprs?.length}`)

  // the ONLY legitimate write path
  const { error: rpcErr } = await mosab.rpc('dialogue_record_progress', {
    p_scenario_id: ids[0], p_stage: 'listened', p_score: null,
  })
  check('RPC records his own progress', !rpcErr, rpcErr?.message)
  const { error: rpc2 } = await mosab.rpc('dialogue_record_progress', {
    p_scenario_id: ids[0], p_stage: 'recall', p_score: 90,
  })
  check('RPC records a recall score', !rpc2, rpc2?.message)
  const { data: prog } = await mosab.from('dialogue_progress').select('*').eq('scenario_id', ids[0]).maybeSingle()
  check('progress row reflects both writes', prog?.listened === true && prog?.recall_best === 90,
    JSON.stringify(prog && { l: prog.listened, r: prog.recall_best, status: prog.status }))
  check('still «learning» (roleplay not done)', prog?.status === 'learning')

  // forged direct writes must be refused — there is NO insert/update policy
  const { error: fIns } = await mosab.from('dialogue_progress')
    .insert({ student_id: MOSAB, scenario_id: ids[1], recall_best: 100, status: 'mastered' })
  check('direct INSERT into progress BLOCKED', !!fIns, fIns?.code || fIns?.message)
  const { data: fUpd } = await mosab.from('dialogue_progress')
    .update({ status: 'mastered', roleplay_best: 100 }).eq('scenario_id', ids[0]).select()
  check('direct UPDATE of progress affects 0 rows', (fUpd?.length ?? 0) === 0)

  const { error: fLine } = await mosab.from('dialogue_lines').update({ text_en: 'hacked' }).eq('id', lines[0].id)
  const { data: reread } = await mosab.from('dialogue_lines').select('text_en').eq('id', lines[0].id).single()
  check('cannot rewrite his own content', reread.text_en !== 'hacked', fLine?.code || 'no rows updated')

  // out-of-range score is clamped, not stored
  await mosab.rpc('dialogue_record_progress', { p_scenario_id: ids[0], p_stage: 'roleplay', p_score: 900 })
  const { data: clamped } = await mosab.from('dialogue_progress').select('roleplay_best, status').eq('scenario_id', ids[0]).maybeSingle()
  check('score clamped to 100', clamped?.roleplay_best === 100, `${clamped?.roleplay_best}`)
  check('now «mastered» (recall 90 + roleplay 100)', clamped?.status === 'mastered')

  // unknown stage rejected
  const { error: badStage } = await mosab.rpc('dialogue_record_progress', { p_scenario_id: ids[0], p_stage: 'admin', p_score: 100 })
  check('unknown stage rejected', !!badStage, badStage?.message)

  // the entitlement flag is admin-only (Tier A guard)
  const { error: gErr } = await mosab.from('students').update({ uses_dialogues: false }).eq('id', MOSAB)
  check('cannot flip his own uses_dialogues', !!gErr, gErr?.code || gErr?.message)

  console.log('\n── as a DIFFERENT student ───────────────────────────────────')
  {
    const other = await sessionFor(OTHER_EMAIL)
    const { data: oScen } = await other.from('dialogue_scenarios').select('id')
    check('sees ZERO scenarios', (oScen?.length ?? 0) === 0, `${oScen?.length ?? 0}`)
    const { data: oLines } = await other.from('dialogue_lines').select('id').limit(5)
    check('sees ZERO lines', (oLines?.length ?? 0) === 0, `${oLines?.length ?? 0}`)
    const { data: oExpr } = await other.from('dialogue_expressions').select('id').limit(5)
    check('sees ZERO expressions', (oExpr?.length ?? 0) === 0, `${oExpr?.length ?? 0}`)
    const { data: oProg } = await other.from('dialogue_progress').select('*').limit(5)
    check('sees ZERO progress rows', (oProg?.length ?? 0) === 0, `${oProg?.length ?? 0}`)
    const { error: oRpc } = await other.rpc('dialogue_record_progress', { p_scenario_id: ids[0], p_stage: 'recall', p_score: 100 })
    check("RPC on someone else's scene refused", !!oRpc, oRpc?.message)
  }

  console.log('\n── as anon (logged out) ─────────────────────────────────────')
  const anon2 = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: aScen } = await anon2.from('dialogue_scenarios').select('id').limit(5)
  check('anon reads nothing', (aScen?.length ?? 0) === 0)
  const { error: aRpc } = await anon2.rpc('dialogue_record_progress', { p_scenario_id: ids[0], p_stage: 'recall', p_score: 100 })
  check('anon cannot call the RPC', !!aRpc, aRpc?.message)

  // leave his account pristine
  await svc.from('dialogue_progress').delete().eq('student_id', MOSAB)
  console.log('\n  (test progress rows removed — his account is back to a clean start)')

  console.log(`\n${fail === 0 ? '✅' : '❌'} ${pass} passed, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
})().catch((e) => { console.error(e.message); process.exit(1) })
