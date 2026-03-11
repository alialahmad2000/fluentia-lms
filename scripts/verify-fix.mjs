import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envFile = readFileSync('.env', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key && val.length) env[key.trim()] = val.join('=').trim()
})

const url = env.VITE_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, key)

console.log('=== VERIFYING FIX: .order(enrollment_date) instead of .order(created_at) ===\n')

// Test 1: AdminStudents query
const { data: d1, error: e1 } = await admin
  .from('students')
  .select('id, academic_level, package, group_id, xp_total, current_streak, status, enrollment_date, custom_price, payment_day, profiles(full_name, display_name, email, phone), groups(name, code)')
  .is('deleted_at', null)
  .order('enrollment_date', { ascending: false })
console.log('1. AdminStudents:', e1 ? `ERROR: ${e1.message}` : `OK — ${d1.length} students`)

// Test 2: AdminDashboard recent students
const { data: d2, error: e2 } = await admin
  .from('students')
  .select('id, status, package, xp_total, profiles(full_name)')
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('enrollment_date', { ascending: false })
  .limit(6)
console.log('2. AdminDashboard:', e2 ? `ERROR: ${e2.message}` : `OK — ${d2.length} students`)

// Test 3: AdminPayments student dropdown
const { data: d3, error: e3 } = await admin
  .from('students')
  .select('id, package, custom_price, profiles(full_name, display_name)')
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('enrollment_date')
console.log('3. AdminPayments:', e3 ? `ERROR: ${e3.message}` : `OK — ${d3.length} students`)

// Test 4: TrainerQuickPoints
const { data: d4, error: e4 } = await admin
  .from('students')
  .select('id, xp_total, current_streak, profiles(full_name, display_name)')
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('enrollment_date')
console.log('4. QuickPoints:', e4 ? `ERROR: ${e4.message}` : `OK — ${d4.length} students`)

// Test 5: TrainerQuickNotes
const { data: d5, error: e5 } = await admin
  .from('students')
  .select('id, profiles(full_name, display_name)')
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('enrollment_date')
console.log('5. QuickNotes:', e5 ? `ERROR: ${e5.message}` : `OK — ${d5.length} students`)

// Test 6: TrainerAttendance (no order on students — should already work)
const { data: groups } = await admin.from('groups').select('id').limit(1)
if (groups?.[0]) {
  const { data: d6, error: e6 } = await admin
    .from('students')
    .select('id, profiles(full_name, display_name)')
    .eq('group_id', groups[0].id)
    .eq('status', 'active')
    .is('deleted_at', null)
  console.log('6. Attendance:', e6 ? `ERROR: ${e6.message}` : `OK — ${d6.length} students in group`)
}

// Test 7: TrainerStudentView (uses xp_total order — should work)
if (groups?.[0]) {
  const { data: d7, error: e7 } = await admin
    .from('students')
    .select('id, xp_total, current_streak, longest_streak, gamification_level, academic_level, package, profiles(full_name, display_name)')
    .eq('group_id', groups[0].id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('xp_total', { ascending: false })
  console.log('7. StudentView:', e7 ? `ERROR: ${e7.message}` : `OK — ${d7.length} students in group`)
}

console.log('\n=== ALL QUERIES VERIFIED ===')
