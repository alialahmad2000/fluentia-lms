// Verifies the students entitlement guard (migration 20260716100000) under a REAL student session:
// self-granting entitlements / self-extending subscription / self-promoting level must be BLOCKED,
// while benign self-updates (leaderboard opt-in, onboarding) still work.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const ID = 'f1ebe336-fe3f-428f-957e-051458c516f5'; // ظافر

(async () => {
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: auth, error } = await anon.auth.signInWithPassword({ email: 'al-quhidan@hotmail.com', password: 'Fluentia2025!' });
  if (error) throw error;
  const asS = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${auth.session.access_token}` } }, auth: { persistSession: false } });

  const { error: e1 } = await asS.from('students').update({ uses_pro_desk: true }).eq('id', ID).select('id');
  console.log('1. self-grant uses_pro_desk:', e1 ? '✅ blocked → ' + e1.message : '❌ LEAK — allowed');
  const { error: e2 } = await asS.from('students').update({ access_expires_at: '2030-01-01' }).eq('id', ID).select('id');
  console.log('2. self-extend access_expires_at:', e2 ? '✅ blocked' : '❌ LEAK — allowed');
  const { error: e3 } = await asS.from('students').update({ academic_level: 5 }).eq('id', ID).select('id');
  console.log('3. self-promote academic_level:', e3 ? '✅ blocked' : '❌ LEAK — allowed');
  const { data: d4, error: e4 } = await asS.from('students').update({ show_in_leaderboard: true }).eq('id', ID).select('id');
  console.log('4. benign show_in_leaderboard:', e4 ? '❌ broke → ' + e4.message : (d4?.length === 1 ? '✅ works' : '❌ 0 rows'));
  const { data: d5, error: e5 } = await asS.from('students').update({ onboarding_completed: false }).eq('id', ID).select('id');
  console.log('5. benign onboarding_completed:', e5 ? '❌ broke → ' + e5.message : (d5?.length === 1 ? '✅ works' : '❌ 0 rows'));
  await anon.auth.signOut();

  const ok = !!e1 && !!e2 && !!e3 && !e4 && d4?.length === 1 && !e5 && d5?.length === 1;
  console.log(ok ? '\n✅ ENTITLEMENT GUARD verification PASSED' : '\n❌ verification FAILED');
  if (!ok) process.exit(1);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
