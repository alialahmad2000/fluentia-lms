// scripts/add-students-2026-04-27.cjs
// Idempotent: safe to re-run. Skips email if it already exists.
// Provisions 1 student: علي سعيد القحطاني (A1 / tamayuz / 1500 SAR)
// First class was Apr 26, 2026 — account creation is catch-up.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Confirmed from Step 1.4: must_change_password lives on profiles
const MUST_CHANGE_TABLE = 'profiles';

const STUDENT = {
  full_name: 'علي سعيد القحطاني',
  email: 'alialq146@gmail.com',
  email_lower: 'alialq146@gmail.com',
  phone: null,
  package: 'tamayuz',
  custom_price: 1500,
  academic_level: 1,
  enrollment_date: '2026-04-26',
  payment_day: 26,
  status: 'active',
  temp_password: 'Fluentia2025!',
};

// Discovery found 3 level=1 groups; target is المجموعة 2 (trainer: goldmohmmed@gmail.com)
async function findA1GroupId() {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, level')
    .eq('level', 1)
    .eq('name', 'المجموعة 2');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('المجموعة 2 (level=1) not found');
  console.log(`📚 A1 group: ${data[0].name} (id: ${data[0].id})`);
  return data[0].id;
}

async function findExistingAuthUser(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('ADD STUDENT — علي سعيد القحطاني');
  console.log('═══════════════════════════════════════════════════════\n');

  const groupId = await findA1GroupId();

  // Capacity check (warn only, do not block)
  const { count: groupCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId)
    .eq('status', 'active');
  console.log(`📊 Current A1 active students: ${groupCount}`);
  if (groupCount >= 10) {
    console.log(`⚠️  WARNING: A1 group is at ${groupCount} students (cap is 10).`);
    console.log(`    Ali has approved this addition — student is already attending classes.`);
    console.log(`    Proceeding.\n`);
  }

  // 1) Check existing
  const existingAuth = await findExistingAuthUser(STUDENT.email);
  let userId;

  if (existingAuth) {
    console.log(`⚠️  ALREADY EXISTS in auth.users — SKIPPING create.`);
    console.log(`    user_id: ${existingAuth.id}`);
    userId = existingAuth.id;
  } else {
    // 2) Create auth user
    console.log(`🔐 Creating auth user...`);
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: STUDENT.email,
      password: STUDENT.temp_password,
      email_confirm: true,
      user_metadata: { full_name: STUDENT.full_name },
    });
    if (authErr) throw new Error(`Auth create failed: ${authErr.message}`);
    userId = authData.user.id;
    console.log(`   ✓ auth user created: ${userId}`);
  }

  // 3) Upsert profile
  console.log(`👤 Upserting profile...`);
  const profilePayload = {
    id: userId,
    full_name: STUDENT.full_name,
    email: STUDENT.email,
    role: 'student',
    phone: STUDENT.phone,
  };
  const { error: profErr } = await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' });
  if (profErr) throw new Error(`Profile upsert failed: ${profErr.message}`);
  console.log(`   ✓ profile upserted`);

  // 4) Upsert student row
  console.log(`🎓 Upserting student row...`);
  const studentPayload = {
    id: userId,
    academic_level: STUDENT.academic_level,
    package: STUDENT.package,
    custom_price: STUDENT.custom_price,
    group_id: groupId,
    enrollment_date: STUDENT.enrollment_date,
    payment_day: STUDENT.payment_day,
    status: STUDENT.status,
  };
  const { error: stuErr } = await supabase
    .from('students')
    .upsert(studentPayload, { onConflict: 'id' });
  if (stuErr) throw new Error(`Student upsert failed: ${stuErr.message}`);
  console.log(`   ✓ student row upserted`);

  // 5) Set must_change_password flag
  console.log(`🔑 Setting must_change_password=true on ${MUST_CHANGE_TABLE}...`);
  const { error: flagErr } = await supabase
    .from(MUST_CHANGE_TABLE)
    .update({ must_change_password: true })
    .eq('id', userId);
  if (flagErr) throw new Error(`must_change_password update failed: ${flagErr.message}`);
  console.log(`   ✓ flag set`);

  // 6) Verify
  console.log(`\n🔍 Verification:`);
  const { data: verify } = await supabase
    .from('students')
    .select(`
      id,
      academic_level, package, custom_price, status, enrollment_date, payment_day,
      profile:profiles!inner(full_name, email),
      group:groups!inner(name, level)
    `)
    .eq('id', userId)
    .single();
  console.log(JSON.stringify(verify, null, 2));

  console.log(`\n✅ DONE — علي سعيد القحطاني provisioned.`);
  console.log(`   Login URL: https://app.fluentia.academy`);
  console.log(`   Email:     ${STUDENT.email}`);
  console.log(`   Password:  ${STUDENT.temp_password}  (must change on first login)`);
}

main().catch(err => {
  console.error('💥 SCRIPT FAILED:', err.message);
  console.error(err);
  process.exit(1);
});
