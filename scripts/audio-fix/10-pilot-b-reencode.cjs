// Phase 1.1 — Pilot B re-encode (worst-case among 31 midstream-change files).
//
// Target: 7dc526f8-069e-4fae-b842-9af82a585a97 (interview)
//   - 247 stereo frames out of 10,083 total (2.4% — highest stereo-frame ratio
//     in the existing midstream audit).
//
// Same pipeline as 09 (force mono via -ac 1, libmp3lame, write_xing).
// Upload to listening/_pilot_reencoded_<id>.mp3. Production fixture untouched.

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

const TARGET_ID = '7dc526f8-069e-4fae-b842-9af82a585a97'
const SRC = path.resolve(__dirname, '../../tmp/audio-diagnose', `${TARGET_ID}.mp3`)
const OUT = path.resolve(__dirname, '../../tmp/audio-diagnose', `${TARGET_ID}.reencoded.mp3`)
const TEMP_PATH = `listening/_pilot_reencoded_${TARGET_ID}.mp3`

function frameAudit(file) {
  const stdout = execFileSync('ffprobe',
    ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'frame=channels', '-of', 'json', file],
    { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }
  )
  const frames = (JSON.parse(stdout).frames || [])
  const counter = {}
  for (const f of frames) counter[f.channels] = (counter[f.channels] || 0) + 1
  return { total: frames.length, ...counter }
}

function probeDuration(file) {
  const stdout = execFileSync('ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
    { encoding: 'utf8' }
  )
  return parseFloat(stdout.trim())
}

;(async () => {
  if (!fs.existsSync(SRC)) {
    console.log(`Downloading source for ${TARGET_ID}...`)
    const { data: row, error } = await sb.from('curriculum_listening').select('audio_url').eq('id', TARGET_ID).maybeSingle()
    if (error) throw error
    if (!row?.audio_url) throw new Error('row not found')
    const res = await fetch(row.audio_url + `?_t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`download HTTP ${res.status}`)
    fs.writeFileSync(SRC, Buffer.from(await res.arrayBuffer()))
  }
  console.log(`Source: ${SRC} (${fs.statSync(SRC).size} bytes)`)

  console.log('\n=== BEFORE: source frame audit ===')
  const before = frameAudit(SRC)
  console.log(`  ${JSON.stringify(before)}`)
  const beforeUnique = Object.keys(before).filter(k => k !== 'total').length
  console.log(`  unique channel counts: ${beforeUnique}  ${beforeUnique > 1 ? '⚠ MIDSTREAM CHANGE confirmed' : 'uniform (??)'}`)
  const beforeDuration = probeDuration(SRC)
  console.log(`  duration: ${beforeDuration.toFixed(2)}s`)

  console.log('\n=== Re-encoding with -ac 1 (force mono) ===')
  const args = [
    '-y',
    '-i', SRC,
    '-c:a', 'libmp3lame',
    '-b:a', '128k',
    '-ar', '44100',
    '-ac', '1',
    '-write_xing', '1',
    '-id3v2_version', '3',
    '-map_metadata', '0',
    OUT,
  ]
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] })
  const newSize = fs.statSync(OUT).size
  console.log(`  ${newSize} bytes  (delta ${((newSize - fs.statSync(SRC).size)/fs.statSync(SRC).size*100).toFixed(1)}%)`)

  console.log('\n=== AFTER: re-encoded frame audit ===')
  const after = frameAudit(OUT)
  console.log(`  ${JSON.stringify(after)}`)
  const afterUnique = Object.keys(after).filter(k => k !== 'total').length
  console.log(`  unique channel counts: ${afterUnique}  ${afterUnique === 1 ? '✓ uniform mono' : '⚠ STILL midstream'}`)
  const afterDuration = probeDuration(OUT)
  const durDelta = ((afterDuration - beforeDuration) / beforeDuration * 100)
  console.log(`  duration: ${afterDuration.toFixed(2)}s (delta ${durDelta.toFixed(2)}%)`)

  if (afterUnique !== 1) {
    console.error('\n🛑 HALT: re-encoded file still has midstream change')
    process.exit(1)
  }
  if (after['1'] !== after.total) {
    console.error('\n🛑 HALT: not every frame is mono')
    process.exit(1)
  }
  if (Math.abs(durDelta) > 2) {
    console.error('\n🛑 HALT: duration drift > 2%')
    process.exit(1)
  }

  console.log('\n=== Decode check (ffmpeg null sink) ===')
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-i', OUT, '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] })
    console.log('  ✓ clean (0 decoder errors)')
  } catch (e) {
    console.error('  DECODE ERRORS:', (e.stderr || '').toString().slice(0, 500))
    process.exit(1)
  }

  console.log('\n=== Upload to TEMPORARY storage path ===')
  console.log(`  target: ${TEMP_PATH}`)
  const buf = fs.readFileSync(OUT)
  const { error: upErr } = await sb.storage.from('curriculum-audio').upload(TEMP_PATH, buf, {
    contentType: 'audio/mpeg',
    cacheControl: '31536000',
    upsert: true,
  })
  if (upErr) {
    console.error('UPLOAD FAILED:', upErr.message)
    process.exit(1)
  }
  const publicUrl = `${env.VITE_SUPABASE_URL}/storage/v1/object/public/curriculum-audio/${TEMP_PATH}`
  console.log(`  ✓ uploaded`)
  console.log(`\nPilot B public URL:\n  ${publicUrl}`)

  // Also fetch original URL for the verifier
  const { data: origRow } = await sb.from('curriculum_listening').select('audio_url').eq('id', TARGET_ID).maybeSingle()
  console.log(`Pilot B original URL:\n  ${origRow.audio_url}`)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
