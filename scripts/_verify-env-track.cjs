// Verifies the Environment Track «مسار البيئة» end-to-end as نورة's REAL session:
//  1. content integrity (service role): 10 stages / 30 lessons, each lesson has vocab+reading+comprehension
//  2. she can READ stages+lessons (RLS authenticated read)
//  3. the SECURITY DEFINER RPC completes a lesson for her (gate passes) — then cleaned up
//  4. a direct INSERT into env_track_progress is BLOCKED (no write policy)
// Run:  node scripts/_verify-env-track.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = 'neno19941@hotmail.com';
const PW = 'Fluentia2025!';
const NOURA_ID = 'f0be39e0-062d-47ab-864e-1a59704d75d7';

const svc = createClient(URL, SVC, { auth: { persistSession: false } });
let fails = 0;
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fails++; };

(async () => {
  // 1. content integrity (service role)
  const { count: sc } = await svc.from('env_track_stages').select('id', { count: 'exact', head: true });
  const { count: lc } = await svc.from('env_track_lessons').select('id', { count: 'exact', head: true });
  ok(sc === 10, `service: 10 stages (got ${sc})`);
  ok(lc === 30, `service: 30 lessons (got ${lc})`);
  const { data: lessons } = await svc.from('env_track_lessons').select('slug, content');
  const complete = (lessons || []).filter((l) => {
    const c = l.content || {};
    return Array.isArray(c.vocab) && c.vocab.length &&
           c.reading && Array.isArray(c.reading.paragraphs) && c.reading.paragraphs.length &&
           Array.isArray(c.comprehension) && c.comprehension.length;
  });
  ok(complete.length === 30, `every lesson has vocab+reading+comprehension (${complete.length}/30)`);

  // 2. + 3. + 4. as نورة's real session
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: auth, error: aErr } = await anon.auth.signInWithPassword({ email: EMAIL, password: PW });
  if (aErr) { ok(false, `sign in as نورة: ${aErr.message}`); return finish(); }
  ok(auth?.user?.id === NOURA_ID, `signed in as نورة (${auth?.user?.id})`);
  const her = createClient(URL, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } },
  });

  const { data: herStages, error: rsErr } = await her.from('env_track_stages').select('id');
  ok(!rsErr && herStages?.length === 10, `نورة reads 10 stages (got ${herStages?.length}, err=${rsErr?.message || '-'})`);
  const { data: herLessons } = await her.from('env_track_lessons').select('id, slug').limit(100);
  ok(herLessons?.length === 30, `نورة reads 30 lessons (got ${herLessons?.length})`);

  // pick the very first lesson (stage 1, sort 1) for the RPC test
  const { data: firstStage } = await svc.from('env_track_stages').select('id').eq('sort_order', 1).single();
  const { data: firstLesson } = await svc.from('env_track_lessons').select('id, slug').eq('stage_id', firstStage.id).eq('sort_order', 1).single();

  // 3. RPC completes (gate passes)
  const { data: rpcRow, error: rpcErr } = await her.rpc('env_track_complete_lesson', { p_lesson_id: firstLesson.id, p_score: 90 });
  ok(!rpcErr && rpcRow, `RPC env_track_complete_lesson works for نورة (err=${rpcErr?.message || '-'})`);

  // 4. direct INSERT blocked (no write policy)
  const { error: insErr } = await her.from('env_track_progress').insert({ student_id: NOURA_ID, lesson_id: firstLesson.id, status: 'completed', score: 10 });
  ok(!!insErr, `direct INSERT into env_track_progress is BLOCKED (err=${insErr?.message || 'NONE — LEAK!'})`);

  // cleanup: remove the RPC test progress row so her track starts clean at 0/30
  const { error: delErr } = await svc.from('env_track_progress').delete().eq('student_id', NOURA_ID);
  ok(!delErr, `cleanup: test progress removed (her track back to 0/30)`);
  const { count: leftover } = await svc.from('env_track_progress').select('id', { count: 'exact', head: true }).eq('student_id', NOURA_ID);
  ok(leftover === 0, `نورة has 0 progress rows after cleanup (got ${leftover})`);

  finish();
})();

function finish() {
  console.log(fails === 0 ? '\n✅ ALL ENV-TRACK CHECKS PASSED' : `\n💥 ${fails} CHECK(S) FAILED`);
  process.exit(fails === 0 ? 0 : 1);
}
