// Pilot re-encode of the ACTUAL production-broken file (from audio_telemetry).
//
// Target: 896ab711-ea14-47bc-9e36-f4d09931ffab/combined.mp3
//   Chromium logged: "Unsupported midstream configuration change! Channels: 2 vs 1"
//
// Fix: force uniform mono (-ac 1) so every output frame has the same channel
// count. libmp3lame writes proper Xing/Info header. Upload to temp path; do
// NOT touch production fixture.

const { createClient } = require('@supabase/supabase-js')
const { execFileSync } = require('child_process')
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

const TARGET_ID = '896ab711-ea14-47bc-9e36-f4d09931ffab'
const SRC = path.resolve(__dirname, '../../tmp/audio-diagnose', `${TARGET_ID}.mp3`)
const OUT = path.resolve(__dirname, '../../tmp/audio-diagnose', `${TARGET_ID}.reencoded.mp3`)
const TEMP_PATH = `listening/_pilot_reencoded_${TARGET_ID}.mp3`

function chAudit(file) {
  const stdout = execFileSync('ffprobe',
    ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'frame=channels', '-of', 'json', file],
    { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }
  )
  const frames = (JSON.parse(stdout).frames || [])
  const counter = {}
  for (const f of frames) counter[f.channels] = (counter[f.channels] || 0) + 1
  return { total: frames.length, ...counter }
}

;(async () => {
  // Make sure we have the source
  if (!fs.existsSync(SRC)) {
    const { data: row } = await sb.from('curriculum_listening').select('audio_url').eq('id', TARGET_ID).maybeSingle()
    if (!row?.audio_url) throw new Error('row not found')
    const res = await fetch(row.audio_url + `?_t=${Date.now()}`, { cache: 'no-store' })
    fs.writeFileSync(SRC, Buffer.from(await res.arrayBuffer()))
  }
  console.log(`Source: ${SRC} (${fs.statSync(SRC).size} bytes)`)

  console.log('\n=== BEFORE: source frame audit ===')
  const before = chAudit(SRC)
  console.log(`  ${JSON.stringify(before)}`)
  const beforeUnique = Object.keys(before).filter(k => k !== 'total').length
  console.log(`  unique channel counts: ${beforeUnique}  ${beforeUnique > 1 ? '⚠ MIDSTREAM CHANGE' : 'uniform'}`)

  console.log('\n=== Re-encoding with -ac 1 (force mono) ===')
  const args = [
    '-y',
    '-i', SRC,
    '-c:a', 'libmp3lame',
    '-b:a', '128k',
    '-ar', '44100',
    '-ac', '1',                 // force MONO — eliminates midstream change
    '-write_xing', '1',
    '-id3v2_version', '3',
    '-map_metadata', '0',
    OUT,
  ]
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
  const newSize = fs.statSync(OUT).size
  console.log(`  ${newSize} bytes  (source ${fs.statSync(SRC).size}, delta ${((newSize - fs.statSync(SRC).size)/fs.statSync(SRC).size*100).toFixed(1)}%)`)

  console.log('\n=== AFTER: re-encoded frame audit ===')
  const after = chAudit(OUT)
  console.log(`  ${JSON.stringify(after)}`)
  const afterUnique = Object.keys(after).filter(k => k !== 'total').length
  console.log(`  unique channel counts: ${afterUnique}  ${afterUnique > 1 ? '⚠ STILL BROKEN' : '✓ uniform mono'}`)

  if (afterUnique > 1) {
    console.error('\nFAIL: re-encode did not produce uniform channel output. Halting before upload.')
    process.exit(1)
  }

  console.log('\n=== Decoder sanity (ffmpeg full decode) ===')
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-i', OUT, '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] })
    console.log('  clean (0 errors)')
  } catch (e) {
    console.error('DECODE ERRORS:', (e.stderr || '').toString())
    process.exit(1)
  }

  console.log('\n=== Upload to TEMPORARY storage path ===')
  console.log(`  ${TEMP_PATH}`)
  const buf = fs.readFileSync(OUT)
  const { error: upErr } = await sb.storage.from('curriculum-audio').upload(TEMP_PATH, buf, {
    contentType: 'audio/mpeg',
    cacheControl: '31536000',
    upsert: true,
  })
  if (upErr) { console.error(upErr.message); process.exit(1) }
  const url = `${env.VITE_SUPABASE_URL}/storage/v1/object/public/curriculum-audio/${TEMP_PATH}`

  console.log('\n══════════════════════════════════════════════════════════════════════')
  console.log('PILOT URL (for Ali\'s fresh-tab test):')
  console.log()
  console.log(`  ${url}`)
  console.log()
  console.log('ORIGINAL production file (untouched — should reproduce seek-stop on Chrome):')
  console.log(`  https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/curriculum-audio/listening/L2/${TARGET_ID}/combined.mp3`)
  console.log()
  console.log('Test plan:')
  console.log('  1. Open the ORIGINAL URL in a fresh tab. Press play. Try seeking.')
  console.log('     If you observe play-stop-seek-stop now → reproduces the bug.')
  console.log('     If it plays cleanly → either browser cache, or this file no longer fails.')
  console.log('  2. Open the PILOT URL in a fresh tab. Press play. Try seeking.')
  console.log('     PASS: plays end-to-end, seeking works smoothly.')
  console.log('     FAIL: same seek-stop pattern — re-encode didn\'t help.')
  console.log('══════════════════════════════════════════════════════════════════════')
})().catch(e => { console.error('FATAL', e); process.exit(1) })
