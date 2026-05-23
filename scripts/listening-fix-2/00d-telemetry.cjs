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
  for (const tbl of ['audio_telemetry', 'audio_event_log']) {
    const { data, error, count } = await sb
      .from(tbl)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(10)
    if (error) {
      console.log(`${tbl}: ERROR — ${error.message}`)
      continue
    }
    console.log(`\n${tbl}: ${count} total rows, showing last ${data.length}`)
    for (const row of data) {
      console.log(` ${row.created_at} | ctx=${row.context || row.audio_context || '?'} | err_code=${row.error_code} | url=${(row.audio_url || row.source_url || '').slice(0, 120)}`)
    }
  }
})().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
