const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

function loadEnv() { const env = {}; fs.readFileSync(path.resolve(__dirname, '../../../.env'), 'utf8').split('\n').forEach(l => { const i = l.indexOf('='); if (i <= 0) return; let v = l.slice(i+1).trim(); if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1); v=v.replace(/\\n$/,''); env[l.slice(0,i).trim()]=v }); return env }
const env = loadEnv()
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

;(async () => {
  fs.mkdirSync(path.resolve(__dirname, '../../../docs/audits/listening-fix'), { recursive: true })
  const { data, error } = await sb
    .from('curriculum_listening')
    .select('id, unit_id, audio_url, audio_duration_seconds, audio_type, speaker_segments, title_ar, title_en, transcript, audio_generated_at, segments_processed_at, word_timestamps, listening_number, sort_order, is_published')
    .order('unit_id')
  if (error) throw error

  const stats = {
    total: data.length,
    has_audio_url: data.filter(r => r.audio_url).length,
    missing_audio_url: data.filter(r => !r.audio_url).length,
    has_transcript: data.filter(r => r.transcript).length,
    missing_transcript: data.filter(r => !r.transcript).length,
    is_published_true: data.filter(r => r.is_published).length,
    is_published_false: data.filter(r => !r.is_published).length,
    columns: data[0] ? Object.keys(data[0]) : [],
  }
  fs.writeFileSync(path.resolve(__dirname, '../../../docs/audits/listening-fix/inventory.json'), JSON.stringify({ stats, rows: data }, null, 2))
  console.log(JSON.stringify(stats, null, 2))
})().catch(e => { console.error(e); process.exit(1) })
