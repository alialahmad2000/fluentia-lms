// Delete the temporary pilot file from storage and verify the production fixture
// is still byte-identical to the Phase 0 download.

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

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

const PILOT_PATH = 'listening/_pilot_reencoded_2992edc4-d68d-4f16-99d1-ab7b7a2683c3.mp3'
const PROD_URL = 'https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/curriculum-audio/listening/L1/2992edc4-d68d-4f16-99d1-ab7b7a2683c3/s0_nadia.mp3'
const PHASE_0_SHA256 = '8b906107552c29243c6f2ddfdbf7a83813395e31f3479d2df7b6daa0a3d9aed8'

;(async () => {
  // 1. Delete the pilot from storage
  console.log(`=== Removing pilot from storage ===`)
  console.log(`  path: curriculum-audio/${PILOT_PATH}`)
  const { data: rm, error: rmErr } = await sb.storage.from('curriculum-audio').remove([PILOT_PATH])
  if (rmErr) {
    console.error('  delete FAILED:', rmErr.message)
    process.exit(1)
  }
  console.log(`  deleted: ${JSON.stringify(rm)}`)

  // 2. Confirm 404 on the public URL
  const pilotPublicUrl = `${env.VITE_SUPABASE_URL}/storage/v1/object/public/curriculum-audio/${PILOT_PATH}`
  // Wait a moment for cache propagation
  await new Promise(r => setTimeout(r, 1500))
  const headRes = await fetch(pilotPublicUrl + `?_t=${Date.now()}`, { method: 'HEAD', cache: 'no-store' })
  console.log(`\n  pilot HEAD now returns: ${headRes.status} ${headRes.statusText}`)

  // 3. Verify the production fixture is byte-identical to my Phase 0 download
  console.log(`\n=== Verify production fixture untouched ===`)
  console.log(`  URL: ${PROD_URL}`)
  const dl = await fetch(PROD_URL + `?_t=${Date.now()}`, { cache: 'no-store' })
  if (!dl.ok) {
    console.error(`  fetch failed: ${dl.status}`)
    process.exit(1)
  }
  const buf = Buffer.from(await dl.arrayBuffer())
  const sha = crypto.createHash('sha256').update(buf).digest('hex')
  console.log(`  size: ${buf.length} bytes`)
  console.log(`  sha256: ${sha}`)
  console.log(`  phase-0 reference sha: ${PHASE_0_SHA256}`)
  if (sha === PHASE_0_SHA256) {
    console.log(`  ✓ MATCH — production fixture is byte-identical to Phase 0 download`)
  } else {
    console.error(`  ✗ MISMATCH — production fixture differs from Phase 0 download!`)
    console.error(`     (Note: this could be expected since cacheControl was updated on this file`)
    console.error(`      via supabase.storage.update() in scripts/listening-fix-2/11-cache-control-dryrun.cjs`)
    console.error(`      Audio bytes should match — full integrity check needed if SHA differs)`)
    process.exit(1)
  }
})().catch(e => { console.error('FATAL', e); process.exit(1) })
