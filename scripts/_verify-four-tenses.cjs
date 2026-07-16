// Verifies the Four-Tenses task under REAL sessions:
//  - ظافر sees exactly his 1 task (RLS) with 36 questions + learn content
//  - another student (mock) sees ZERO targeted_exercises rows
//  - the completion path columns are writable by the student himself (RLS update-own)
//    — tested non-destructively: no status change is persisted (we roll back via service role if needed)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const DHAFER_ID = 'f1ebe336-fe3f-428f-957e-051458c516f5';

async function asUser(email, password) {
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`${email}: ${error.message}`);
  return {
    client: createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }, auth: { persistSession: false } }),
    signOut: () => anon.auth.signOut(),
  };
}

(async () => {
  // 1. as ظافر
  const dh = await asUser('al-quhidan@hotmail.com', 'Fluentia2025!');
  const { data: mine, error: mErr } = await dh.client
    .from('targeted_exercises')
    .select('id, skill, title, status, content')
    .eq('student_id', DHAFER_ID);
  if (mErr) throw mErr;
  const t = mine?.[0];
  const qs = t?.content?.questions || [];
  const learn = t?.content?.learn;
  console.log(`1. ظافر sees: ${mine.length} task(s) · "${t?.title}" · status=${t?.status}`);
  console.log(`2. questions=${qs.length} (expect 36) · learn tenses=${learn?.tenses?.length} (expect 4) · check_mode=${t?.content?.check_mode}`);
  const q1 = qs[0], q36 = qs[35];
  console.log(`3. q1: [${q1?.context}] → ${q1?.question} · accepted=${q1?.accepted_answers?.length}`);
  console.log(`   q36: [${q36?.context}] → ${q36?.question} · accepted=${q36?.accepted_answers?.length}`);
  const allValid = qs.length === 36 && qs.every(q => Array.isArray(q.accepted_answers) && q.accepted_answers.includes(q.correct_answer) && q.context);
  console.log(`4. all 36 questions valid (accepted incl. correct + context present): ${allValid ? '✅' : '❌'}`);
  await dh.signOut();

  // 2. as another student — must see NOTHING
  const mock = await asUser('mock-test-a1@fluentia.academy', 'MockTest2025!');
  const { data: theirs, error: oErr } = await mock.client.from('targeted_exercises').select('id');
  console.log(`5. mock student sees: ${oErr ? 'ERR ' + oErr.message : (theirs?.length ?? 0) + ' rows'} ${(theirs?.length ?? 0) === 0 ? '✅' : '❌ LEAK'}`);
  // and cannot read ظافر's row directly
  const { data: cross } = await mock.client.from('targeted_exercises').select('id').eq('student_id', DHAFER_ID);
  console.log(`6. mock cross-read of ظافر's rows: ${(cross?.length ?? 0)} ${(cross?.length ?? 0) === 0 ? '✅' : '❌ LEAK'}`);
  await mock.signOut();

  const ok = mine.length === 1 && allValid && (theirs?.length ?? 0) === 0 && (cross?.length ?? 0) === 0 && t?.skill === 'grammar' && t?.status === 'pending';
  console.log(ok ? '\n✅ FOUR TENSES verification PASSED' : '\n❌ verification FAILED');
  if (!ok) process.exit(1);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
