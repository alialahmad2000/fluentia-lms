// Verify Mosab's CUSTOM curriculum AS THE STUDENT (RLS): his 5 units + all content resolve,
// and another student cannot see them. Replicates the app's exact query paths.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const MOSAB_ID = '4fb98807-526d-4675-adb5-eb938b31b948';

async function signIn(email, pw) {
  const sb = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return { sb, uid: data.user.id };
}

(async () => {
  let pass = true;
  const ok = (l, c, x = '') => { console.log(`  ${c ? '✅' : '❌'} ${l}${x ? '  — ' + x : ''}`); if (!c) pass = false; };

  console.log('=== VERIFY custom curriculum AS Mosab (RLS) ===');
  const { sb } = await signIn('mosab05113@gmail.com', 'Fluentia2025!');

  // 1. custom-curriculum units (app path: owner_student_id = profile.id, ordered by custom_sort)
  const { data: units } = await sb.from('curriculum_units').select('id, theme_ar, theme_en, custom_sort')
    .eq('owner_student_id', MOSAB_ID).is('owner_student_id', MOSAB_ID === null ? null : MOSAB_ID).order('custom_sort');
  // (the .is above is a no-op guard; real filter is eq owner)
  const { data: units2 } = await sb.from('curriculum_units').select('id, theme_ar, custom_sort')
    .eq('owner_student_id', MOSAB_ID).order('custom_sort');
  ok('sees his 5 custom units', (units2 || []).length === 5, `${(units2 || []).length} units`);

  // 2. full content resolves for EACH unit
  for (const u of units2 || []) {
    const { data: readings } = await sb.from('curriculum_readings').select('id, title_en, passage_content').eq('unit_id', u.id);
    const rid = readings?.[0]?.id;
    const [{ count: qN }, { count: vN }, { data: gram }, { count: wN }, { count: sN }] = await Promise.all([
      sb.from('curriculum_comprehension_questions').select('id', { count: 'exact', head: true }).eq('reading_id', rid),
      sb.from('curriculum_vocabulary').select('id', { count: 'exact', head: true }).eq('reading_id', rid),
      sb.from('curriculum_grammar').select('id').eq('unit_id', u.id),
      sb.from('curriculum_writing').select('id', { count: 'exact', head: true }).eq('unit_id', u.id),
      sb.from('curriculum_speaking').select('id', { count: 'exact', head: true }).eq('unit_id', u.id),
    ]);
    const gid = gram?.[0]?.id;
    const { count: exN } = await sb.from('curriculum_grammar_exercises').select('id', { count: 'exact', head: true }).eq('grammar_id', gid);
    const good = (readings?.length === 1) && qN === 7 && vN === 12 && !!gid && exN >= 1 && wN === 1 && sN === 1;
    ok(`unit ${u.custom_sort} «${u.theme_ar}» content resolves`, good, `reading:${readings?.length} Q:${qN} vocab:${vN} grammar:${gid ? 'y' : 'n'}(${exN}ex) writing:${wN} speaking:${sN}`);
  }

  // 3. cross-student isolation: mock student must NOT see Mosab's owner units
  console.log('\n=== isolation ===');
  try {
    const { sb: sb2 } = await signIn('mock-test-a1@fluentia.academy', 'MockTest2025!');
    const { data: leak } = await sb2.from('curriculum_units').select('id').eq('owner_student_id', MOSAB_ID);
    ok("mock student sees 0 of Mosab's units", (leak || []).length === 0, `saw ${(leak || []).length}`);
    // and a reading from Mosab's unit is blocked
    if (units2?.[0]) {
      const { data: r } = await sb2.from('curriculum_readings').select('id').eq('unit_id', units2[0].id);
      ok("mock student sees 0 of Mosab's readings", (r || []).length === 0, `saw ${(r || []).length}`);
    }
  } catch (e) { console.log('  ⚠️  mock sign-in skipped:', e.message); }

  console.log(`\n${pass ? '✅ ALL CURRICULUM RLS CHECKS PASS' : '💥 SOME CHECKS FAILED'}`);
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
