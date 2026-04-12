const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const SHARED_PASSWORD = 'Fluentia2025!';

const STUDENTS = [
  { name: 'ابتسام النجيدي', email: 'ebtesam22nj@gmail.com', level: 3, package: 'tamayuz', custom_price: 1500, target_group_level: 3 },
  { name: 'فاطمة محمد آل شريف', email: 'fatimamoh197@gmail.com', level: 1, package: 'talaqa', custom_price: 1100, target_group_level: 1 },
  { name: 'الهنوف القحطاني', email: 'hanoof1naif@gmail.com', level: 1, package: 'talaqa', custom_price: 1100, target_group_level: 1 },
  { name: 'عبدالرحمن الشمري', email: 'ajkl7618@gmail.com', level: 1, package: 'talaqa', custom_price: 1100, target_group_level: 1 },
  { name: 'وجدان الحارثي', email: 'wejdan.alharthi02@gmail.com', level: 3, package: 'private', custom_price: 2000, target_group_level: 3 },
];

async function main() {
  // Get target groups (the ones with active students)
  const { data: groupA1 } = await supabase
    .from('groups').select('id, name, level')
    .eq('id', 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb').single(); // المجموعة 2 (A1)
  const { data: groupB1 } = await supabase
    .from('groups').select('id, name, level')
    .eq('id', 'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa').single(); // المجموعة 4 (B1)

  if (!groupA1 || !groupB1) {
    console.error('Could not find target groups');
    process.exit(1);
  }
  console.log(`A1 group: ${groupA1.name} (${groupA1.id})`);
  console.log(`B1 group: ${groupB1.name} (${groupB1.id})`);

  const groups = { 1: groupA1, 3: groupB1 };

  for (const s of STUDENTS) {
    console.log(`\n--- Processing: ${s.name} (${s.email}) ---`);

    // Check if already exists
    const { data: existing } = await supabase
      .from('profiles').select('id, email').eq('email', s.email).maybeSingle();
    if (existing) {
      console.log(`SKIP: ${s.email} already exists (${existing.id})`);
      continue;
    }

    // 1. Create auth user
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: s.email,
      password: SHARED_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: s.name },
    });
    if (authErr) {
      console.error(`Auth create failed for ${s.email}:`, authErr.message);
      continue;
    }
    const userId = authData.user.id;
    console.log(`Auth user created: ${userId}`);

    // 2. Upsert profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: s.name,
        email: s.email,
        role: 'student',
        must_change_password: true,
      }, { onConflict: 'id' })
      .select();
    if (profileErr) {
      console.error(`Profile upsert failed for ${s.email}:`, profileErr.message);
      continue;
    }
    console.log(`Profile created: must_change_password=true`);

    // 3. Insert student record
    const targetGroup = groups[s.target_group_level];
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .insert({
        id: userId,
        academic_level: s.level,
        package: s.package,
        custom_price: s.custom_price,
        group_id: targetGroup.id,
        status: 'active',
        enrollment_date: new Date().toISOString().split('T')[0],
      })
      .select();
    if (studentErr) {
      console.error(`Student insert failed for ${s.email}:`, studentErr.message);
      continue;
    }
    console.log(`Student created in ${targetGroup.name} (${s.package}, ${s.custom_price} SAR)`);
  }

  // Verification
  console.log('\n\n=== VERIFICATION ===');
  const emails = STUDENTS.map(s => s.email);
  const { data: verify } = await supabase
    .from('students')
    .select('id, academic_level, package, custom_price, status, group_id, profiles:id(full_name, email, must_change_password)')
    .in('id', (await supabase.from('profiles').select('id').in('email', emails)).data?.map(p => p.id) || []);
  console.table(verify?.map(v => ({
    name: v.profiles?.full_name,
    email: v.profiles?.email,
    level: v.academic_level,
    package: v.package,
    price: v.custom_price,
    status: v.status,
    must_change_pwd: v.profiles?.must_change_password,
  })));

  // Group counts
  console.log('\n=== GROUP COUNTS ===');
  for (const [lvl, g] of Object.entries(groups)) {
    const { count } = await supabase.from('students')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', g.id).eq('status', 'active').is('deleted_at', null);
    console.log(`${g.name}: ${count} active students`);
  }

  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
