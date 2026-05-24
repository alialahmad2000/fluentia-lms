const { createClient } = require('@supabase/supabase-js')
const fs = require('fs'), path = require('path')
const env = {}
fs.readFileSync(path.resolve(__dirname, '../../.env'),'utf8').split('\n').forEach(l => {
  const i = l.indexOf('='); if (i<=0) return
  let v = l.slice(i+1).trim()
  if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v=v.slice(1,-1)
  v = v.replace(/\\n$/, '')
  env[l.slice(0,i).trim()] = v
})
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
;(async () => {
  // Show audio_telemetry table truly exists, with row count and the specific 896ab711 record
  const { count, error: ce } = await sb.from('audio_telemetry').select('*', { count: 'exact', head: true })
  console.log('audio_telemetry rowcount:', count, ce?.message || '')
  // Filter for the specific row I cited
  const { data, error } = await sb
    .from('audio_telemetry')
    .select('*')
    .eq('row_id', '896ab711-ea14-47bc-9e36-f4d09931ffab')
  if (error) { console.log('query error:', error.message); return }
  console.log(`rows matching row_id=896ab711...: ${data.length}`)
  for (const r of data) console.log(JSON.stringify(r, null, 2))
  // Also show ALL distinct error_code values + counts across the whole table
  const { data: all } = await sb.from('audio_telemetry').select('error_code, error_message, audio_url, browser_ua').limit(1000)
  const codeCounts = {}
  for (const x of (all||[])) codeCounts[x.error_code] = (codeCounts[x.error_code]||0)+1
  console.log('\nerror_code histogram across', (all||[]).length, 'rows:', JSON.stringify(codeCounts))
})()
