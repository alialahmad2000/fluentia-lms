#!/usr/bin/env node
// Seed an IT-Infrastructure individual-track DEMO student (like سلطان, but the IT specialization).
// Lets us showcase / screenshot the mission-based experience WITHOUT touching Sara's live account.
// Idempotent. Uses the JS admin client (legacy service key works for auth.admin + inserts here).
// Usage: node scripts/seed-individual-demo-it.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient((process.env.VITE_SUPABASE_URL || '').trim(), process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const EMAIL = 'indiv-demo-it@fluentia.academy';
const PASSWORD = 'Fluentia2025!';
const FULL_NAME = 'نورة القحطاني (تجريبي — مسار فردي)';
const DISPLAY = 'نورة';
const SPEC_SLUG = 'it_infrastructure';

async function getExistingUser(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const f = data.users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (f) return f;
    if (data.users.length < 1000) return null;
    page++;
  }
}

(async () => {
  const { data: spec } = await sb.from('specializations').select('id, title_en').eq('slug', SPEC_SLUG).single();
  if (!spec) throw new Error(`specialization ${SPEC_SLUG} not found — run seed-it-track.cjs first`);

  let user = await getExistingUser(EMAIL);
  if (user) { console.log('auth user exists:', user.id); }
  else {
    const { data, error } = await sb.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true, user_metadata: { full_name: FULL_NAME } });
    if (error) throw new Error('createUser: ' + error.message);
    user = data.user; console.log('auth user created:', user.id);
  }
  const id = user.id;

  const { data: prof, error: pErr } = await sb.from('profiles')
    .upsert({ id, full_name: FULL_NAME, display_name: DISPLAY, email: EMAIL.toLowerCase(), role: 'student', is_test_account: true, must_change_password: false }, { onConflict: 'id' })
    .select('id, role, is_test_account');
  if (pErr) throw new Error('profiles: ' + pErr.message);
  console.log('profile:', prof.length === 1 ? 'ok' : 'FAIL');

  const { data: stu, error: sErr } = await sb.from('students')
    .upsert({ id, study_mode: 'individual', specialization_id: spec.id, group_id: null, academic_level: 3, package: 'private', gender: 'female', status: 'active', onboarding_completed: true, uses_custom_curriculum: false, deleted_at: null }, { onConflict: 'id' })
    .select('id, study_mode, specialization_id');
  if (sErr) throw new Error('students: ' + sErr.message);
  if (stu.length !== 1) throw new Error('students upsert expected 1 row');
  console.log('student:', JSON.stringify(stu[0]));
  console.log(`\n✅ IT demo ready — ${EMAIL} / ${PASSWORD} · ${spec.title_en} · study_mode=individual`);
})().catch((e) => { console.error('💥', e.message); process.exit(1); });
