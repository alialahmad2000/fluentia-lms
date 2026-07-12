// scripts/verify-malak.cjs — Phase E verification for MASTER-PROVISION-MALAK.
// Uses the ANON key + a real sign-in as Malak (RLS applies exactly as it will for her).

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
if (!URL || !ANON) { console.error('❌ Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY'); process.exit(1); }

const MALAK_ID = '28a83f30-9474-4869-8f08-f63dc40c767d';
const SARA_ID = 'fc68652d-c4cb-402f-a271-f17a5a4483b1';
const EMAIL = 'malakalkendi2@gmail.com';
const PASS = 'fluentia2026';

let pass = 0, fail = 0;
const ok = (label, cond, extra = '') => { console.log(`  ${cond ? '✅' : '❌'} ${label}${extra ? ' — ' + extra : ''}`); cond ? pass++ : fail++; };

(async () => {
  const anon = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });

  // E1 — sign in as Malak
  const { data: auth, error: authErr } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASS });
  ok('E1 sign-in as Malak succeeds', !authErr && auth?.user?.id === MALAK_ID, authErr ? authErr.message : `uid ${auth?.user?.id}`);
  if (authErr) { console.log(`\nRESULT: ${pass} pass / ${fail} fail`); process.exit(1); }

  const supa = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // E1b — must_change_password true (read own profile under RLS)
  const { data: prof } = await supa.from('profiles').select('must_change_password, full_name, role').eq('id', MALAK_ID).maybeSingle();
  ok('E1b must_change_password is true', prof?.must_change_password === true);
  ok('E1c profile name/role correct', prof?.full_name === 'ملاك باحشوان الكندي' && prof?.role === 'student');

  // E2 — her curriculum shows exactly 10 owned units (the query useLevelJourney runs)
  const { data: units } = await supa.from('curriculum_units')
    .select('id, custom_sort, theme_ar, is_published')
    .eq('owner_student_id', MALAK_ID).order('custom_sort', { ascending: true });
  ok('E2 exactly 10 owned units, all published', units?.length === 10 && units.every((u) => u.is_published), `${units?.length} units`);
  const sorts = (units || []).map((u) => u.custom_sort).join(',');
  ok('E2b ordered 1..10', sorts === '1,2,3,4,5,6,7,8,9,10', sorts);

  // E2c — Unit 1 children all readable & non-empty (what Unit Journey renders)
  const u1 = (units || []).find((u) => u.custom_sort === 1);
  const { data: r1 } = await supa.from('curriculum_readings').select('id, passage_content, title_ar').eq('unit_id', u1.id).maybeSingle();
  const paras = r1?.passage_content?.paragraphs || [];
  ok('E2c Unit 1 reading passage present', paras.length >= 2 && paras.join(' ').length > 200, `${paras.length} paragraphs`);
  const { count: qC } = await supa.from('curriculum_comprehension_questions').select('id', { count: 'exact', head: true }).eq('reading_id', r1.id);
  ok('E2d Unit 1 has comprehension questions', qC === 5, `${qC} Qs`);
  const { count: vC } = await supa.from('curriculum_vocabulary').select('id', { count: 'exact', head: true }).eq('reading_id', r1.id);
  ok('E2e Unit 1 has vocabulary', vC === 9, `${vC} vocab`);
  const { data: g1 } = await supa.from('curriculum_grammar').select('id, topic_name_ar, explanation_content').eq('unit_id', u1.id).maybeSingle();
  const secs = g1?.explanation_content?.sections || [];
  ok('E2f Unit 1 grammar renders (content_ar present)', secs.length > 0 && !!secs[0]?.content_ar, g1?.topic_name_ar);
  const { count: geC } = await supa.from('curriculum_grammar_exercises').select('id', { count: 'exact', head: true }).eq('grammar_id', g1.id);
  ok('E2g Unit 1 grammar exercise present', geC === 1, `${geC} exercise`);
  const { data: sp1 } = await supa.from('curriculum_speaking').select('id, useful_phrases, prompt_ar').eq('unit_id', u1.id).maybeSingle();
  ok('E2h Unit 1 speaking task renders', !!sp1?.prompt_ar && (sp1?.useful_phrases || []).length >= 6, `${(sp1?.useful_phrases || []).length} phrases`);

  // E3 — RLS: Malak CANNOT see Sara's owner-scoped units (owner isolation)
  const { data: saraUnits } = await supa.from('curriculum_units').select('id').eq('owner_student_id', SARA_ID);
  ok('E3 Malak cannot see Sara\'s owned units (RLS)', (saraUnits || []).length === 0, `${saraUnits?.length ?? 0} visible`);

  // E4 — theme_key on Malak's own row (drives Studio identity)
  const { data: me } = await supa.from('students').select('theme_key, uses_custom_curriculum, custom_mission_ar').eq('id', MALAK_ID).maybeSingle();
  ok('E4 Malak theme_key = studio', me?.theme_key === 'studio', me?.theme_key);
  ok('E4b mission present (drives StudioHero)', !!me?.custom_mission_ar);

  await anon.auth.signOut();
  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
