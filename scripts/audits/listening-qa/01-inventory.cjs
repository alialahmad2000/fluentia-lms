// Inventory every listening row with audio
require('dotenv').config()
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

function loadEnv() {
  const txt = fs.readFileSync('.env', 'utf8')
  const env = {}
  for (const line of txt.split('\n')) {
    const [k, ...rest] = line.split('=')
    if (!k || rest.length === 0) continue
    let v = rest.join('=').trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    v = v.replace(/\\n$/, '')
    env[k.trim()] = v
  }
  return env
}

(async () => {
  const env = loadEnv()
  const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const { data, error } = await sb
    .from('curriculum_listening')
    .select('id, unit_id, audio_url, audio_duration_seconds, audio_type, speaker_segments, title_ar, title_en, transcript, curriculum_units!inner(id, unit_number, level_id, curriculum_levels!inner(id, level_number))')
    .not('audio_url', 'is', null)
    .order('unit_id', { ascending: true })

  if (error) {
    console.error('inventory query failed:', error)
    process.exit(1)
  }

  fs.mkdirSync('docs/audits/listening-qa', { recursive: true })
  fs.writeFileSync('docs/audits/listening-qa/inventory.json', JSON.stringify(data, null, 2))
  console.log(`Inventoried ${data.length} listening rows with audio`)

  // Summary by audio_type
  const byType = {}
  for (const r of data) {
    const t = r.audio_type || '(null)'
    byType[t] = (byType[t] || 0) + 1
  }
  console.log('By audio_type:', JSON.stringify(byType))

  // Summary by level number
  const byLevel = {}
  for (const r of data) {
    const l = r.curriculum_units?.curriculum_levels?.level_number ?? '(null)'
    byLevel[l] = (byLevel[l] || 0) + 1
  }
  console.log('By level_number:', JSON.stringify(byLevel))
})()
