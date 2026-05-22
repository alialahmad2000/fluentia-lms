// scripts/seed-mock-exam-test-students.cjs
// Idempotent: skip auth-user creation if email exists, then upsert profiles + students rows.
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// From Phase A
const L1_LEVEL_ID = '2755b494-c7ff-4bdc-96ac-7ab735dc038c';
const L3_LEVEL_ID = 'f7e8dbfb-ec8e-4491-a62d-f54fd4c41aab';
const L1_GROUP_ID = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb'; // المجموعة 2
const L3_GROUP_ID = 'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa'; // المجموعة 4

const TEST_STUDENTS = [
  {
    email: 'mock-test-a1@fluentia.academy',
    password: 'MockTest2025!',
    full_name: 'حساب تجريبي A1',
    academic_level: 1,
    group_id: L1_GROUP_ID,
    level_id_for_log: L1_LEVEL_ID,
  },
  {
    email: 'mock-test-b1@fluentia.academy',
    password: 'MockTest2025!',
    full_name: 'حساب تجريبي B1',
    academic_level: 3,
    group_id: L3_GROUP_ID,
    level_id_for_log: L3_LEVEL_ID,
  },
];

async function findUserByEmail(email) {
  // Paginate listUsers in case there are many users
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 200) return null;
    page++;
    if (page > 50) return null;
  }
}

async function seed() {
  for (const s of TEST_STUDENTS) {
    let userId;
    const existing = await findUserByEmail(s.email);
    if (existing) {
      console.log(`auth: user ${s.email} exists — id=${existing.id}`);
      userId = existing.id;
      // Ensure password is set to the documented one (in case it drifted)
      const { error: upErr } = await supabase.auth.admin.updateUserById(userId, {
        password: s.password,
        email_confirm: true,
      });
      if (upErr) {
        console.error('updateUserById failed:', upErr);
        process.exit(1);
      }
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: s.email,
        password: s.password,
        email_confirm: true,
      });
      if (error) {
        console.error('createUser failed:', error);
        process.exit(1);
      }
      userId = data.user.id;
      console.log(`auth: created ${s.email} — id=${userId}`);
    }

    // Upsert profile
    const { error: pErr } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          role: 'student',
          full_name: s.full_name,
          email: s.email,
          is_test_account: true,
          must_change_password: false,
        },
        { onConflict: 'id' }
      );
    if (pErr) {
      console.error('profile upsert failed:', pErr);
      process.exit(1);
    }

    // Upsert students row (FK to profiles.id)
    const { error: sErr } = await supabase
      .from('students')
      .upsert(
        {
          id: userId,
          academic_level: s.academic_level,
          group_id: s.group_id,
          package: 'asas',
          track: 'foundation',
          status: 'active',
        },
        { onConflict: 'id' }
      );
    if (sErr) {
      console.error('students upsert failed:', sErr);
      process.exit(1);
    }
    console.log(`profile+student rows for ${s.email}: level=${s.academic_level}, group=${s.group_id}, is_test_account=true`);
  }
  console.log('\nVerification:');
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_test_account, email, students:students(id, academic_level, group_id)')
    .eq('is_test_account', true);
  if (error) console.error(error);
  else console.log(JSON.stringify(rows, null, 2));
}

seed()
  .then(() => {
    console.log('\nTest students seeded.');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
