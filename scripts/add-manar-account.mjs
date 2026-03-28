import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  const name = 'منار العتيبي'
  const email = 'manar126712@gmail.com'
  const password = 'Talaqah1'

  console.log(`=== Adding beta student: ${name} (${email}) ===\n`)

  // 1. Get group 1A
  const { data: group, error: groupErr } = await supabase
    .from('groups').select('id').eq('code', '1A').eq('is_active', true).single()
  if (groupErr) { console.error('Group 1A not found:', groupErr.message); return }
  console.log(`✅ Group 1A found: ${group.id}`)

  // 2. Check if email exists in auth
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const existing = users.find(u => u.email === email)

  let userId
  if (existing) {
    console.log(`User exists (${existing.id}), updating password...`)
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role: 'student' },
    })
    if (error) { console.error('❌ Auth update:', error.message); return }
    userId = existing.id
    console.log('✅ Auth updated')
  } else {
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role: 'student' },
    })
    if (authErr) { console.error('❌ Auth create:', authErr.message); return }
    userId = authUser.user.id
    console.log(`✅ Auth user created: ${userId}`)
  }

  // 3. Upsert profile
  const { error: profErr } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: name,
    display_name: 'منار',
    email,
    role: 'student',
    must_change_password: true,
    updated_at: new Date().toISOString(),
  })
  if (profErr) console.error('❌ Profile:', profErr.message)
  else console.log('✅ Profile created/updated')

  // 4. Upsert student record
  const { error: studErr } = await supabase.from('students').upsert({
    id: userId,
    academic_level: 1,
    package: 'talaqa',
    track: 'foundation',
    group_id: group.id,
    xp_total: 0,
    current_streak: 0,
    longest_streak: 0,
    gamification_level: 1,
    enrollment_date: new Date().toISOString().split('T')[0],
    status: 'active',
    onboarding_completed: false,
  })
  if (studErr) console.error('❌ Student:', studErr.message)
  else console.log('✅ Student record created/updated')

  // 5. Verify
  const { data: verify } = await supabase
    .from('profiles')
    .select('full_name, email, must_change_password, students(academic_level, package, status, group_id)')
    .eq('id', userId)
    .single()

  const st = verify?.students?.[0] || verify?.students || {}
  console.log('\n=== RESULT ===')
  console.log('| Name | Email | Level | Group | Auth ID | Status |')
  console.log('|------|-------|-------|-------|---------|--------|')
  console.log(`| ${verify.full_name} | ${verify.email} | ${st.academic_level} | 1A | ${userId.slice(0,8)}... | ${st.status} |`)
  console.log(`\nmust_change_password: ${verify.must_change_password}`)
  console.log('\n✅ Done!')
}

main().catch(console.error)
