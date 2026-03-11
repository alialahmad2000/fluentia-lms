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
let issues = 0

console.log('=== COMPREHENSIVE QUERY VERIFICATION ===\n')

// --- STUDENT QUERIES ---
const { data: d1, error: e1 } = await admin
  .from('students')
  .select('id, academic_level, package, group_id, xp_total, current_streak, status, enrollment_date, custom_price, payment_day, profiles(full_name, display_name, email, phone), groups(name, code)')
  .is('deleted_at', null)
  .order('enrollment_date', { ascending: false })
console.log('1. AdminStudents:', e1 ? `ERROR: ${e1.message}` : `OK — ${d1.length} students`)
if (e1) issues++

const { data: d2, error: e2 } = await admin
  .from('students')
  .select('id, status, package, xp_total, profiles(full_name)')
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('enrollment_date', { ascending: false })
  .limit(6)
console.log('2. AdminDashboard recent:', e2 ? `ERROR: ${e2.message}` : `OK — ${d2.length} students`)
if (e2) issues++

const { data: d3, error: e3 } = await admin
  .from('students')
  .select('id, package, custom_price, profiles(full_name, display_name)')
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('enrollment_date')
console.log('3. AdminPayments dropdown:', e3 ? `ERROR: ${e3.message}` : `OK — ${d3.length} students`)
if (e3) issues++

const { data: d4, error: e4 } = await admin
  .from('students')
  .select('id, xp_total, current_streak, profiles(full_name, display_name)')
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('enrollment_date')
console.log('4. QuickPoints:', e4 ? `ERROR: ${e4.message}` : `OK — ${d4.length} students`)
if (e4) issues++

const { data: d5, error: e5 } = await admin
  .from('students')
  .select('id, profiles(full_name, display_name)')
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('enrollment_date')
console.log('5. QuickNotes:', e5 ? `ERROR: ${e5.message}` : `OK — ${d5.length} students`)
if (e5) issues++

// With group filter
const { data: groups } = await admin.from('groups').select('id').limit(1)
if (groups?.[0]) {
  const { data: d6, error: e6 } = await admin
    .from('students')
    .select('id, profiles(full_name, display_name)')
    .eq('group_id', groups[0].id)
    .eq('status', 'active')
    .is('deleted_at', null)
  console.log('6. Attendance:', e6 ? `ERROR: ${e6.message}` : `OK — ${d6.length} students in group`)
  if (e6) issues++

  const { data: d7, error: e7 } = await admin
    .from('students')
    .select('id, xp_total, current_streak, longest_streak, gamification_level, academic_level, package, profiles(full_name, display_name)')
    .eq('group_id', groups[0].id)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('xp_total', { ascending: false })
  console.log('7. StudentView:', e7 ? `ERROR: ${e7.message}` : `OK — ${d7.length} students in group`)
  if (e7) issues++
}

// AdminReports leaderboard
const { data: d8, error: e8 } = await admin
  .from('students')
  .select('id, xp_total, current_streak, gamification_level, profiles(full_name, display_name), groups(code)')
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('xp_total', { ascending: false })
  .limit(10)
console.log('8. AdminReports leaderboard:', e8 ? `ERROR: ${e8.message}` : `OK — ${d8.length} students`)
if (e8) issues++

// AdminReports aggregate
const { data: d9, error: e9 } = await admin
  .from('students')
  .select('id, xp_total, current_streak, academic_level, status, group_id', { count: 'exact' })
  .is('deleted_at', null)
console.log('9. AdminReports stats:', e9 ? `ERROR: ${e9.message}` : `OK — ${d9.length} students`)
if (e9) issues++

// --- PAYMENT QUERIES ---
const { data: d10, error: e10 } = await admin
  .from('payments')
  .select('id, amount, status, method, period_start, period_end, paid_at, notes, created_at, students:student_id(id, package, custom_price, profiles(full_name, display_name))')
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
  .limit(10)
console.log('10. AdminPayments list:', e10 ? `ERROR: ${e10.message}` : `OK — ${d10.length} payments`)
if (e10) issues++

// --- SUBMISSIONS QUERIES ---
const { data: d11, error: e11 } = await admin
  .from('submissions')
  .select('*, students:student_id(profiles(full_name, display_name)), assignments!inner(title, type, group_id, points_on_time, points_late, groups(code))')
  .is('deleted_at', null)
  .order('submitted_at', { ascending: false })
  .limit(5)
console.log('11. TrainerGrading:', e11 ? `ERROR: ${e11.message}` : `OK — ${d11.length} submissions`)
if (e11) issues++

// --- CLASSES QUERIES ---
const { data: d12, error: e12 } = await admin
  .from('classes')
  .select('id, title, topic, date, start_time, group_id, groups(name, code)')
  .order('date', { ascending: false })
  .limit(5)
console.log('12. TrainerAttendance classes:', e12 ? `ERROR: ${e12.message}` : `OK — ${d12.length} classes`)
if (e12) issues++

// --- ATTENDANCE QUERIES ---
const { data: d13, error: e13 } = await admin
  .from('attendance')
  .select('id, status, xp_awarded, classes:class_id(title, date)')
  .order('created_at', { ascending: false })
  .limit(5)
