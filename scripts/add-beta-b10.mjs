import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// These users already exist with test emails — update them to real emails
const STUDENTS = [
  {
    existingId: 'af56ca47-2637-494a-b0b1-64a83e29f942',
    name: 'سارة منصور',
    displayName: 'سارة',
    email: 'sarakhaledm43@gmail.com',
    groupCode: '1A',
  },
  {
    existingId: 'f8d2f203-975f-4b0f-a607-ad1a05694f42',
    name: 'سارة شراحيلي',
    displayName: 'سارة',
    email: 'sarashrahili22@gmail.com',
    groupCode: '1B',
  },
]

async function main() {
  console.log('=== B10: Activating 2 beta students with real emails ===\n')

  // 1. Get groups
  const { data: group1A } = await supabase
    .from('groups').select('id, name').eq('code', '1A').eq('is_active', true).single()
  if (!group1A) { console.error('❌ Group 1A not found'); return }
  console.log(`✅ Group 1A: ${group1A.id}`)

  let group1B
  const { data: existing1B } = await supabase
    .from('groups').select('id, name').eq('code', '1B').eq('is_active', true).single()
  if (existing1B) {
    group1B = existing1B
    console.log(`✅ Group 1B: ${group1B.id}`)
  } else {
    const { data: newGroup, error } = await supabase.from('groups').insert({
      name: 'Level 1 - Group B',
      code: '1B',
      level: 1,
      max_students: 7,
      is_active: true,
    }).select().single()
    if (error) { console.error('❌ Create 1B:', error.message); return }
    group1B = newGroup
    console.log(`✅ Group 1B created: ${group1B.id}`)
  }

  const groupMap = { '1A': group1A.id, '1B': group1B.id }

  // 2. Update each student
  for (const s of STUDENTS) {
    console.log(`\n--- ${s.name} (${s.email}) → Group ${s.groupCode} ---`)
    const groupId = groupMap[s.groupCode]

    // A) Update auth: email, password, confirm
    const { error: authErr } = await supabase.auth.admin.updateUserById(s.existingId, {
      email: s.email,
      password: 'Fluentia2025!',
      email_confirm: true,
      user_metadata: { full_name: s.name, role: 'student' },
    })
    if (authErr) { console.error(`  ❌ Auth:`, authErr.message); continue }
    console.log(`  ✅ Auth updated (email + password)`)

    // B) Update profile
    const { error: profErr } = await supabase.from('profiles').update({
      full_name: s.name,
      display_name: s.displayName,
      email: s.email,
      role: 'student',
      must_change_password: true,
      updated_at: new Date().toISOString(),
    }).eq('id', s.existingId)
    if (profErr) console.error(`  ❌ Profile:`, profErr.message)
    else console.log(`  ✅ Profile updated`)

    // C) Update student record — reactivate
    const { error: studErr } = await supabase.from('students').update({
      academic_level: 1,
      package: 'talaqa',
      track: 'foundation',
      group_id: groupId,
      status: 'active',
      deleted_at: null,
      enrollment_date: new Date().toISOString().split('T')[0],
      onboarding_completed: false,
    }).eq('id', s.existingId)
    if (studErr) console.error(`  ❌ Student:`, studErr.message)
    else console.log(`  ✅ Student reactivated`)
  }

  // 3. Verify
  console.log('\n\n--- Verification ---')
  const { data: verify } = await supabase
    .from('profiles')
    .select('id, full_name, email, must_change_password, students(academic_level, package, status, group_id, groups(name, code))')
    .in('id', STUDENTS.map(s => s.existingId))

  for (const v of (verify || [])) {
    const st = v.students?.[0] || v.students || {}
    const grp = st.groups || {}
    console.log(`  ${v.full_name}: email=${v.email}, mcp=${v.must_change_password}, level=${st.academic_level}, group=${grp.code} (${grp.name}), status=${st.status}`)
  }

  console.log('\n\n=== NEW BETA ACCOUNTS ===\n')
  console.log('1. سارة منصور')
  console.log('   Email: sarakhaledm43@gmail.com')
  console.log('   Password: Fluentia2025!')
  console.log('   Group: 1A')
  console.log('   Note: Must change password on first login\n')
  console.log('2. سارة شراحيلي')
  console.log('   Email: sarashrahili22@gmail.com')
  console.log('   Password: Fluentia2025!')
  console.log('   Group: 1B')
  console.log('   Note: Must change password on first login\n')
  console.log('Login URL: https://app.fluentia.academy')
  console.log('===')
}

main().catch(console.error)
