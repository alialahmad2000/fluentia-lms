const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
function loadEnv() {
  const env = {}
  fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8').split('\n').forEach(l => {
    const i = l.indexOf('='); if (i <= 0) return
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
  const { data, error } = await sb.from('audio_telemetry').select('*').limit(1).maybeSingle()
  if (error) { console.log('error:', error.message); return }
  console.log('audio_telemetry COLUMNS:', Object.keys(data || {}))
  console.log('sample row:', JSON.stringify(data, null, 2))
})()