console.log('13. StudentView attendance:', e13 ? `ERROR: ${e13.message}` : `OK — ${d13.length} records`)
if (e13) issues++

// --- ASSIGNMENTS QUERIES ---
const { data: d14, error: e14 } = await admin
  .from('assignments')
  .select('id, title, type, deadline, points_on_time, points_late, created_at, groups(name, code)')
  .order('created_at', { ascending: false })
  .limit(5)
console.log('14. TrainerAssignments:', e14 ? `ERROR: ${e14.message}` : `OK — ${d14.length} assignments`)
if (e14) issues++

// --- XP TRANSACTIONS ---
const { data: d15, error: e15 } = await admin
  .from('xp_transactions')
  .select('id, amount, reason, created_at')
  .order('created_at', { ascending: false })
  .limit(5)
console.log('15. XP transactions:', e15 ? `ERROR: ${e15.message}` : `OK — ${d15.length} records`)
if (e15) issues++

// --- NOTIFICATIONS ---
const { data: d16, error: e16 } = await admin
  .from('notifications')
  .select('id, title, body, type, read, created_at')
  .order('created_at', { ascending: false })
  .limit(5)
console.log('16. Notifications:', e16 ? `ERROR: ${e16.message}` : `OK — ${d16.length} records`)
if (e16) issues++

// --- GROUPS ---
const { data: d17, error: e17 } = await admin
  .from('groups')
  .select('id, name, code, level, trainer_id, max_students, google_meet_link, schedule, is_active, created_at')
  .order('level')
console.log('17. Groups:', e17 ? `ERROR: ${e17.message}` : `OK — ${d17.length} groups`)
if (e17) issues++

// --- PROFILES ---
const { data: d18, error: e18 } = await admin
  .from('profiles')
  .select('id, full_name, display_name, role, email, phone')
  .eq('role', 'trainer')
console.log('18. Trainers (profiles):', e18 ? `ERROR: ${e18.message}` : `OK — ${d18.length} trainers`)
if (e18) issues++

// --- SYSTEM ERRORS ---
const { data: d19, error: e19 } = await admin
  .from('system_errors')
  .select('id, error_type, service, error_message, created_at')
  .order('created_at', { ascending: false })
  .limit(5)
console.log('19. System errors:', e19 ? `ERROR: ${e19.message}` : `OK — ${d19.length} records`)
if (e19) issues++

// --- SETTINGS ---
const { data: d20, error: e20 } = await admin
  .from('settings')
  .select('key, value')
console.log('20. Settings:', e20 ? `ERROR: ${e20.message}` : `OK — ${d20.length} settings`)
if (e20) issues++

// --- STUDENT SCHEDULE ---
const { data: d21, error: e21 } = await admin
  .from('classes')
  .select('id, title, topic, date, start_time, end_time, google_meet_link, status, groups!inner(id, name, code, google_meet_link, schedule)')
  .order('date')
  .limit(5)
console.log('21. StudentSchedule:', e21 ? `ERROR: ${e21.message}` : `OK — ${d21.length} classes`)
if (e21) issues++

// --- TRAINER SCHEDULE ---
const { data: d22, error: e22 } = await admin
  .from('classes')
  .select('id, title, topic, date, start_time, end_time, google_meet_link, status, group_id, groups(name, code, google_meet_link)')
  .order('date', { ascending: false })
  .limit(5)
console.log('22. TrainerSchedule:', e22 ? `ERROR: ${e22.message}` : `OK — ${d22.length} classes`)
if (e22) issues++

// --- SPEAKING TOPICS ---
const { data: d23, error: e23 } = await admin
  .from('speaking_topic_banks')
  .select('id, level, topic_number, title_en, title_ar, category, difficulty')
  .order('topic_number')
  .limit(5)
console.log('23. Speaking topics:', e23 ? `ERROR: ${e23.message}` : `OK — ${d23.length} topics`)
if (e23) issues++

// --- STUDENT ACHIEVEMENTS ---
const { data: d24, error: e24 } = await admin
  .from('achievements')
  .select('id, code, name_ar, icon, xp_reward')
console.log('24. Achievements:', e24 ? `ERROR: ${e24.message}` : `OK — ${d24.length} achievements`)
if (e24) issues++

// --- TRAINER DASHBOARD ---
const { data: d25, error: e25 } = await admin
  .from('submissions')
  .select('id, status, created_at, students:student_id(profiles(full_name)), assignments!inner(title, group_id)')
  .order('created_at', { ascending: false })
  .limit(5)
console.log('25. TrainerDashboard submissions:', e25 ? `ERROR: ${e25.message}` : `OK — ${d25.length} submissions`)
if (e25) issues++

// --- STUDENT GRADES ---
const { data: d26, error: e26 } = await admin
  .from('submissions')
  .select('id, status, grade, grade_numeric, submitted_at, trainer_feedback, is_late, assignments:assignment_id(title, type)')
  .is('deleted_at', null)
  .order('submitted_at', { ascending: false })
  .limit(5)
console.log('26. StudentGrades:', e26 ? `ERROR: ${e26.message}` : `OK — ${d26.length} submissions`)
if (e26) issues++

console.log(`\n=== DONE: ${issues} issues found ===`)
