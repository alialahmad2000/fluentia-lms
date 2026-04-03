import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  console.log('=== B11: Adding 3 beta students ===\n')

  // 1. Get Group 1B (exists from B10)
  const { data: group1B } = await supabase
    .from('groups').select('id').eq('code', '1B').eq('is_active', true).single()
  if (!group1B) { console.error('❌ Group 1B not found'); return }
  console.log(`✅ Group 1B: ${group1B.id}`)

  // 2. Create Group 3B
  let group3B
  const { data: existing3B } = await supabase
    .from('groups').select('id').eq('code', '3B').eq('is_active', true).single()
  if (existing3B) {
    group3B = existing3B
    console.log(`✅ Group 3B exists: ${group3B.id}`)
  } else {
    const { data: newGroup, error } = await supabase.from('groups').insert({
      name: 'Level 3 - Group B',
      code: '3B',
      level: 3,
      max_students: 7,
      is_active: true,
    }).select().single()
    if (error) { console.error('❌ Create 3B:', error.message); return }
    group3B = newGroup
    console.log(`✅ Group 3B created: ${group3B.id}`)
  }

  // === Student 1: سيرين (NEW — no existing account) ===
  console.log('\n--- سيرين (sereen6898@gmail.com) → Group 1B ---')
  {
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: 'sereen6898@gmail.com',
      password: 'Fluentia2025!',
      email_confirm: true,
      user_metadata: { full_name: 'سيرين', role: 'student' },
    })
    if (authErr) { console.error('  ❌ Auth create:', authErr.message) }
    else {
      const userId = authUser.user.id
      console.log(`  ✅ Auth created: ${userId}`)

      const { error: profErr } = await supabase.from('profiles').upsert({
        id: userId,
        full_name: 'سيرين',
        display_name: 'سيرين',
        email: 'sereen6898@gmail.com',
        role: 'student',
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      if (profErr) console.error('  ❌ Profile:', profErr.message)
      else console.log('  ✅ Profile created')

      const { error: studErr } = await supabase.from('students').upsert({
        id: userId,
        academic_level: 1,
        package: 'talaqa',
        track: 'foundation',
        group_id: group1B.id,
        xp_total: 0,
        current_streak: 0,
        longest_streak: 0,
        gamification_level: 1,
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active',
        deleted_at: null,
        onboarding_completed: false,
      })
      if (studErr) console.error('  ❌ Student:', studErr.message)
      else console.log('  ✅ Student created')
    }
  }

  // === Student 2: هوازن العتيبي (EXISTS — update) ===
  console.log('\n--- هوازن العتيبي (Hawazin324@gmail.com) → Group 3B ---')
  {
    const existingId = '050ebad7-0c3b-4eaa-9bd1-9eaeca44adb6'
    const { error: authErr } = await supabase.auth.admin.updateUserById(existingId, {
      email: 'Hawazin324@gmail.com',
      password: 'Fluentia2025!',
      email_confirm: true,
      user_metadata: { full_name: 'هوازن العتيبي', role: 'student' },
    })
    if (authErr) console.error('  ❌ Auth:', authErr.message)
    else console.log('  ✅ Auth updated')

    const { error: profErr } = await supabase.from('profiles').update({
      full_name: 'هوازن العتيبي',
      display_name: 'هوازن',
      email: 'Hawazin324@gmail.com',
      role: 'student',
      must_change_password: true,
      updated_at: new Date().toISOString(),
    }).eq('id', existingId)
    if (profErr) console.error('  ❌ Profile:', profErr.message)
    else console.log('  ✅ Profile updated')

    const { error: studErr } = await supabase.from('students').update({
      academic_level: 3,
      package: 'talaqa',
      track: 'development',
      group_id: group3B.id,
      status: 'active',
      deleted_at: null,
      enrollment_date: new Date().toISOString().split('T')[0],
      onboarding_completed: false,
    }).eq('id', existingId)
    if (studErr) console.error('  ❌ Student:', studErr.message)
    else console.log('  ✅ Student reactivated')
  }

  // === Student 3: غيداء طلحة (EXISTS — update) ===
  console.log('\n--- غيداء طلحة (ghaida.talha@gmail.com) → Group 3B ---')
  {
    const existingId = 'b8692228-5219-4a59-884e-da360d8c7c2b'
    const { error: authErr } = await supabase.auth.admin.updateUserById(existingId, {
      email: 'ghaida.talha@gmail.com',
      password: 'Fluentia2025!',
      email_confirm: true,
      user_metadata: { full_name: 'غيداء طلحة', role: 'student' },
    })
    if (authErr) console.error('  ❌ Auth:', authErr.message)
    else console.log('  ✅ Auth updated')

    const { error: profErr } = await supabase.from('profiles').update({
      full_name: 'غيداء طلحة',
      display_name: 'غيداء',
      email: 'ghaida.talha@gmail.com',
      role: 'student',
      must_change_password: true,
      updated_at: new Date().toISOString(),
    }).eq('id', existingId)
    if (profErr) console.error('  ❌ Profile:', profErr.message)
    else console.log('  ✅ Profile updated')

    const { error: studErr } = await supabase.from('students').update({
      academic_level: 3,
      package: 'talaqa',
      track: 'development',
      group_id: group3B.id,
      status: 'active',
      deleted_at: null,
      enrollment_date: new Date().toISOString().split('T')[0],
      onboarding_completed: false,
    }).eq('id', existingId)
    if (studErr) console.error('  ❌ Student:', studErr.message)
    else console.log('  ✅ Student reactivated')
  }

  // 3. Verify all
  console.log('\n\n--- Verification ---')
  const emails = ['sereen6898@gmail.com', 'Hawazin324@gmail.com', 'ghaida.talha@gmail.com']
  const { data: verify } = await supabase
    .from('profiles')
    .select('full_name, email, must_change_password, students(academic_level, status, groups(name, code))')
    .in('email', emails)

  for (const v of (verify || [])) {
    const st = v.students?.[0] || v.students || {}
    const grp = st.groups || {}
    console.log(`  ${v.full_name}: email=${v.email}, mcp=${v.must_change_password}, level=${st.academic_level}, group=${grp.code}, status=${st.status}`)
  }

  console.log('\n\n=== NEW BETA ACCOUNTS ===\n')
  console.log('1. سيرين\n   Email: sereen6898@gmail.com\n   Password: Fluentia2025!\n   Group: 1B\n')
  console.log('2. هوازن العتيبي\n   Email: Hawazin324@gmail.com\n   Password: Fluentia2025!\n   Group: 3B\n')
  console.log('3. غيداء طلحة\n   Email: ghaida.talha@gmail.com\n   Password: Fluentia2025!\n   Group: 3B\n')
  console.log('Login URL: https://app.fluentia.academy')
  console.log('All must change password on first login.')
  console.log('===')
}

main().catch(console.error)
