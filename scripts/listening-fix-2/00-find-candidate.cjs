const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const env = {}
  fs.readFileSync(path.resolve(__dirname, '/Users/dr.ali/projects/fluentia-lms/.env'), 'utf8').split('\n').forEach(l => {
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
  // 1. Resolve the test student's level + group + units assigned
  const { data: testStudent, error: e1 } = await sb
    .from('profiles')
    .select('id, email, role')
    .eq('email', 'mock-test-a1@fluentia.academy')
    .maybeSingle()
  if (e1) throw e1
  console.log('TEST STUDENT:', JSON.stringify(testStudent, null, 2))

  if (testStudent) {
    const { data: studentRow } = await sb
      .from('students')
      .select('id, profile_id, academic_level, group_id, status')
      .eq('profile_id', testStudent.id)
      .maybeSingle()
    console.log('STUDENT ROW:', JSON.stringify(studentRow, null, 2))

    if (studentRow?.academic_level) {
      // Find level UUID
      const { data: levelRow } = await sb
        .from('curriculum_levels')
        .select('id, level_number, name_en')
        .eq('level_number', studentRow.academic_level)
        .maybeSingle()
      console.log('LEVEL ROW:', JSON.stringify(levelRow, null, 2))

      if (levelRow) {
        // Find recent listening items at this level with audio_url
        const { data: listenings, error: e3 } = await sb
          .from('curriculum_listening')
          .select(`
            id, unit_id, title_en, title_ar, audio_url, is_published,
            curriculum_units!inner(id, theme_en, theme_ar, level_id, is_published, sort_order)
          `)
          .not('audio_url', 'is', null)
          .eq('is_published', true)
          .eq('curriculum_units.level_id', levelRow.id)
          .eq('curriculum_units.is_published', true)
          .order('sort_order', { referencedTable: 'curriculum_units', ascending: true })
          .limit(5)
        if (e3) throw e3
        console.log('\nLISTENING CANDIDATES (test student level):')
        console.log(JSON.stringify(listenings, null, 2))
      }
    }
  }

  // Fallback: just list 5 recent published listening rows with audio
  const { data: anyListening, error: e4 } = await sb
    .from('curriculum_listening')
    .select(`
      id, unit_id, title_en, title_ar, audio_url, audio_duration_seconds, is_published,
      curriculum_units!inner(id, theme_en, level_id, is_published)
    `)
    .not('audio_url', 'is', null)
    .eq('is_published', true)
    .eq('curriculum_units.is_published', true)
    .order('created_at', { ascending: false })
    .limit(5)
  if (e4) throw e4
  console.log('\nLISTENING CANDIDATES (any level, recent):')
  console.log(JSON.stringify(anyListening, null, 2))
})().catch(e => { console.error('FATAL:', e); process.exit(1) })
