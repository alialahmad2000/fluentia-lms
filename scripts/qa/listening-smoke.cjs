#!/usr/bin/env node
// listening-smoke.cjs — fetch a sample of curriculum_listening rows, HEAD-probe
// + ffmpeg decode-test each. Exit non-zero on any failure.
//
//   NODE_OPTIONS="--dns-result-order=ipv4first" node scripts/qa/listening-smoke.cjs
//
// Confirms the playback SOURCES are healthy. The player-race fix is verified
// separately (frontend). All 72 rows were decode-clean at Phase A.

const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const { createClient } = require('@supabase/supabase-js')

const env = {}
fs.readFileSync('.env', 'utf8').split('\n').forEach((l) => {
  const [k, ...v] = l.split('=')
  if (k && v.length) {
    let x = v.join('=').trim()
    if ((x.startsWith('"') && x.endsWith('"')) || (x.startsWith("'") && x.endsWith("'"))) x = x.slice(1, -1)
    env[k.trim()] = x.replace(/\\n$/, '')
  }
})

const admin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

async function head(url) {
  const r = await fetch(url, { method: 'HEAD' })
  return { status: r.status, type: r.headers.get('content-type') }
}

function decodes(url) {
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-i', url, '-f', 'null', '-'], { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

;(async () => {
  const { data, error } = await admin
    .from('curriculum_listening')
    .select('id, audio_url, title_ar')
    .not('audio_url', 'is', null)
    .order('created_at', { ascending: true })
    .limit(5)
  if (error) {
    console.error('DB error:', error.message)
    process.exit(1)
  }

  let fails = 0
  for (const row of data) {
    const h = await head(row.audio_url)
    const ok2xx = h.status >= 200 && h.status < 300
    const dec = ok2xx ? decodes(row.audio_url) : false
    const pass = ok2xx && dec && /audio\//.test(h.type || '')
    if (!pass) fails++
    console.log(`${pass ? 'PASS' : 'FAIL'} ${row.id} status=${h.status} type=${h.type} decode=${dec} — ${row.title_ar || ''}`)
  }

  console.log(`\n${data.length - fails}/${data.length} healthy`)
  process.exit(fails === 0 ? 0 : 1)
})()
