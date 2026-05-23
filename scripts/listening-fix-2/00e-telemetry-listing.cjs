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
  // Dump one row to see the column names
  const { data: oneRow } = await sb.from('audio_event_log').select('*').limit(1).maybeSingle()
  console.log('audio_event_log COLUMNS:', Object.keys(oneRow || {}))
  console.log('SAMPLE ROW:', JSON.stringify(oneRow, null, 2))

  // Listening-context entries — column name TBD
  // Try "context" first, then fall back to others
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
