// B5 completion-path proof on a THROWAWAY targeted_exercises row (ظافر's real task stays pending):
// replicates StudentExercises.submitMutation writes under HIS session, asserts score/status/XP,
// then fully cleans up (row + xp transaction + xp_total decrement).
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ID = 'f1ebe336-fe3f-428f-957e-051458c516f5';

(async () => {
  const svc = createClient(URL, SVC, { auth: { persistSession: false } });

  // throwaway 2-question exercise
  const { data: ins, error: iErr } = await svc.from('targeted_exercises').insert({
    student_id: ID, pattern_id: null, skill: 'grammar', title: '__SMOKE__ completion path',
    instructions: 'smoke', difficulty: 'easy', status: 'pending',
    content: { type: 'rewrite', questions: [
      { id: 'q1', question: 'neg', correct_answer: "She doesn't teach.", accepted_answers: ["She doesn't teach.", 'She does not teach.'] },
      { id: 'q2', question: 'yn', correct_answer: 'Does she teach?', accepted_answers: ['Does she teach?'] },
    ] },
  }).select('id');
  if (iErr || ins?.length !== 1) throw new Error(`throwaway insert failed: ${iErr?.message}`);
  const exId = ins[0].id;

  const { data: before } = await svc.from('students').select('xp_total').eq('id', ID).maybeSingle();

  // as ظافر — exactly what submitMutation writes (1 correct, 1 wrong → 50% → 5 XP)
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: auth, error: aErr } = await anon.auth.signInWithPassword({ email: 'al-quhidan@hotmail.com', password: 'Fluentia2025!' });
  if (aErr) throw aErr;
  const asS = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } }, auth: { persistSession: false } });

  const answers = { q1: 'She does not teach.', q2: 'She teaches?' }; // q1 ✓ (variant), q2 ✗
  const score = 50, xp = 5;
  const { data: up, error: uErr } = await asS.from('targeted_exercises').update({
    status: 'completed', score, student_answers: answers, xp_awarded: xp, completed_at: new Date().toISOString(),
  }).eq('id', exId).select('id, status, score');
  console.log(`1. student completes row: ${uErr ? '❌ ' + uErr.message : (up?.length === 1 && up[0].status === 'completed' ? '✅ status=completed score=' + up[0].score : '❌ 0 rows')}`);

  const { data: xpIns, error: xErr } = await asS.from('xp_transactions').insert({
    student_id: ID, amount: xp, reason: 'custom', description: 'إكمال تمرين مخصص: __SMOKE__',
  }).select('id');
  console.log(`2. xp transaction insert: ${xErr ? '❌ ' + xErr.message : (xpIns?.length === 1 ? '✅' : '❌ 0 rows')}`);
  await anon.auth.signOut();

  const { data: after } = await svc.from('students').select('xp_total').eq('id', ID).maybeSingle();
  const delta = (after?.xp_total ?? 0) - (before?.xp_total ?? 0);
  console.log(`3. xp_total trigger: ${before?.xp_total} → ${after?.xp_total} (Δ${delta}) ${delta === xp ? '✅' : '❌'}`);

  // cleanup: throwaway row + xp transaction + revert xp_total
  const { error: d1 } = await svc.from('targeted_exercises').delete().eq('id', exId);
  const { error: d2 } = await svc.from('xp_transactions').delete().eq('id', xpIns[0].id);
  const { error: d3 } = await svc.from('students').update({ xp_total: before?.xp_total ?? 0 }).eq('id', ID).select('id');
  const { data: real } = await svc.from('targeted_exercises').select('status, title').eq('student_id', ID);
  const pristine = real?.length === 1 && real[0].status === 'pending' && !real[0].title.includes('__SMOKE__');
  console.log(`4. cleanup: ${d1 || d2 || d3 ? '❌' : '✅'} — real task pristine: ${pristine ? '✅' : '❌ ' + JSON.stringify(real)}`);

  const ok = up?.length === 1 && xpIns?.length === 1 && delta === xp && !d1 && !d2 && !d3 && pristine;
  console.log(ok ? '\n✅ COMPLETION PATH verification PASSED' : '\n❌ FAILED');
  if (!ok) process.exit(1);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
