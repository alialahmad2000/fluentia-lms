// Inspect actual storage.objects metadata (server-side) and try several fixes.

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

const TARGET = 'listening/L1/2992edc4-d68d-4f16-99d1-ab7b7a2683c3/s0_nadia.mp3'

;(async () => {
  // 1. Query storage.objects table directly (using PostgREST exposure if available)
  console.log('=== storage.objects via storage-client.list ===')
  const folder = TARGET.split('/').slice(0, -1).join('/')
  const name = TARGET.split('/').pop()
  const { data: listData, error: listErr } = await sb.storage.from('curriculum-audio').list(folder)
  if (listErr) console.log('list err:', listErr.message)
  else {
    const match = listData.find(o => o.name === name)
    console.log('match:', JSON.stringify(match, null, 2))
  }

  // 2. Try direct REST: PATCH metadata
  console.log('\n=== try direct REST: GET /object/info/curriculum-audio/<path> ===')
  const infoUrl = `${env.VITE_SUPABASE_URL}/storage/v1/object/info/curriculum-audio/${encodeURI(TARGET)}`
  try {
    const r = await fetch(infoUrl, {
      headers: { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    })
    console.log('status:', r.status)
    if (r.ok) console.log('body:', await r.text())
  } catch (e) { console.log('err:', e.message) }

  // 3. Try /object/list with prefix to see internal metadata
  console.log('\n=== POST /object/list with prefix ===')
  try {
    const r = await fetch(`${env.VITE_SUPABASE_URL}/storage/v1/object/list/curriculum-audio`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefix: folder, limit: 5 }),
    })
    console.log('status:', r.status)
    const body = await r.text()
    console.log('body:', body.slice(0, 2000))
  } catch (e) { console.log('err:', e.message) }
})()
