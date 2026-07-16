// Verify the Business Track full data path under ظافر's student session, then clean up.
// Mirrors scripts/_verify-tech-track.cjs against biz_track_*.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DHAFER_ID = 'f1ebe336-fe3f-428f-957e-051458c516f5';

(async () => {
  const svc = createClient(URL, SVC, { auth: { persistSession: false } });

  // 1. gate already set at provisioning — assert it
  const { data: gate, error: gErr } = await svc.from('students').select('uses_biz_track').eq('id', DHAFER_ID).maybeSingle();
  console.log(gErr || !gate?.uses_biz_track ? `1. gate FAIL: ${gErr?.message || 'uses_biz_track is false'}` : '1. ✅ uses_biz_track=true for ظافر');

  // 2. sign in as him (temp password — pre-handoff verification)
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: auth, error: aErr } = await anon.auth.signInWithPassword({ email: 'al-quhidan@hotmail.com', password: 'Fluentia2025!' });
  if (aErr) { console.error('signIn FAIL:', aErr.message); process.exit(1); }
  const asStudent = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } }, auth: { persistSession: false } });

  // 3. read content as student (RLS: authenticated read)
  const { data: stages, error: sErr } = await asStudent.from('biz_track_stages').select('id, slug, title_ar').order('sort_order');
  const { data: lessons, error: lErr } = await asStudent.from('biz_track_lessons').select('id, slug').order('sort_order');
  console.log(`3. student reads: stages=${stages?.length ?? 'ERR'} lessons=${lessons?.length ?? 'ERR'} ${sErr||lErr ? '('+((sErr||lErr).message)+')' : ''}`);

  // 4. own progress empty
  const { data: p0 } = await asStudent.from('biz_track_progress').select('lesson_id').eq('student_id', DHAFER_ID);
  console.log(`4. own progress before: ${p0?.length ?? 0}`);

  // 5. complete a lesson via RPC (derives student from auth.uid())
  const firstLesson = lessons?.[0];
  const { data: rpcRow, error: rErr } = await asStudent.rpc('biz_track_complete_lesson', { p_lesson_id: firstLesson.id, p_score: 90 });
  console.log(`5. RPC complete_lesson: ${rErr ? 'FAIL '+rErr.message : 'ok status='+rpcRow?.status+' score='+rpcRow?.score}`);

  // 5b. best-score keeping: lower score must NOT overwrite
  const { data: rpcRow2, error: rErr2 } = await asStudent.rpc('biz_track_complete_lesson', { p_lesson_id: firstLesson.id, p_score: 40 });
  console.log(`5b. best-score kept: ${rErr2 ? 'FAIL '+rErr2.message : (rpcRow2?.score === 90 ? '✅ 90 kept' : '❌ overwritten to '+rpcRow2?.score)}`);

  // 6. progress now visible to him
  const { data: p1 } = await asStudent.from('biz_track_progress').select('lesson_id, status, score').eq('student_id', DHAFER_ID);
  console.log(`6. own progress after: ${p1?.length ?? 0} ${p1?.[0] ? JSON.stringify(p1[0]) : ''}`);

  // 7. direct INSERT to progress must be blocked (no write policy → RPC-only)
  const { error: insErr } = await asStudent.from('biz_track_progress').insert({ student_id: DHAFER_ID, lesson_id: lessons[1].id, status: 'completed' });
  console.log(`7. direct insert blocked (expect error): ${insErr ? '✅ blocked' : '❌ LEAK — direct write allowed'}`);

  // 7b. cross-track hygiene: he can read tech content (by design) but tech RPC still writes only HIS row — no interference to check; instead assert he cannot read another student's biz progress
  const { data: other } = await asStudent.from('biz_track_progress').select('student_id').neq('student_id', DHAFER_ID);
  console.log(`7b. other students' progress rows visible: ${other?.length ?? 0} ${!other || other.length === 0 ? '✅' : '❌ LEAK'}`);

  await anon.auth.signOut();

  // 8. cleanup his test progress → pristine for his real first run
  const { error: dErr } = await svc.from('biz_track_progress').delete().eq('student_id', DHAFER_ID);
  const { count: leftover } = await svc.from('biz_track_progress').select('id', { count: 'exact', head: true }).eq('student_id', DHAFER_ID);
  console.log(`8. cleanup: ${dErr ? dErr.message : 'done'} — leftover progress rows for ظافر: ${leftover}`);

  const ok = !gErr && gate?.uses_biz_track === true && stages?.length === 10 && lessons?.length === 30 && (p0?.length ?? 0) === 0 &&
             rpcRow?.status === 'completed' && rpcRow2?.score === 90 && (p1?.length ?? 0) === 1 && !!insErr &&
             (!other || other.length === 0) && leftover === 0;
  console.log(ok ? '\n✅ BIZ TRACK verification PASSED' : '\n❌ verification FAILED');
  if (!ok) process.exit(1);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
