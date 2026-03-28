import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─── Group 3A ──────────────────────────────────────────
const GROUP_3A_ID = '3a3a3a3a-3a3a-3a3a-3a3a-3a3a3a3a3a3a'

// ─── Beta students ─────────────────────────────────────
const BETA_STUDENTS = [
  // Level 1 → Group 1A
  { name: 'نورة اليامي', email: 'nourahumayyim@gmail.com', level: 1, track: 'foundation', groupId: 'e7753305-2a42-4b51-89ab-60cf4df37cbb', existingId: 'd1a3b497-c15b-42e5-83d8-864ce311fb5b' },
  { name: 'فاطمة خواجي', email: 'fa.khawaji@gmail.com', level: 1, track: 'foundation', groupId: 'e7753305-2a42-4b51-89ab-60cf4df37cbb', existingId: 'f9ecb220-107e-436e-a4b7-80fd9df0cba4' },
  { name: 'لين الشهري', email: 'leen_alshehri@icloud.com', level: 1, track: 'foundation', groupId: 'e7753305-2a42-4b51-89ab-60cf4df37cbb', existingId: 'a64b4a03-5eac-433b-9dee-14af93e043c2' },
  // Level 3 → Group 3A
  { name: 'الهنوف البقمي', email: 'alhnouf191@gmail.com', level: 3, track: 'development', groupId: GROUP_3A_ID, existingId: 'de70db0c-1d87-4328-86d8-aa37344980a7' },
  { name: 'وعد العمران', email: 'waaohammed21@gmail.com', level: 3, track: 'development', groupId: GROUP_3A_ID, existingId: 'b091fb1d-15f1-43fc-841b-772328087fa3' },
  { name: 'نادية القحطاني', email: 'nadiah.alkhayar@gmail.com', level: 3, track: 'development', groupId: GROUP_3A_ID, existingId: '0aba3164-2cd9-4e47-a47b-c3c3b7e8a56e' },
]

// IDs of students NOT in beta (to withdraw)
const WITHDRAW_IDS = [
  '4afd701f-aa1a-4f82-9f99-9476cc335a3c', // بسيرين
  'af56ca47-2637-494a-b0b1-64a83e29f942', // سارة خالد منصور
  'f8d2f203-975f-4b0f-a607-ad1a05694f42', // سارة شرائحي
  '977e9d99-a4f5-4875-b7e6-741089f82058', // طالب تجريبي
  'b8692228-5219-4a59-884e-da360d8c7c2b', // غيداء
  'cad66f17-4471-4e64-acce-aa2836e1a814', // منار العتيبي
  '050ebad7-0c3b-4eaa-9bd1-9eaeca44adb6', // هوازن العتيبي
]

async function main() {
  console.log('=== STEP 1: Create Group 3A ===')
  const { error: groupErr } = await supabase.from('groups').upsert({
    id: GROUP_3A_ID,
    name: 'Level 3 - Group A',
    code: '3A',
    level: 3,
    max_students: 7,
    is_active: true,
    schedule: { days: ['sunday', 'wednesday'], time: '21:00', timezone: 'Asia/Riyadh', duration_minutes: 60 },
  })
  if (groupErr) console.error('Group 3A error:', groupErr.message)
  else console.log('✅ Group 3A created/ensured')

  console.log('\n=== STEP 2: Withdraw non-beta test accounts ===')
  for (const id of WITHDRAW_IDS) {
    const { error } = await supabase.from('students').update({
      status: 'withdrawn',
      deleted_at: new Date().toISOString(),
    }).eq('id', id)
    if (error) console.error(`  ❌ Withdraw ${id}:`, error.message)
    else console.log(`  ✅ Withdrawn: ${id}`)
  }

  console.log('\n=== STEP 3: Setup 6 beta accounts ===')
  const results = []

  for (const s of BETA_STUDENTS) {
    console.log(`\n--- ${s.name} (${s.email}) ---`)

    // A) Update auth user: email + password
    const { data: authData, error: authErr } = await supabase.auth.admin.updateUserById(s.existingId, {
      email: s.email,
      password: 'Talaqah1',
      email_confirm: true,
      user_metadata: { full_name: s.name, role: 'student' },
    })
    if (authErr) {
      console.error(`  ❌ Auth update:`, authErr.message)
      results.push({ ...s, status: `AUTH ERROR: ${authErr.message}` })
      continue
    }
    console.log(`  ✅ Auth updated`)

    // B) Update profile
    const { error: profErr } = await supabase.from('profiles').update({
      full_name: s.name,
      display_name: s.name.split(' ')[0],
      email: s.email,
      must_change_password: true,
    }).eq('id', s.existingId)
    if (profErr) console.error(`  ❌ Profile:`, profErr.message)
    else console.log(`  ✅ Profile updated`)

    // C) Update student record
    const { error: studErr } = await supabase.from('students').update({
      academic_level: s.level,
      package: 'talaqa',
      track: s.track,
      group_id: s.groupId,
      status: 'active',
      deleted_at: null,
      enrollment_date: new Date().toISOString().split('T')[0],
      onboarding_completed: false,
    }).eq('id', s.existingId)
    if (studErr) console.error(`  ❌ Student:`, studErr.message)
    else console.log(`  ✅ Student updated`)

    results.push({ ...s, status: 'OK' })
  }

  console.log('\n=== SUMMARY ===')
  console.log('| Name | Email | Level | Group | Auth ID | Status |')
  console.log('|------|-------|-------|-------|---------|--------|')
  for (const r of results) {
    const groupCode = r.level === 1 ? '1A' : '3A'
    console.log(`| ${r.name} | ${r.email} | ${r.level} | ${groupCode} | ${r.existingId.slice(0, 8)}... | ${r.status} |`)
  }

  console.log('\n=== STEP 4: Verification ===')
  const { data: verify } = await supabase
    .from('profiles')
    .select('full_name, email, must_change_password, students(academic_level, package, status, group_id)')
    .in('id', BETA_STUDENTS.map(s => s.existingId))
    .order('full_name')

  for (const v of (verify || [])) {
    const st = v.students?.[0] || v.students || {}
    console.log(`  ${v.full_name}: email=${v.email}, mcp=${v.must_change_password}, level=${st.academic_level}, pkg=${st.package}, status=${st.status}`)
  }

  console.log('\n✅ Done!')
}

main().catch(console.error)
