// Asserts the entitlement guard still lets an ADMIN (client-side, authenticated role) change
// protected student columns — the placement-queue «اعتماد المستوى» write path.
// Uses the magiclink admin-session trick on the throwaway mock student (level 1 → 2 → 1).
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MOCK_ID = 'a82486b6-9472-4aba-b902-a0ec354ca170'; // mock-test-a1 (test account)

(async () => {
  const svc = createClient(URL, SVC, { auth: { persistSession: false } });
  const { data: link, error: lErr } = await svc.auth.admin.generateLink({ type: 'magiclink', email: 'admin@fluentia.academy' });
  if (lErr) throw lErr;
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data: sess, error: vErr } = await anon.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' });
  if (vErr) throw vErr;
  const asAdmin = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${sess.session.access_token}` } }, auth: { persistSession: false } });

  const { data: before } = await svc.from('students').select('academic_level').eq('id', MOCK_ID).maybeSingle();
  console.log('mock student level before:', before?.academic_level);

  const { data: up, error: uErr } = await asAdmin.from('students').update({ academic_level: 2 }).eq('id', MOCK_ID).select('academic_level');
  console.log('admin sets academic_level=2:', uErr ? '❌ BROKE → ' + uErr.message : (up?.[0]?.academic_level === 2 ? '✅ works' : '❌ 0 rows'));

  // revert via service role (always passes the guard)
  const { error: rErr } = await svc.from('students').update({ academic_level: before?.academic_level ?? 1 }).eq('id', MOCK_ID).select('id');
  console.log('reverted:', rErr ? rErr.message : '✅');

  await anon.auth.signOut();
  const ok = !uErr && up?.[0]?.academic_level === 2 && !rErr;
  console.log(ok ? '\n✅ ADMIN PATH verification PASSED' : '\n❌ verification FAILED');
  if (!ok) process.exit(1);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
