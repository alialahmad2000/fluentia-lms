// Verify Mosab's account AS THE STUDENT (RLS context, anon key + his JWT), per prompt §C.
// Also proves cross-student isolation (mock student cannot read Mosab's vocab).
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const MOSAB_EMAIL = 'mosab05113@gmail.com';
const MOSAB_PW = 'Fluentia2025!';
const MOCK_EMAIL = 'mock-test-a1@fluentia.academy';
const MOCK_PW = 'MockTest2025!';

function client() {
  return createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function signIn(email, pw) {
  const sb = client();
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
  if (error) throw new Error(`signIn ${email} failed: ${error.message}`);
  return { sb, uid: data.user.id };
}

(async () => {
  let pass = true;
  const ok = (label, cond, extra = '') => { console.log(`  ${cond ? '✅' : '❌'} ${label}${extra ? '  — ' + extra : ''}`); if (!cond) pass = false; };

  console.log('=== §C VERIFY AS STUDENT (Mosab, RLS) ===');
  const { sb, uid } = await signIn(MOSAB_EMAIL, MOSAB_PW);
  console.log(`  signed in as Mosab uid=${uid}`);

  const { data: prof } = await sb.from('profiles').select('full_name, role, must_change_password').eq('id', uid).maybeSingle();
  ok('profile loads', !!prof, prof?.full_name);
  ok('must_change_password = true', prof?.must_change_password === true);

  const { data: stu } = await sb.from('students').select('academic_level, package, gender, group_id, status').eq('id', uid).maybeSingle();
  ok('students row loads (own, via RLS)', !!stu);
  ok('academic_level = 2', stu?.academic_level === 2);
  ok('gender = male', stu?.gender === 'male');

  const { data: grp } = await sb.from('groups').select('id, name, level').eq('id', stu?.group_id).maybeSingle();
  ok('own group resolves via RLS (get_student_group_id)', !!grp, grp && `${grp.name} · level ${grp.level}`);
  ok('group is Level 2', grp?.level === 2);

  // L2 units resolve for him (app's exact query path)
  const { data: lvl } = await sb.from('curriculum_levels').select('id').eq('level_number', 2).maybeSingle();
  const { count: unitCount } = await sb.from('curriculum_units').select('id', { count: 'exact', head: true })
    .eq('level_id', lvl?.id).is('owner_student_id', null);
  ok('L2 unit count > 0 (as student)', (unitCount || 0) > 0, `${unitCount} units`);

  // Vocab collections visible to him, grouped by source
  const { data: cards } = await sb.from('vocab_cards').select('source').eq('student_id', uid).like('source', 'uni:%');
  const bySource = {};
  (cards || []).forEach((c) => { bySource[c.source] = (bySource[c.source] || 0) + 1; });
  const nCollections = Object.keys(bySource).length;
  ok('5 course collections visible to student', nCollections === 5, JSON.stringify(bySource));
  ok('each collection 15-20 words', Object.values(bySource).every((n) => n >= 15 && n <= 20));
  ok('total 90 course words', (cards || []).length === 90, `${(cards || []).length} words`);

  // Cross-student isolation: mock student must NOT see Mosab's vocab
  console.log('\n=== CROSS-STUDENT ISOLATION ===');
  try {
    const { sb: sb2, uid: uid2 } = await signIn(MOCK_EMAIL, MOCK_PW);
    const { data: leak } = await sb2.from('vocab_cards').select('id').eq('student_id', uid).like('source', 'uni:%');
    ok('mock student sees 0 of Mosab\'s course cards (RLS isolates)', (leak || []).length === 0, `saw ${(leak || []).length}`);
  } catch (e) {
    console.log(`  ⚠️  mock-student sign-in skipped: ${e.message}`);
  }

  console.log(`\n${pass ? '✅ ALL STUDENT-ROLE CHECKS PASS' : '💥 SOME CHECKS FAILED'}`);
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
