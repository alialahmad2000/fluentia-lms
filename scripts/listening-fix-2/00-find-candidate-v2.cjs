const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const env = {}
  fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8').split('\n').forEach(l => {
    const i = l.indexOf('='); if (i <= 0) return
    let v = l.slice(i+1).trim()
    if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1)
    v = v.replace(/\\n$/, '')
    env[l.slice(0,i).trim()] = v
  })
  return env
}
const env = loadEnv()
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

;(async () => {
  // Inventory: count listening rows by is_published
  const { count: total } = await sb.from('curriculum_listening').select('id', { count: 'exact', head: true })
  const { count: withAudio } = await sb.from('curriculum_listening').select('id', { count: 'exact', head: true }).not('audio_url', 'is', null)
  const { count: published } = await sb.from('curriculum_listening').select('id', { count: 'exact', head: true }).eq('is_published', true)
  console.log('INVENTORY:', { total, withAudio, published })

  // List 5 with audio, no is_published filter
  const { data } = await sb
    .from('curriculum_listening')
    .select('id, unit_id, title_en, title_ar, audio_url, audio_duration_seconds, is_published, created_at')
    .not('audio_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5)
  console.log('\nTOP 5 WITH AUDIO:')
  console.log(JSON.stringify(data, null, 2))

  // For the top row, fetch its unit + level
  if (data && data[0]) {
    const { data: unit } = await sb
      .from('curriculum_units')
      .select('id, theme_en, theme_ar, level_id, is_published, sort_order')
      .eq('id', data[0].unit_id)
      .maybeSingle()
    console.log('\nUNIT FOR TOP CANDIDATE:')
    console.log(JSON.stringify(unit, null, 2))
    if (unit?.level_id) {
      const { data: level } = await sb
        .from('curriculum_levels')
        .select('id, level_number, name_en, name_ar')
        .eq('id', unit.level_id)
        .maybeSingle()
      console.log('\nLEVEL:')
      console.log(JSON.stringify(level, null, 2))
    }
  }

  // Schema of students table — confirm academic_level column
  const { data: studentSample } = await sb.from('students').select('*').limit(1)
  console.log('\nSTUDENT TABLE SAMPLE KEYS:', studentSample?.[0] ? Object.keys(studentSample[0]) : 'EMPTY')

  // Find ANY active student with academic_level=1 (A1)
  const { data: a1Student } = await sb
    .from('students')
    .select('id, profile_id, academic_level, group_id, status')
    .eq('academic_level', 1)
    .eq('status', 'active')
    .limit(3)
  console.log('\nA1 ACTIVE STUDENTS:', JSON.stringify(a1Student, null, 2))

  // Check profiles for test admin / known accounts
  const { data: testAccounts } = await sb
    .from('profiles')
    .select('id, email, role')
    .in('email', ['mock-test-a1@fluentia.academy', 'mock-test-b1@fluentia.academy', 'admin@fluentia.academy'])
  console.log('\nTEST ACCOUNTS:', JSON.stringify(testAccounts, null, 2))
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
