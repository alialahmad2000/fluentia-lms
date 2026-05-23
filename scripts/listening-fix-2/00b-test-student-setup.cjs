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
  // 1. Direct query against students table for mock-test-a1 profile id
  const { data: row, error } = await sb
    .from('students')
    .select('*')
    .eq('id', 'a82486b6-9472-4aba-b902-a0ec354ca170')
    .maybeSingle()
  console.log('STUDENT ROW (mock-test-a1):', row, 'ERROR:', error)

  // 2. Count active students by academic_level (raw)
  const { data: levels } = await sb
    .from('students')
    .select('academic_level, status')
    .eq('status', 'active')
    .limit(50)
  const byLevel = {}
  for (const s of (levels || [])) byLevel[s.academic_level] = (byLevel[s.academic_level] || 0) + 1
  console.log('ACTIVE STUDENTS BY LEVEL:', byLevel)

  // 3. Pick an L1 student that exists (real)
  const { data: realStudent } = await sb
    .from('students')
    .select('id, academic_level, status, group_id')
    .eq('academic_level', 1)
    .eq('status', 'active')
    .limit(1)
  console.log('SAMPLE L1 ACTIVE STUDENT (raw):', realStudent)

  // 4. Check listening for L1 units
  const { data: l1Level } = await sb
    .from('curriculum_levels')
    .select('id, level_number')
    .eq('level_number', 1)
    .maybeSingle()
  console.log('L1 LEVEL:', l1Level)

  if (l1Level) {
    const { data: l1Listenings } = await sb
      .from('curriculum_listening')
      .select(`id, unit_id, title_en, title_ar, audio_url, audio_duration_seconds, is_published,
        curriculum_units!inner(id, theme_en, sort_order, level_id, is_published)`)
      .eq('curriculum_units.level_id', l1Level.id)
      .not('audio_url', 'is', null)
      .order('sort_order', { referencedTable: 'curriculum_units', ascending: true })
      .limit(5)
    console.log('\nL1 LISTENINGS:', JSON.stringify(l1Listenings, null, 2))
  }

  // 5. Check ListeningTab visibility logic: list 1 L1 unit's listening rows
  const { data: aL1Unit } = await sb
    .from('curriculum_units')
    .select('id, theme_en, sort_order, level_id, is_published')
    .eq('level_id', l1Level?.id)
    .order('sort_order')
    .limit(1)
    .maybeSingle()
  console.log('\nFIRST L1 UNIT:', aL1Unit)
  if (aL1Unit) {
    const { data: rows } = await sb
      .from('curriculum_listening')
      .select('id, listening_number, title_en, audio_url, is_published, audio_duration_seconds, audio_type')
      .eq('unit_id', aL1Unit.id)
      .order('listening_number')
    console.log('LISTENING ROWS FOR THIS UNIT:', JSON.stringify(rows, null, 2))
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
