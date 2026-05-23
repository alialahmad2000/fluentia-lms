const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const env = {}
  fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8').split('\n').forEach(l => {
    const i = l.indexOf('=')
    if (i <= 0) return
    let v = l.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    v = v.replace(/\\n$/, '')
    env[l.slice(0, i).trim()] = v
  })
  return env
}
const env = loadEnv()
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

;(async () => {
  // 10 sample listening_audio rows from various transcripts
  const { data, error } = await sb
    .from('listening_audio')
    .select('transcript_id, segment_index, audio_url, duration_ms, speaker_label')
    .order('transcript_id', { ascending: true })
    .order('segment_index', { ascending: true })
    .limit(20)
  if (error) { console.error(error); return }
  console.log(`Sample 20 listening_audio rows:`)
  for (const r of data) console.log(`  ${r.transcript_id.slice(0,8)} seg=${r.segment_index} dur=${r.duration_ms}ms  ${r.audio_url}`)

  // Aggregate distinct URLs in listening_audio
  const { data: all } = await sb.from('listening_audio').select('audio_url')
  const urls = new Set((all || []).map(r => r.audio_url))
  console.log(`\nlistening_audio total rows: ${all?.length}`)
  console.log(`listening_audio distinct audio_urls: ${urls.size}`)

  // Are the listening_audio URLs same as curriculum_listening?
  const { data: cl } = await sb.from('curriculum_listening').select('audio_url').not('audio_url','is',null)
  const clUrls = new Set((cl || []).map(r => r.audio_url))
  console.log(`curriculum_listening distinct audio_urls: ${clUrls.size}`)

  // Intersection
  let overlap = 0
  for (const u of urls) if (clUrls.has(u)) overlap++
  console.log(`overlap (listening_audio ⊆ curriculum_listening): ${overlap}`)
  // Difference
  const onlyInLa = [...urls].filter(u => !clUrls.has(u))
  console.log(`only in listening_audio: ${onlyInLa.length}`)
  if (onlyInLa.length) console.log('  sample:', onlyInLa[0])
})()
