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

;(async () => {
  const { data: exams } = await admin
    .from('mock_exams')
    .select('id, code, visibility, is_active, open_at, close_at, duration_minutes, level_id, level:curriculum_levels(level_number, name_ar)')
  console.log('mock_exams:')
  const nowUtc = new Date()
  exams.forEach(e => {
    const open = new Date(e.open_at)
    const close = new Date(e.close_at)
    const isOpen = nowUtc >= open && nowUtc <= close
    console.log(`  ${e.code} | L${e.level?.level_number} (${e.level?.name_ar}) | vis=${e.visibility} active=${e.is_active}`)
    console.log(`    open_at_utc=${e.open_at}  → KSA=${open.toLocaleString('sv-SE', { timeZone: 'Asia/Riyadh' })}`)
    console.log(`    close_at_utc=${e.close_at} → KSA=${close.toLocaleString('sv-SE', { timeZone: 'Asia/Riyadh' })}`)
    console.log(`    NOW_UTC=${nowUtc.toISOString()} → KSA=${nowUtc.toLocaleString('sv-SE', { timeZone: 'Asia/Riyadh' })}`)
    console.log(`    is_currently_open=${isOpen}`)
  })
  console.log('\nServer real-now (UTC):', new Date().toISOString())
})()
