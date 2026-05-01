require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('❌ Missing env vars'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const STUDENT = {
  email: 'aresaee71@gmail.com',
  full_name: 'سعيد عارف',
  temp_password: 'Fluentia2025!',
  academic_level: 1,
  package: 'recordings',
  custom_price: 0,
  status: 'active',
  enrollment_date: new Date().toISOString().slice(0, 10),
  payment_day: 1,
};

async function main() {
  console.log('═══ PROVISIONING سعيد عارف ═══\n');

  // 1) Re-discover target group (المجموعة 2 at level=1)
  const { data: groups, error: gErr } = await supabase
    .from('groups').select('id, name, code, level').eq('level', 1).order('name');
  if (gErr) throw new Error(`groups lookup failed: ${gErr.message}`);
  const targetGroup = groups.find(g => g.name.includes('المجموعة 2')) || groups[0];
  if (!targetGroup) throw new Error('No Level 1 group found');
  console.log(`Target group: ${targetGroup.name} (${targetGroup.id})`);

  // 2) Idempotency check
  const { data: existing } = await supabase
    .from('profiles').select('id, email').ilike('email', STUDENT.email).maybeSingle();
  if (existing) {
    console.log(`⚠️  ${STUDENT.email} already exists (id=${existing.id}). Skipping.`);
    process.exit(0);
  }

  // 3) Create auth user
  console.log(`\nCreating auth user...`);
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: STUDENT.email,
    password: STUDENT.temp_password,
    email_confirm: true,
    user_metadata: { full_name: STUDENT.full_name },
  });
  if (authErr) throw new Error(`auth.createUser failed: ${authErr.message}`);
  const userId = authData.user.id;
  console.log(`   ✓ auth user id: ${userId}`);

  // 4) Insert profile
  console.log(`Inserting profile...`);
  const { error: pErr } = await supabase.from('profiles').insert({
    id: userId,
    full_name: STUDENT.full_name,
    email: STUDENT.email,
    role: 'student',
  });
  if (pErr) throw new Error(`profiles.insert failed: ${pErr.message}`);
  console.log(`   ✓ profile created`);

  // 5) Insert student row
  console.log(`Inserting student row...`);
  const { error: sErr } = await supabase.from('students').insert({
    id: userId,
    academic_level: STUDENT.academic_level,
    package: STUDENT.package,
    custom_price: STUDENT.custom_price,
    group_id: targetGroup.id,
    status: STUDENT.status,
    enrollment_date: STUDENT.enrollment_date,
    payment_day: STUDENT.payment_day,
  });
  if (sErr) throw new Error(`students.insert failed: ${sErr.message}`);
  console.log(`   ✓ student row created`);

  // 6) Set must_change_password on profiles (confirmed location from probe)
  console.log(`Setting must_change_password=true on profiles...`);
  const { error: flagErr } = await supabase
    .from('profiles').update({ must_change_password: true }).eq('id', userId);
  if (flagErr) throw new Error(`must_change_password update failed: ${flagErr.message}`);
  console.log(`   ✓ flag set`);

  // 7) Verify
  console.log(`\n🔍 Verification:`);
  const { data: verify } = await supabase
    .from('students')
    .select(`
      id, academic_level, package, custom_price, status, enrollment_date, payment_day,
      profile:profiles!inner(full_name, email, must_change_password),
      group:groups!inner(name, level)
    `)
    .eq('id', userId).single();
  console.log(JSON.stringify(verify, null, 2));

  console.log(`\n✅ DONE — سعيد عارف provisioned.`);
  console.log(`   Login URL: https://app.fluentia.academy`);
  console.log(`   Email:     ${STUDENT.email}`);
  console.log(`   Password:  ${STUDENT.temp_password}  (must change on first login)`);
  console.log(`   Package:   recordings (FREE — gift from Ali, custom_price=0)`);
}

main().catch(err => {
  console.error('💥 SCRIPT FAILED:', err.message);
  console.error(err);
  process.exit(1);
});
