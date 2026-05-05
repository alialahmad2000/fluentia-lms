// scripts/add-students-2026-05-05.cjs
// Adds 2 students: ليان (A1, tamayuz, 1500) + لمى (A2, private, 3000, no group)
// Idempotent. Schema-discovery-driven. No email sending.

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const STUDENTS = [
  {
    fullName: 'ليان عبدالله العنزي',
    email: 'layan88700@gmail.com',
    password: 'Fluentia2026!La88',
    academicLevel: 1,
    package: 'tamayuz',
    customPrice: 1500,
    needsGroup: true, // → goes into level=1 group (المجموعة 2)
  },
  {
    fullName: 'لمى فهد الجهني',
    email: 'lamaf.2030@gmail.com',
    password: 'Fluentia2026!Lm30',
    academicLevel: 2,
    package: 'private',
    customPrice: 3000,
    needsGroup: false, // → group_id = NULL
  },
];

async function discoverSchema() {
  console.log('🔍 Schema discovery...\n');

  // 1. group_id nullability
  let cols = null;
  try {
    const result = await supabase.rpc('exec_sql', { sql: `
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='students' AND column_name='group_id';
    `});
    cols = result.data;
  } catch (_) {
    // exec_sql RPC not available — fall through to insert-time validation
  }

  // Fallback if exec_sql RPC isn't exposed: trust the insert and let it fail explicitly
  if (cols && cols.length) {
    const nullable = cols[0].is_nullable === 'YES';
    console.log(`  students.group_id nullable: ${nullable ? '✅ YES' : '❌ NO'}`);
    if (!nullable) {
      throw new Error('students.group_id is NOT NULL — cannot insert Lama without a group. STOP.');
    }
  } else {
    console.log('  ⚠️  Could not query information_schema directly. Will rely on insert-time validation.');
  }

  // 2. must_change_password location
  let mcpTable = null;
  for (const t of ['profiles', 'students']) {
    const { data, error } = await supabase.from(t).select('must_change_password').limit(1);
    if (!error) { mcpTable = t; break; }
  }
  if (!mcpTable) throw new Error('must_change_password column not found on profiles or students.');
  console.log(`  must_change_password lives on: ${mcpTable}\n`);

  // 3. Find المجموعة 2 (level=1) by name
  const { data: groups, error: gErr } = await supabase
    .from('groups')
    .select('id, name, code, level, max_students, trainer_id')
    .eq('level', 1)
    .eq('name', 'المجموعة 2');
  if (gErr) throw gErr;
  if (!groups || groups.length !== 1) {
    throw new Error(`Expected exactly 1 group named 'المجموعة 2' at level=1, found ${groups?.length ?? 0}.`);
  }
  const a1Group = groups[0];

  const { count: a1Count } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', a1Group.id)
    .eq('status', 'active');

  console.log(`  Level 1 group: ${a1Group.name} (${a1Group.code}) — ${a1Count}/${a1Group.max_students} students`);
  if (a1Count >= a1Group.max_students) {
    console.log(`  ⚠️  WARNING: Group is at or above max capacity. Proceeding per Ali's approval.\n`);
  } else {
    console.log('');
  }

  return { mcpTable, a1Group };
}

async function getExistingAuthUser(email) {
  const lower = email.toLowerCase();
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find(u => (u.email || '').toLowerCase() === lower);
    if (found) return found;
    if (data.users.length < 1000) return null;
    page++;
  }
}

async function provision(student, ctx) {
  console.log(`\n👤 ${student.fullName} <${student.email}>`);

  // Check existing auth user
  const existingAuth = await getExistingAuthUser(student.email);
  let userId;

  if (existingAuth) {
    console.log(`  ⏭️  Auth user exists (${existingAuth.id}) — SKIPPING auth creation, will upsert profile/student.`);
    userId = existingAuth.id;
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: student.email,
      password: student.password,
      email_confirm: true,
      user_metadata: { full_name: student.fullName },
    });
    if (createErr) throw new Error(`Auth create failed for ${student.email}: ${createErr.message}`);
    userId = created.user.id;
    console.log(`  ✅ Auth user created: ${userId}`);
  }

  // Upsert profile
  const profilePayload = {
    id: userId,
    full_name: student.fullName,
    email: student.email.toLowerCase(),
    role: 'student',
  };
  if (ctx.mcpTable === 'profiles') profilePayload.must_change_password = true;

  const { error: pErr } = await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' });
  if (pErr) throw new Error(`Profile upsert failed for ${student.email}: ${pErr.message}`);
  console.log(`  ✅ Profile upserted`);

  // Upsert student row
  const studentPayload = {
    id: userId,
    academic_level: student.academicLevel,
    package: student.package,
    custom_price: student.customPrice,
    group_id: student.needsGroup ? ctx.a1Group.id : null,
    enrollment_date: new Date().toISOString().split('T')[0],
    status: 'active',
    payment_day: new Date().getDate(),
  };
  if (ctx.mcpTable === 'students') studentPayload.must_change_password = true;

  const { error: sErr } = await supabase
    .from('students')
    .upsert(studentPayload, { onConflict: 'id' });
  if (sErr) throw new Error(`Student upsert failed for ${student.email}: ${sErr.message}`);

  console.log(`  ✅ Student record upserted (level=${student.academicLevel}, pkg=${student.package}, price=${student.customPrice}, group=${student.needsGroup ? ctx.a1Group.name : 'NULL (private)'})`);
}

async function verify() {
  console.log('\n🔎 Verification...\n');
  const emails = STUDENTS.map(s => s.email.toLowerCase());

  // Fetch profiles first, then join manually to avoid ambiguous FK error in PostgREST
  const { data: profileRows, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('email', emails);
  if (pErr) throw pErr;

  const ids = profileRows.map(r => r.id);

  const { data: studentRows, error: sErr } = await supabase
    .from('students')
    .select('id, academic_level, package, custom_price, group_id, status')
    .in('id', ids);
  if (sErr) throw sErr;

  const { data: groupRows } = await supabase
    .from('groups')
    .select('id, name')
    .in('id', studentRows.filter(r => r.group_id).map(r => r.group_id));

  const groupMap = Object.fromEntries((groupRows ?? []).map(g => [g.id, g.name]));
  const profileMap = Object.fromEntries(profileRows.map(p => [p.id, p]));

  const rows = studentRows.map(s => ({
    name: profileMap[s.id]?.full_name,
    email: profileMap[s.id]?.email,
    level: s.academic_level,
    pkg: s.package,
    price: s.custom_price,
    group: s.group_id ? (groupMap[s.group_id] ?? s.group_id) : 'NULL',
    status: s.status,
  }));

  console.table(rows);

  if (rows.length !== STUDENTS.length) {
    console.warn(`⚠️  Expected ${STUDENTS.length} rows, got ${rows.length}. Check skip log above.`);
  }
}

(async () => {
  try {
    const ctx = await discoverSchema();
    for (const s of STUDENTS) {
      await provision(s, ctx);
    }
    await verify();
    console.log('\n✅ Done.\n');
  } catch (e) {
    console.error('\n💥 FATAL:', e.message);
    process.exit(1);
  }
})();
