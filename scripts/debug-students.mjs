import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load env
const envFile = readFileSync('.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key && val.length) env[key.trim()] = val.join('=').trim()
})

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY

console.log('=== SUPABASE CONFIG ===')
console.log('URL:', SUPABASE_URL)
console.log('Anon key:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.slice(0, 20) + '...' : 'MISSING')
console.log('Service key:', SUPABASE_SERVICE_KEY ? SUPABASE_SERVICE_KEY.slice(0, 20) + '...' : 'MISSING')
console.log()

// 1. Test with SERVICE ROLE (bypasses RLS)
if (SUPABASE_SERVICE_KEY) {
  console.log('=== STEP 1: SERVICE ROLE QUERIES (bypass RLS) ===')
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Check students table
  const { data: students, error: studentsErr } = await admin
    .from('students')
    .select('id, academic_level, package, group_id, status, deleted_at')
    .limit(20)
  console.log('\n--- students table ---')
  if (studentsErr) console.log('ERROR:', studentsErr)
  else console.log('Count:', students?.length, '\nData:', JSON.stringify(students, null, 2))

  // Check profiles with role=student
  const { data: profiles, error: profilesErr } = await admin
    .from('profiles')
    .select('id, full_name, display_name, role, email')
    .eq('role', 'student')
    .limit(20)
  console.log('\n--- profiles (role=student) ---')
  if (profilesErr) console.log('ERROR:', profilesErr)
  else console.log('Count:', profiles?.length, '\nData:', JSON.stringify(profiles, null, 2))

  // Check groups
  const { data: groups, error: groupsErr } = await admin
    .from('groups')
    .select('id, name, code, trainer_id, is_active')
  console.log('\n--- groups ---')
  if (groupsErr) console.log('ERROR:', groupsErr)
  else console.log('Count:', groups?.length, '\nData:', JSON.stringify(groups, null, 2))

  // Join students + profiles
  const { data: joined, error: joinErr } = await admin
    .from('students')
    .select('id, group_id, status, deleted_at, profiles(full_name, display_name, email, role)')
    .limit(20)
  console.log('\n--- students JOIN profiles (auto-detect FK) ---')
  if (joinErr) console.log('ERROR:', joinErr)
  else console.log('Count:', joined?.length, '\nData:', JSON.stringify(joined, null, 2))

  // Test exact AdminStudents query
  const { data: adminQuery, error: adminErr } = await admin
    .from('students')
    .select('id, academic_level, package, group_id, xp_total, current_streak, status, enrollment_date, custom_price, payment_day, profiles(full_name, display_name, email, phone), groups(name, code)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  console.log('\n--- Exact AdminStudents query ---')
  if (adminErr) console.log('ERROR:', adminErr)
  else console.log('Count:', adminQuery?.length, '\nData:', JSON.stringify(adminQuery, null, 2))

  // Check all profiles
  const { data: allProfiles, error: allProfilesErr } = await admin
    .from('profiles')
    .select('id, full_name, role, email')
  console.log('\n--- ALL profiles ---')
  if (allProfilesErr) console.log('ERROR:', allProfilesErr)
  else console.log('Count:', allProfiles?.length, '\nData:', JSON.stringify(allProfiles, null, 2))

  // Check RLS functions
  console.log('\n=== STEP 3: RLS FUNCTION CHECK ===')
  const { data: policies, error: polErr } = await admin.rpc('exec_sql', {
    sql: "SELECT policyname, tablename, cmd, qual FROM pg_policies WHERE tablename IN ('students', 'profiles') ORDER BY tablename, policyname"
  })
  if (polErr) {
    console.log('Cannot query pg_policies via RPC (expected):', polErr.message)
    // Try direct query
    const { data: pol2, error: pol2Err } = await admin
      .from('pg_policies')
      .select('*')
    console.log('Direct pg_policies:', pol2Err ? pol2Err.message : pol2)
  } else {
    console.log('Policies:', JSON.stringify(policies, null, 2))
  }

} else {
  console.log('WARNING: No service role key found. Add SUPABASE_SERVICE_ROLE_KEY to .env')
}

// 2. Test with ANON KEY + admin auth (simulates real app)
console.log('\n\n=== STEP 2: ANON KEY + ADMIN AUTH (simulates real app) ===')
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Sign in as admin
const { data: authData, error: authErr } = await anon.auth.signInWithPassword({
  email: 'admin@fluentia.academy',
  password: 'Fluentia@2026!'
})
if (authErr) {
  console.log('AUTH ERROR:', authErr)
} else {
  console.log('Signed in as:', authData.user.email, 'UID:', authData.user.id)

  // Check profile
  const { data: myProfile } = await anon
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single()
  console.log('My profile:', JSON.stringify(myProfile, null, 2))

  // Query students (exact same as AdminStudents.jsx)
  const { data: students, error: studentsErr } = await anon
    .from('students')
    .select('id, academic_level, package, group_id, xp_total, current_streak, status, enrollment_date, custom_price, payment_day, profiles(full_name, display_name, email, phone), groups(name, code)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  console.log('\n--- AdminStudents query (as admin) ---')
  if (studentsErr) console.log('ERROR:', JSON.stringify(studentsErr, null, 2))
  else console.log('Count:', students?.length, '\nData:', JSON.stringify(students, null, 2))

  // Query groups
  const { data: groups, error: groupsErr } = await anon
    .from('groups')
    .select('id, name, code')
    .order('level')
  console.log('\n--- Groups query (as admin) ---')
  if (groupsErr) console.log('ERROR:', JSON.stringify(groupsErr, null, 2))
  else console.log('Count:', groups?.length, '\nData:', JSON.stringify(groups, null, 2))

  // If groups exist, query students for first group (exact QuickPoints query)
  if (groups?.length > 0) {
    const firstGroupId = groups[0].id
    console.log('\nQuerying students for group:', firstGroupId, groups[0].code)
    const { data: groupStudents, error: gsErr } = await anon
      .from('students')
      .select('id, xp_total, current_streak, profiles(full_name, display_name)')
      .eq('group_id', firstGroupId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at')
    console.log('--- QuickPoints query for group ---')
    if (gsErr) console.log('ERROR:', JSON.stringify(gsErr, null, 2))
    else console.log('Count:', groupStudents?.length, '\nData:', JSON.stringify(groupStudents, null, 2))
  }

  // Check is_admin function
  const { data: isAdminResult, error: isAdminErr } = await anon.rpc('is_admin')
  console.log('\n--- is_admin() result ---')
  if (isAdminErr) console.log('ERROR:', isAdminErr)
  else console.log('is_admin():', isAdminResult)

  // Check get_user_role function
  const { data: roleResult, error: roleErr } = await anon.rpc('get_user_role')
  console.log('get_user_role():', roleErr ? roleErr : roleResult)

  await anon.auth.signOut()
}

console.log('\n=== DONE ===')
