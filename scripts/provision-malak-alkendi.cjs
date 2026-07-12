// scripts/provision-malak-alkendi.cjs
// Phase B of MASTER-PROVISION-MALAK — creates Malak Bahashwan Al-Kendi's account.
// ملاك باحشوان الكندي, 27, female, B1 (level 3), private/فردي 3,000 SAR, custom curriculum.
// Idempotent (skips auth creation if the email already exists; upserts profile + student).
// Mirrors the proven add-student-*.cjs pattern + the private/custom flags Sara uses.
// NOTE: theme_key ('studio') is set later in the Phase D migration (column added there).

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

const DR_ALI_ID = 'e5528ced-b3e2-45bb-8c89-9368dc9b5b96'; // د. علي الأحمد (admin@fluentia.academy)

const STUDENT = {
  fullName: 'ملاك باحشوان الكندي',
  email: 'malakalkendi2@gmail.com', // stored lowercase
  password: 'fluentia2026',
  academicLevel: 3,                 // B1 (طلاقة / Fluency)
  package: 'private',               // الفردي — 3,000 SAR/month
  customPrice: 3000,
  gender: 'female',
  studyMode: 'group',               // mirror Sara (custom-curriculum student uses 'group' → full curriculum nav)
  missionAr: 'أقود اجتماعاتي وحملاتي التسويقية بالإنجليزية بثقة كاملة',
};

async function getExistingAuthUser(email) {
  const lower = email.toLowerCase();
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((u) => (u.email || '').toLowerCase() === lower);
    if (found) return found;
    if (data.users.length < 1000) return null;
    page++;
  }
}

async function provision(s) {
  console.log(`\n👤 ${s.fullName} <${s.email}>`);

  const existingAuth = await getExistingAuthUser(s.email);
  let userId;
  if (existingAuth) {
    console.log(`  ⏭️  Auth user exists (${existingAuth.id}) — skipping auth creation, upserting rows.`);
    userId = existingAuth.id;
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: s.email.toLowerCase(),
      password: s.password,
      email_confirm: true,
      user_metadata: { full_name: s.fullName },
    });
    if (createErr) throw new Error(`Auth create failed: ${createErr.message}`);
    userId = created.user.id;
    console.log(`  ✅ Auth user created: ${userId}`);
  }

  // profiles — must_change_password lives HERE (verified in discovery)
  const { data: prof, error: pErr } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, full_name: s.fullName, email: s.email.toLowerCase(), role: 'student', must_change_password: true },
      { onConflict: 'id' }
    )
    .select()
    .single();
  if (pErr) throw new Error(`Profile upsert failed: ${pErr.message}`);
  console.log('  ✅ profiles →', JSON.stringify({ id: prof.id, full_name: prof.full_name, role: prof.role, must_change_password: prof.must_change_password }));

  // students — private/custom config (mirrors Sara's flags; no group; trainer = Dr Ali)
  const { data: stu, error: sErr } = await supabase
    .from('students')
    .upsert(
      {
        id: userId,
        academic_level: s.academicLevel,
        package: s.package,
        custom_price: s.customPrice,
        gender: s.gender,
        study_mode: s.studyMode,
        group_id: null,
        assigned_trainer_id: DR_ALI_ID,
        uses_custom_curriculum: true,
        custom_mission_ar: s.missionAr,
        status: 'active',
        enrollment_date: new Date().toISOString().split('T')[0],
        payment_day: new Date().getDate(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();
  if (sErr) throw new Error(`Student upsert failed: ${sErr.message}`);
  console.log('  ✅ students →', JSON.stringify({
    id: stu.id, level: stu.academic_level, package: stu.package, price: stu.custom_price,
    gender: stu.gender, study_mode: stu.study_mode, group_id: stu.group_id,
    trainer: stu.assigned_trainer_id, uses_custom_curriculum: stu.uses_custom_curriculum,
    mission: stu.custom_mission_ar,
  }));

  return userId;
}

(async () => {
  try {
    const id = await provision(STUDENT);
    console.log('\n✅ Phase B done.');
    console.log(`   MALAK_ID=${id}`);
    console.log(`   LOGIN: ${STUDENT.email}  /  ${STUDENT.password}  (must change on first login)`);
  } catch (e) {
    console.error('\n💥 FATAL:', e.message);
    process.exit(1);
  }
})();
