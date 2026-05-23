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
  // Recent failure events for listening context
  const { data, error } = await sb
    .from('audio_event_log')
    .select('*')
    .eq('context', 'listening')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) {
    console.log('ERROR querying audio_event_log:', error.message)
    return
  }
  console.log(`AUDIO_EVENT_LOG (listening, last 20): ${data.length} rows`)
  console.log(JSON.stringify(data, null, 2))
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
