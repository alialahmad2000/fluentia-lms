/**
 * Pre-Phase 2 fixes:
 * 1. Fix admin display_name
 * 2. Update all groups with correct Google Meet link
 * 3. Update all groups with Sunday+Wednesday schedule
 * 4. Add 6 missing students
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEyNTYxOCwiZXhwIjoyMDg4NzAxNjE4fQ.Abbt3bzmud1B55ym_UW_3kEUMyVkhOiQ_iiLpHo1tfs'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

function log(msg) { console.log(`✅  ${msg}`) }
function err(msg) { console.log(`❌  ${msg}`) }

async function main() {
  // ─── Fix 1: Admin profile name ────────────────────────────
  console.log('\n── Fix 1: Admin profile ──')

  const { data: adminProfile } = await admin
    .from('profiles')
    .select('id, full_name, display_name')
    .eq('role', 'admin')
    .single()

  if (adminProfile) {
    const { error } = await admin
      .from('profiles')
      .update({ full_name: 'د. علي الأحمد', display_name: 'د. علي' })
      .eq('id', adminProfile.id)

    if (error) err(`Admin profile update: ${error.message}`)
    else log(`Admin profile updated: full_name="د. علي الأحمد", display_name="د. علي"`)
  } else {
    err('Admin profile not found')
  }

  // ─── Fix 2 & 3: Groups — Meet link + Schedule ─────────────
  console.log('\n── Fix 2 & 3: Groups (Meet link + Schedule) ──')

  const { data: groups } = await admin.from('groups').select('id, code, name')
  if (groups) {
    for (const g of groups) {
      const { error } = await admin
        .from('groups')
        .update({
          google_meet_link: 'https://meet.google.com/qrc-paov-ruw',
          schedule: { days: ['Sunday', 'Wednesday'], time: '20:00', timezone: 'Asia/Riyadh' },
        })
        .eq('id', g.id)

      if (error) err(`Group ${g.code}: ${error.message}`)
      else log(`Group ${g.code} (${g.name}): meet link + schedule updated`)
    }
  }

  // ─── Fix 4: Add 6 missing students ────────────────────────
  console.log('\n── Fix 4: Add missing students ──')

  // Also update بسيرين's payment_day to 16
  const { data: baseereenProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', 'baseereen@fluentia.test')
    .single()

  if (baseereenProfile) {
    await admin
      .from('students')
      .update({ payment_day: 16 })
      .eq('id', baseereenProfile.id)
    log('بسيرين payment_day updated to 16')
  }

  const newStudents = [
    { email: 'noura@fluentia.test',     full_name: 'نورة الياسي',           custom_price: 500,  payment_day: 16 },
    { email: 'sarah.k@fluentia.test',   full_name: 'سارة خالد منصور',       custom_price: 1200, payment_day: null },
    { email: 'sarah.s@fluentia.test',   full_name: 'سارة شرائحي',          custom_price: 1500, payment_day: null },
    { email: 'leen@fluentia.test',      full_name: 'لين الشهري',           custom_price: 1250, payment_day: null },
    { email: 'waad@fluentia.test',      full_name: 'وعد محمد العمران',      custom_price: 1350, payment_day: null },
    { email: 'fatimah@fluentia.test',   full_name: 'فاطمة خواجي',          custom_price: 850,  payment_day: null },
  ]

  for (const s of newStudents) {
    // Check if already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === s.email)

    let userId
    if (existing) {
      userId = existing.id
      console.log(`  ℹ️  ${s.email} already exists: ${userId}`)
    } else {
      const { data, error: authErr } = await admin.auth.admin.createUser({
        email: s.email,
        password: 'Student@2026!',
        email_confirm: true,
        user_metadata: { full_name: s.full_name, role: 'student' },
      })
      if (authErr) {
        err(`Auth ${s.email}: ${authErr.message}`)
        continue
      }
      userId = data.user.id
      log(`Auth user created: ${s.email} (${userId})`)
    }

    // Upsert profile
    await admin.from('profiles').upsert({
      id: userId,
      full_name: s.full_name,
      role: 'student',
      email: s.email,
    }, { onConflict: 'id' })

    // Upsert student record — no group, level 1, active
    const { error: studentErr } = await admin.from('students').upsert({
      id: userId,
      academic_level: 1,
      package: 'asas',
      track: 'foundation',
      group_id: null,
      custom_price: s.custom_price,
      payment_day: s.payment_day,
      status: 'active',
      enrollment_date: '2025-09-01',
      xp_total: 0,
      current_streak: 0,
    }, { onConflict: 'id' })

    if (studentErr) err(`Student ${s.full_name}: ${studentErr.message}`)
    else log(`Student ${s.full_name} created (group: none, level: 1)`)
  }

  // ─── Verify ───────────────────────────────────────────────
  console.log('\n── Verification ──')

  const { data: adminCheck } = await admin
    .from('profiles')
    .select('full_name, display_name')
    .eq('role', 'admin')
    .single()
  log(`Admin: full_name="${adminCheck?.full_name}", display_name="${adminCheck?.display_name}"`)

  const { data: groupCheck } = await admin
    .from('groups')
    .select('code, google_meet_link, schedule')
  for (const g of groupCheck || []) {
    log(`Group ${g.code}: meet=${g.google_meet_link ? 'set' : 'missing'}, schedule=${JSON.stringify(g.schedule?.days)}`)
  }

  const { data: allStudents } = await admin
    .from('students')
    .select('id, status, group_id, profiles:id(full_name, email)')
    .eq('status', 'active')
  log(`Total active students: ${allStudents?.length}`)
  for (const s of allStudents || []) {
    console.log(`    ${s.profiles?.full_name?.padEnd(25)} | ${s.profiles?.email?.padEnd(30)} | group: ${s.group_id || 'none'}`)
  }
}

main().catch(e => { err(`Fatal: ${e.message}`); process.exit(1) })
