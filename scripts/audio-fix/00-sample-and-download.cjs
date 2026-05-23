// Phase 0.2 + 0.3 — pick 9 audio files (8 random + 1 known-broken fixture)
// and download each to tmp/audio-diagnose/<id>.mp3.

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

const OUT_DIR = path.resolve(__dirname, '../../tmp/audio-diagnose')
const FIXTURE_ID = '2992edc4-d68d-4f16-99d1-ab7b7a2683c3'

;(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  // 1. Pull the fixture explicitly
  const { data: fix, error: fixErr } = await sb
    .from('curriculum_listening')
    .select('id, unit_id, audio_url, audio_type, audio_duration_seconds, created_at')
    .eq('id', FIXTURE_ID)
    .maybeSingle()
  if (fixErr || !fix) throw new Error(`fixture lookup failed: ${fixErr?.message}`)
  console.log('Fixture row:', fix.id, fix.audio_url)

  // 2. Pull all other rows, randomize, take 8
  const { data: all, error: allErr } = await sb
    .from('curriculum_listening')
    .select('id, unit_id, audio_url, audio_type, audio_duration_seconds, created_at')
    .not('audio_url', 'is', null)
    .neq('id', FIXTURE_ID)
  if (allErr) throw allErr

  // Stable shuffle with fixed seed for reproducibility
  const seed = 'AUDIO-REAL-ROOT-CAUSE-FIX-2026-05-23'
  const seeded = all.map(r => ({ r, k: require('crypto').createHash('sha256').update(seed + r.id).digest('hex') }))
                    .sort((a, b) => a.k.localeCompare(b.k))
                    .map(x => x.r)
  const sample = [fix, ...seeded.slice(0, 8)]

  console.log(`\nSample (${sample.length} files):`)
  for (const s of sample) console.log(`  ${s.id} (${s.audio_type || '?'}, ${s.audio_duration_seconds || '?'}s, ${s.created_at?.slice(0,10)})`)

  // 3. Download each
  console.log('\nDownloading...')
  const downloads = []
  for (const row of sample) {
    const out = path.join(OUT_DIR, `${row.id}.mp3`)
    if (fs.existsSync(out)) {
      const size = fs.statSync(out).size
      if (size > 0) {
        console.log(`  ${row.id}: already on disk (${size} bytes)`)
        downloads.push({ id: row.id, path: out, url: row.audio_url, size, dbDuration: row.audio_duration_seconds, audioType: row.audio_type })
        continue
      }
    }
    const res = await fetch(row.audio_url + `?_t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) {
      console.log(`  ${row.id}: HTTP ${res.status}, skipping`)
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    fs.writeFileSync(out, buf)
    console.log(`  ${row.id}: ${buf.length} bytes`)
    downloads.push({ id: row.id, path: out, url: row.audio_url, size: buf.length, dbDuration: row.audio_duration_seconds, audioType: row.audio_type })
  }

  fs.writeFileSync(path.join(OUT_DIR, '_sample.json'), JSON.stringify(downloads, null, 2))
  console.log(`\nManifest: ${path.join(OUT_DIR, '_sample.json')}`)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
