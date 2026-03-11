/**
 * Fluentia LMS — Database Setup Script
 * Step 1: Apply migrations, Step 2: Seed data, Step 3: Test RLS
 *
 * Run: node scripts/setup-database.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')

// ─── Config ─────────────────────────────────────────────────
const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMjU2MTgsImV4cCI6MjA4ODcwMTYxOH0.Lznjnw2Pmrr04tFjQD6hRfWp-12JlRagZaCmo59KG8A'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEyNTYxOCwiZXhwIjoyMDg4NzAxNjE4fQ.Abbt3bzmud1B55ym_UW_3kEUMyVkhOiQ_iiLpHo1tfs'

// Admin client (bypasses RLS)
const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Anon client (respects RLS)
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─── Helpers ────────────────────────────────────────────────
function log(emoji, msg) { console.log(`${emoji}  ${msg}`) }
function logOk(msg) { log('✅', msg) }
function logErr(msg) { log('❌', msg) }
function logInfo(msg) { log('📋', msg) }
function logWarn(msg) { log('⚠️', msg) }

// Execute SQL via Supabase's pg endpoint
async function execSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  return res
}

// ═══════════════════════════════════════════════════════════
// STEP 1: Check current database state and apply migrations
// ═══════════════════════════════════════════════════════════
async function step1_checkAndMigrate() {
  console.log('\n' + '═'.repeat(60))
  log('🔧', 'STEP 1: Checking database state & applying migrations')
  console.log('═'.repeat(60))

  // Check if profiles table exists (indicates migrations have been run)
  const { data: profilesCheck, error: profilesError } = await adminClient
    .from('profiles')
    .select('id')
    .limit(1)

  if (!profilesError) {
    logOk('Database tables already exist (profiles table accessible)')

    // Check other critical tables
    const tables = ['students', 'trainers', 'groups', 'teams', 'assignments',
                    'submissions', 'xp_transactions', 'achievements', 'classes',
                    'attendance', 'notifications', 'payments', 'settings',
                    'system_errors', 'ai_usage', 'analytics_events', 'audit_log',
                    'quizzes', 'quiz_questions', 'quiz_attempts', 'quiz_answers',
                    'group_messages', 'direct_messages', 'vocabulary_bank',
                    'activity_feed', 'social_shares', 'referrals', 'holidays',
                    'speaking_topic_banks', 'student_speaking_progress',
                    'challenges', 'challenge_participants', 'peer_recognitions',
                    'class_notes', 'progress_reports', 'assessments',
                    'skill_snapshots', 'private_sessions', 'trainer_payroll',
                    'message_reactions', 'team_members', 'student_achievements']

    let existingCount = 1 // profiles already confirmed
    let missingTables = []

    for (const table of tables) {
      const { error } = await adminClient.from(table).select('*').limit(0)
      if (!error) {
        existingCount++
      } else {
        missingTables.push(table)
      }
    }

    logInfo(`Found ${existingCount} tables out of ${tables.length + 1} expected`)

    if (missingTables.length > 0) {
      logWarn(`Missing tables: ${missingTables.join(', ')}`)
      logInfo('Migrations need to be applied. Will attempt via SQL...')
      return { needsMigration: true, missingTables }
    } else {
      logOk(`All ${existingCount} tables verified!`)
      return { needsMigration: false, tableCount: existingCount }
    }
  } else {
    logInfo('Tables do not exist yet. Migrations need to be applied.')
    logInfo(`Error checking profiles: ${profilesError.message}`)
    return { needsMigration: true, missingTables: ['all'] }
  }
}

// ═══════════════════════════════════════════════════════════
// STEP 2: Create auth users and seed data
// ═══════════════════════════════════════════════════════════
async function step2_seedData() {
  console.log('\n' + '═'.repeat(60))
  log('🌱', 'STEP 2: Creating auth users and seeding data')
  console.log('═'.repeat(60))

  // ── 2a: Create Admin user (Dr. Ali) ──
  logInfo('Creating admin user (Dr. Ali)...')

  const adminUser = await createAuthUser({
    email: 'admin@fluentia.academy',
    password: 'Fluentia@2026!',
    full_name: 'د. علي الأحمد',
    role: 'admin',
  })

  if (adminUser) {
    logOk(`Admin user created/found: ${adminUser.id}`)

    // Ensure profile exists with admin role
    await adminClient.from('profiles').upsert({
      id: adminUser.id,
      full_name: 'د. علي الأحمد',
      display_name: 'د. علي',
      role: 'admin',
      email: 'admin@fluentia.academy',
      phone: '+966 55 866 9974',
    }, { onConflict: 'id' })

    // Also create trainer record for Dr. Ali (he's also the trainer)
    await adminClient.from('trainers').upsert({
      id: adminUser.id,
      specialization: ['General English', 'IELTS', 'Business English'],
      per_session_rate: 150,
      is_active: true,
    }, { onConflict: 'id' })

    logOk('Admin profile + trainer record created')
  }

  // ── 2b: Create Groups ──
  logInfo('Creating groups...')

  const groups = [
    { name: 'Level 2 - Group A', code: '2A', level: 2, trainer_id: adminUser?.id, google_meet_link: 'https://meet.google.com/fluentia-2a', schedule: { days: ['Sunday', 'Tuesday'], time: '20:00', timezone: 'Asia/Riyadh' } },
    { name: 'Level 2 - Group B', code: '2B', level: 2, trainer_id: adminUser?.id, google_meet_link: 'https://meet.google.com/fluentia-2b', schedule: { days: ['Monday', 'Wednesday'], time: '20:00', timezone: 'Asia/Riyadh' } },
    { name: 'Level 1 - Group A', code: '1A', level: 1, trainer_id: adminUser?.id, google_meet_link: 'https://meet.google.com/fluentia-1a', schedule: { days: ['Saturday', 'Monday', 'Wednesday'], time: '19:00', timezone: 'Asia/Riyadh' } },
  ]

  const groupIds = {}
  for (const group of groups) {
    // Check if group already exists
    const { data: existing } = await adminClient.from('groups').select('id').eq('code', group.code).single()
    if (existing) {
      groupIds[group.code] = existing.id
      logInfo(`Group ${group.code} already exists: ${existing.id}`)
    } else {
      const { data: created, error } = await adminClient.from('groups').insert(group).select('id').single()
      if (created) {
        groupIds[group.code] = created.id
        logOk(`Group ${group.code} created: ${created.id}`)
      } else {
        logErr(`Failed to create group ${group.code}: ${error?.message}`)
      }
    }
  }

  // ── 2c: Create Student Users ──
  logInfo('Creating student users...')

  const studentDefs = [
    { email: 'nadia@fluentia.test',    full_name: 'نادية خيار القحطاني', level: 2, group: '2A', price: 600,  package: 'asas',   payment_day: 1 },
    { email: 'alhanouf@fluentia.test',  full_name: 'الهنوف البقمي',       level: 2, group: '2A', price: 800,  package: 'talaqa', payment_day: 10 },
    { email: 'hawazin@fluentia.test',   full_name: 'هوازن العتيبي',       level: 2, group: '2B', price: 500,  package: 'asas',   payment_day: 15 },
    { email: 'manar@fluentia.test',     full_name: 'منار العتيبي',        level: 1, group: '1A', price: 500,  package: 'asas',   payment_day: 1 },
    { email: 'baseereen@fluentia.test', full_name: 'بسيرين',             level: 1, group: '1A', price: 950,  package: 'talaqa', payment_day: 16 },
    { email: 'ghaida@fluentia.test',    full_name: 'غيداء',              level: 2, group: '2B', price: 800,  package: 'ielts',  payment_day: 20 },
  ]

  const studentIds = {}
  for (const s of studentDefs) {
    const user = await createAuthUser({
      email: s.email,
      password: 'Student@2026!',
      full_name: s.full_name,
      role: 'student',
    })

    if (user) {
      studentIds[s.email] = user.id

      // Upsert profile
      await adminClient.from('profiles').upsert({
        id: user.id,
        full_name: s.full_name,
        role: 'student',
        email: s.email,
      }, { onConflict: 'id' })

      // Upsert student record
      const { error: studentErr } = await adminClient.from('students').upsert({
        id: user.id,
        academic_level: s.level,
        package: s.package,
        track: s.level <= 2 ? 'foundation' : 'development',
        group_id: groupIds[s.group],
        custom_price: s.price,
        payment_day: s.payment_day,
        status: 'active',
        enrollment_date: '2025-09-01',
        xp_total: Math.floor(Math.random() * 500),
        current_streak: Math.floor(Math.random() * 15),
      }, { onConflict: 'id' })

      if (studentErr) {
        logErr(`Failed student record for ${s.full_name}: ${studentErr.message}`)
      } else {
        logOk(`Student ${s.full_name} created`)
      }
    }
  }

  // ── 2d: Seed Achievements ──
  logInfo('Seeding achievements...')

  const achievements = [
    { code: 'fire_starter',    name_ar: 'شرارة البداية',  name_en: 'Fire Starter',    description_ar: 'أول واجب يتم تسليمه',                icon: '🔥', xp_reward: 25,  condition: { type: 'submission_count', target: 1 } },
    { code: 'bookworm',        name_ar: 'دودة كتب',       name_en: 'Bookworm',        description_ar: '10 واجبات قراءة مكتملة',              icon: '📚', xp_reward: 50,  condition: { type: 'submission_count', target: 10, assignment_type: 'reading' } },
    { code: 'voice_hero',      name_ar: 'بطل الصوت',      name_en: 'Voice Hero',      description_ar: '10 تسجيلات صوتية',                    icon: '🎤', xp_reward: 50,  condition: { type: 'submission_count', target: 10, assignment_type: 'speaking' } },
    { code: 'grammar_guru',    name_ar: 'خبير القرامر',   name_en: 'Grammar Guru',    description_ar: '5 درجات A+ بالقرامر',                icon: '✍️', xp_reward: 75,  condition: { type: 'grade_count', target: 5, grade: 'A+', assignment_type: 'grammar' } },
    { code: 'helper',          name_ar: 'المساعد',        name_en: 'Helper',          description_ar: '5 شكر من الزملاء',                    icon: '🤝', xp_reward: 50,  condition: { type: 'peer_recognition_count', target: 5 } },
    { code: 'mvp',             name_ar: 'الأفضل',         name_en: 'MVP',             description_ar: 'المركز الأول بالترتيب لأسبوع',         icon: '🏆', xp_reward: 100, condition: { type: 'leaderboard_top', target: 1, period: 'week' } },
    { code: 'streak_master',   name_ar: 'أسطورة الاستمرار',name_en: 'Streak Master',   description_ar: 'سلسلة 30 يوم متواصلة',                icon: '⚡', xp_reward: 200, condition: { type: 'streak', target: 30 } },
    { code: 'level_up',        name_ar: 'ترقية',          name_en: 'Level Up',        description_ar: 'الانتقال للمستوى التالي',              icon: '📈', xp_reward: 100, condition: { type: 'level_promotion' } },
    { code: 'sniper',          name_ar: 'القناص',         name_en: 'Sniper',          description_ar: '10 إجابات صحيحة متتالية',             icon: '🎯', xp_reward: 75,  condition: { type: 'correct_streak', target: 10 } },
    { code: 'note_taker',      name_ar: 'الملخّص',        name_en: 'Note Taker',      description_ar: '5 ملخصات كلاس مشاركة',                icon: '📝', xp_reward: 50,  condition: { type: 'notes_shared', target: 5 } },
    { code: 'perfect_week',    name_ar: 'أسبوع مثالي',    name_en: 'Perfect Week',    description_ar: 'كل واجبات الأسبوع بوقتها',            icon: '🌟', xp_reward: 75,  condition: { type: 'perfect_week' } },
    { code: 'diamond_student', name_ar: 'الطالب الماسي',  name_en: 'Diamond Student', description_ar: 'جمع كل الشارات الأخرى',               icon: '💎', xp_reward: 500, condition: { type: 'all_achievements' } },
    { code: 'ambassador',      name_ar: 'السفير',         name_en: 'Ambassador',      description_ar: '3 إحالات ناجحة',                      icon: '🎖️', xp_reward: 150, condition: { type: 'referral_count', target: 3 } },
    { code: 'social_warrior',  name_ar: 'المحارب الرقمي', name_en: 'Social Warrior',  description_ar: '5 مشاركات على السوشال',               icon: '📱', xp_reward: 50,  condition: { type: 'share_count', target: 5 } },
  ]

  for (const a of achievements) {
    const { error } = await adminClient.from('achievements').upsert(a, { onConflict: 'code' })
    if (error) logErr(`Achievement ${a.code}: ${error.message}`)
  }
  logOk(`${achievements.length} achievements seeded`)

  // ── 2e: Seed Settings ──
  logInfo('Seeding system settings...')

  const settings = [
    { key: 'xp_values', value: { assignment_on_time: 10, assignment_late: 5, class_attendance: 15, correct_answer_min: 5, correct_answer_max: 20, helped_peer: 10, shared_summary: 15, streak_7: 50, streak_14: 100, streak_30: 200, first_submission: 25, placement_test: 20, voice_note_bonus: 5, writing_bonus: 5, daily_challenge: 5, early_bird: 5, reaction_received: 2, penalty_absent: -20, penalty_unknown_word: -5, penalty_pronunciation: -5 } },
    { key: 'package_prices', value: { asas: 750, talaqa: 1100, tamayuz: 1500, ielts: 2000 } },
    { key: 'writing_limits', value: { asas: 2, talaqa: 4, tamayuz: 8, ielts: 8 } },
    { key: 'chatbot_limits', value: { asas: 10, talaqa: 20, tamayuz: 999, ielts: 20 } },
    { key: 'ai_monthly_budget_sar', value: 50 },
    { key: 'moyasar_payment_link', value: '' },
    { key: 'academy_info', value: { name: 'Fluentia Academy', name_ar: 'أكاديمية طلاقة', phone: '+966 55 866 9974', tiktok: '@fluentia_', instagram: '@fluentia__' } },
  ]

  for (const s of settings) {
    const { error } = await adminClient.from('settings').upsert(s, { onConflict: 'key' })
    if (error) logErr(`Setting ${s.key}: ${error.message}`)
  }
  logOk(`${settings.length} settings seeded`)

  // ── 2f: Verify ──
  logInfo('Verifying seed data...')

  const { data: profiles } = await adminClient.from('profiles').select('full_name, role')
  if (profiles) {
    console.log('\n  Profiles in database:')
    profiles.forEach(p => console.log(`    ${p.role.padEnd(8)} | ${p.full_name}`))
    logOk(`${profiles.length} profiles found`)
  }

  const { data: groupsData } = await adminClient.from('groups').select('code, name, level')
  if (groupsData) {
    console.log('\n  Groups in database:')
    groupsData.forEach(g => console.log(`    ${g.code.padEnd(4)} | Level ${g.level} | ${g.name}`))
    logOk(`${groupsData.length} groups found`)
  }

  const { data: settingsData } = await adminClient.from('settings').select('key')
  logOk(`${settingsData?.length || 0} settings found`)

  const { data: achievementsData } = await adminClient.from('achievements').select('code')
  logOk(`${achievementsData?.length || 0} achievements found`)

  return { adminUser, studentIds, groupIds }
}

// Helper: Create auth user (or find existing)
async function createAuthUser({ email, password, full_name, role }) {
  // Check if user already exists
  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  const existing = existingUsers?.users?.find(u => u.email === email)

  if (existing) {
    logInfo(`Auth user ${email} already exists: ${existing.id}`)
    return existing
  }

  // Create new user
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email
    user_metadata: { full_name, role },
  })

  if (error) {
    logErr(`Failed to create auth user ${email}: ${error.message}`)
    return null
  }

  logOk(`Auth user created: ${email} (${data.user.id})`)
  return data.user
}

// ═══════════════════════════════════════════════════════════
// STEP 3: Test RLS Policies
// ═══════════════════════════════════════════════════════════
async function step3_testRLS(seedResult) {
  console.log('\n' + '═'.repeat(60))
  log('🔐', 'STEP 3: Testing Row Level Security policies')
  console.log('═'.repeat(60))

  if (!seedResult?.adminUser || Object.keys(seedResult?.studentIds || {}).length === 0) {
    logWarn('Skipping RLS tests — need seeded users first')
    return
  }

  let passed = 0
  let failed = 0

  function assertTest(name, condition) {
    if (condition) {
      logOk(`RLS: ${name}`)
      passed++
    } else {
      logErr(`RLS: ${name}`)
      failed++
    }
  }

  // ── Test as Admin ──
  logInfo('Testing as ADMIN...')

  // Sign in as admin
  const { data: adminSession } = await anonClient.auth.signInWithPassword({
    email: 'admin@fluentia.academy',
    password: 'Fluentia@2026!',
  })

  if (!adminSession?.session) {
    logErr('Failed to sign in as admin — cannot test RLS')
    return
  }

  // Create admin-scoped client
  const adminScopedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${adminSession.session.access_token}` } }
  })

  // Admin should see ALL profiles
  const { data: adminProfiles } = await adminScopedClient.from('profiles').select('id')
  assertTest('Admin sees all profiles', adminProfiles && adminProfiles.length >= 7) // admin + 6 students

  // Admin should see all students
  const { data: adminStudents } = await adminScopedClient.from('students').select('id')
  assertTest('Admin sees all students', adminStudents && adminStudents.length >= 6)

  // Admin should see all groups
  const { data: adminGroups } = await adminScopedClient.from('groups').select('id')
  assertTest('Admin sees all groups', adminGroups && adminGroups.length >= 3)

  // Admin should see settings
  const { data: adminSettings } = await adminScopedClient.from('settings').select('key')
  assertTest('Admin sees settings', adminSettings && adminSettings.length >= 7)

  // Admin should see achievements
  const { data: adminAchievements } = await adminScopedClient.from('achievements').select('code')
  assertTest('Admin sees achievements', adminAchievements && adminAchievements.length >= 14)

  await anonClient.auth.signOut()

  // ── Test as Student ──
  logInfo('Testing as STUDENT (نادية)...')

  const studentEmail = 'nadia@fluentia.test'
  const { data: studentSession } = await anonClient.auth.signInWithPassword({
    email: studentEmail,
    password: 'Student@2026!',
  })

  if (!studentSession?.session) {
    logErr(`Failed to sign in as student ${studentEmail}`)
    // Try another student
    logWarn('Checking if auth works at all...')
    const { data: listResult } = await adminClient.auth.admin.listUsers()
    logInfo(`Total auth users: ${listResult?.users?.length || 0}`)
  } else {
    const studentScopedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${studentSession.session.access_token}` } }
    })

    // Student should see all profiles (names/avatars are public)
    const { data: studentProfiles } = await studentScopedClient.from('profiles').select('id')
    assertTest('Student can read profiles (public)', studentProfiles && studentProfiles.length >= 1)

    // Student should see only their own student record
    const { data: studentRecord, error: studentRecordErr } = await studentScopedClient.from('students').select('id')
    assertTest('Student sees only own student record',
      studentRecord && studentRecord.length === 1 && studentRecord[0].id === studentSession.session.user.id)

    // Student should NOT see settings
    const { data: studentSettings } = await studentScopedClient.from('settings').select('key')
    assertTest('Student cannot see settings', !studentSettings || studentSettings.length === 0)

    // Student should NOT see payments of others
    const { data: studentPayments } = await studentScopedClient.from('payments').select('id')
    assertTest('Student sees only own payments (none yet = 0)', studentPayments !== null && studentPayments.length === 0)

    // Student should NOT see system_errors
    const { data: studentErrors } = await studentScopedClient.from('system_errors').select('id')
    assertTest('Student cannot see system_errors', !studentErrors || studentErrors.length === 0)

    // Student should NOT see audit_log
    const { data: studentAudit } = await studentScopedClient.from('audit_log').select('id')
    assertTest('Student cannot see audit_log', !studentAudit || studentAudit.length === 0)

    // Student should see achievements (public)
    const { data: studentAch } = await studentScopedClient.from('achievements').select('code')
    assertTest('Student can read achievements', studentAch && studentAch.length >= 14)

    // Student should see their group
    const { data: studentGroups } = await studentScopedClient.from('groups').select('id')
    assertTest('Student can read groups', studentGroups && studentGroups.length >= 1)

    await anonClient.auth.signOut()
  }

  // ── Test as Trainer ──
  logInfo('Testing as TRAINER (admin is also trainer)...')

  const { data: trainerSession } = await anonClient.auth.signInWithPassword({
    email: 'admin@fluentia.academy',
    password: 'Fluentia@2026!',
  })

  if (trainerSession?.session) {
    // Admin/trainer should see all students (admin overrides trainer restriction)
    const trainerScopedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${trainerSession.session.access_token}` } }
    })

    const { data: trainerStudents } = await trainerScopedClient.from('students').select('id')
    assertTest('Trainer/Admin sees students', trainerStudents && trainerStudents.length >= 6)

    // Trainer should see their groups
    const { data: trainerGroups } = await trainerScopedClient.from('groups').select('id')
    assertTest('Trainer sees groups', trainerGroups && trainerGroups.length >= 3)

    await anonClient.auth.signOut()
  }

  // ── Summary ──
  console.log('\n' + '─'.repeat(40))
  logInfo(`RLS Test Results: ${passed} passed, ${failed} failed`)
  if (failed === 0) {
    logOk('All RLS tests passed!')
  } else {
    logErr(`${failed} RLS test(s) failed — check policies`)
  }

  return { passed, failed }
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
async function main() {
  console.log('\n🚀 Fluentia LMS — Database Setup Script\n')

  // Step 1: Check database
  const step1Result = await step1_checkAndMigrate()

  if (step1Result.needsMigration) {
    console.log('\n' + '⚠️'.repeat(30))
    logWarn('MIGRATIONS NEED TO BE APPLIED FIRST!')
    logInfo('The SQL migration files need to be run against the Supabase database.')
    logInfo('Options:')
    logInfo('  1. Go to Supabase Dashboard → SQL Editor → paste each migration file')
    logInfo('  2. Use: npx supabase db push (requires Supabase CLI auth)')
    logInfo('')
    logInfo('Migration files (run in order):')
    logInfo('  1. supabase/migrations/001_initial_schema.sql')
    logInfo('  2. supabase/migrations/002_rls_policies.sql')
    logInfo('  3. supabase/migrations/003_triggers_and_functions.sql')
    logInfo('  4. supabase/migrations/004_storage_buckets.sql')
    console.log('\n' + '⚠️'.repeat(30))

    logInfo('\nAttempting to apply migrations via SQL API...')
    await applyMigrationsViaAPI()

    // Re-check
    const recheck = await step1_checkAndMigrate()
    if (recheck.needsMigration) {
      logErr('Migrations could not be applied automatically.')
      logInfo('Please apply them manually via the Supabase Dashboard SQL Editor.')
      logInfo('Then re-run this script: node scripts/setup-database.mjs')
      process.exit(1)
    }
  }

  // Step 2: Seed data
  const seedResult = await step2_seedData()

  // Step 3: Test RLS
  const rlsResult = await step3_testRLS(seedResult)

  // Final summary
  console.log('\n' + '═'.repeat(60))
  log('📊', 'FINAL SUMMARY')
  console.log('═'.repeat(60))
  logOk('Database tables: verified')
  logOk(`Auth users: admin + ${Object.keys(seedResult?.studentIds || {}).length} students`)
  logOk(`Groups: ${Object.keys(seedResult?.groupIds || {}).length}`)
  if (rlsResult) {
    logOk(`RLS tests: ${rlsResult.passed} passed, ${rlsResult.failed} failed`)
  }

  console.log('\n📌 Login credentials:')
  console.log('   Admin:    admin@fluentia.academy / Fluentia@2026!')
  console.log('   Students: <name>@fluentia.test / Student@2026!')
  console.log('   (nadia, alhanouf, hawazin, manar, baseereen, ghaida)')
  console.log('')
}

// Try to apply migrations via Supabase SQL API
async function applyMigrationsViaAPI() {
  const migrationFiles = [
    'supabase/migrations/001_initial_schema.sql',
    'supabase/migrations/002_rls_policies.sql',
    'supabase/migrations/003_triggers_and_functions.sql',
    'supabase/migrations/004_storage_buckets.sql',
  ]

  for (const file of migrationFiles) {
    logInfo(`Applying ${file}...`)
    try {
      const sql = readFileSync(resolve(PROJECT_ROOT, file), 'utf-8')

      // Try using the Supabase SQL API endpoint
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: sql,
      })

      if (response.ok) {
        logOk(`Applied ${file}`)
      } else {
        const text = await response.text()
        logWarn(`API returned ${response.status} for ${file}: ${text.substring(0, 200)}`)
      }
    } catch (err) {
      logErr(`Error applying ${file}: ${err.message}`)
    }
  }
}

main().catch(err => {
  logErr(`Fatal error: ${err.message}`)
  console.error(err)
  process.exit(1)
})
