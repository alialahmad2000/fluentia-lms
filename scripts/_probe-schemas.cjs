const fs = require('fs')
const env = {}
fs.readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=')
  if (k && v.length) {
    let val = v.join('=').trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    val = val.replace(/\\n$/, '')
    env[k.trim()] = val
  }
})
const { createClient } = require('@supabase/supabase-js')
const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function probe(table) {
  const { data, error } = await admin.from(table).select('*').limit(1)
  if (error) return console.log(`${table}: ERROR ${error.message}`)
  if (!data || !data.length) return console.log(`${table}: EMPTY`)
  console.log(`${table}: ${Object.keys(data[0]).join(', ')}`)
}

;(async () => {
  await probe('students')
  await probe('profiles')
  await probe('notifications')
})()
