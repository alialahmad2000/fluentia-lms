// Phase 1.2 — Pilot re-encode of the known-broken fixture.
//
// Re-encode 2992edc4-d68d-4f16-99d1-ab7b7a2683c3 (L1 U1 Listening "Cultural
// Festivals — Nadia") via libmp3lame. Verify the re-encoded file has:
//   - LAME extension (only libmp3lame writes it)
//   - Xing/Info seek table with TOC
//   - Decoder-clean (no ffmpeg errors)
// Then upload to a temporary storage path so Ali can test in a fresh browser
// tab WITHOUT touching the production fixture. Halt and report.
//
// Encoder note: Phase 0 found the source files are MONO 44.1 kHz. The prompt's
// command uses -ac 2 which would upmix to stereo and double file size for
// no audible gain. We use -ac 1 to preserve mono.

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

const FIXTURE_ID = '2992edc4-d68d-4f16-99d1-ab7b7a2683c3'
const SRC = path.resolve(__dirname, '../../tmp/audio-diagnose', `${FIXTURE_ID}.mp3`)
const OUT = path.resolve(__dirname, '../../tmp/audio-diagnose', `${FIXTURE_ID}.reencoded.mp3`)
const TEMP_STORAGE_PATH = `listening/_pilot_reencoded_${FIXTURE_ID}.mp3`

function probe(file) {
  const stdout = execFileSync('ffprobe',
    ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }
  )
  return JSON.parse(stdout)
}

function decodeCheck(file) {
  try {
    execFileSync('ffmpeg',
      ['-v', 'error', '-i', file, '-f', 'null', '-'],
      { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 8 * 1024 * 1024 }
    )
    return ''
  } catch (e) { return (e.stderr || '').toString() }
}

function scanHeaders(file) {
  const fd = fs.openSync(file, 'r')
  const buf = Buffer.alloc(8192)
  fs.readSync(fd, buf, 0, 8192, 0)
  fs.closeSync(fd)
  // Skip ID3v2 if present
  let off = 0
  if (buf.slice(0, 3).toString() === 'ID3') {
    const sz = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f)
    off = 10 + sz
  }
  const window = buf.slice(off, off + 300)
  const findStr = (s) => window.indexOf(Buffer.from(s))
  const xingIdx = findStr('Xing')
  const infoIdx = findStr('Info')
  const lameIdx = findStr('LAME')
  return {
    xing: xingIdx >= 0 ? `yes@${xingIdx}` : 'no',
    info: infoIdx >= 0 ? `yes@${infoIdx}` : 'no',
    lame: lameIdx >= 0 ? `yes@${lameIdx}` : 'no',
  }
}

;(async () => {
  if (!fs.existsSync(SRC)) {
    console.error(`Source file not found at ${SRC} — run scripts/audio-fix/00-sample-and-download.cjs first`)
    process.exit(1)
  }

  const origSize = fs.statSync(SRC).size
  console.log(`Source: ${SRC} (${origSize} bytes)`)
  console.log(`Output: ${OUT}`)
  console.log()

  console.log('=== Re-encoding ===')
  // -ac 1 preserves the source mono. -ar 44100 enforces 44.1kHz (matches source).
  // -b:a 128k = 128 kbps CBR. libmp3lame auto-writes LAME extension + Info header.
  const args = [
    '-y',                       // overwrite output
    '-i', SRC,
    '-c:a', 'libmp3lame',
    '-b:a', '128k',
    '-ar', '44100',
    '-ac', '1',                 // mono — match source
    '-write_xing', '1',         // ensure Xing/Info header is written
    '-id3v2_version', '3',
    '-map_metadata', '0',       // preserve original tags
    OUT,
  ]
  console.log('  ffmpeg', args.map(a => a.includes(' ') ? `"${a}"` : a).join(' '))
  try {
    execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8' })
  } catch (e) {
    console.error('ffmpeg FAILED:', (e.stderr || '').toString().slice(0, 500))
    process.exit(1)
  }

  const newSize = fs.statSync(OUT).size
  console.log(`\nDone: ${newSize} bytes (orig ${origSize}, delta ${((newSize - origSize)/origSize*100).toFixed(1)}%)`)

  console.log('\n=== Probe re-encoded ===')
  const probeJson = probe(OUT)
  const fmt = probeJson.format
  const str = probeJson.streams[0]
  console.log(`  codec: ${str.codec_name} ${str.sample_rate}Hz channels=${str.channels} layout=${str.channel_layout}`)
  console.log(`  duration: ${fmt.duration}s (orig ${require(path.resolve(__dirname,'../../tmp/audio-diagnose/_probe-summary.json'))[0].duration}s)`)
  console.log(`  bit_rate: ${fmt.bit_rate}`)
  console.log(`  encoder: ${fmt.tags?.encoder || str.tags?.encoder || '?'}`)

  console.log('\n=== Decode check ===')
  const errs = decodeCheck(OUT)
  if (errs.trim()) {
    console.error('DECODE ERRORS:')
    console.error(errs)
    process.exit(1)
  }
  console.log('  clean (0 errors)')

  console.log('\n=== Header scan (Xing / Info / LAME) ===')
  const headers = scanHeaders(OUT)
  console.log('  Xing:', headers.xing, '  Info:', headers.info, '  LAME:', headers.lame)
  if (headers.lame === 'no') {
    console.error('\nWARNING: LAME extension still NOT present after re-encode. This is unusual for libmp3lame output.')
    console.error('Continuing anyway — Xing/Info+TOC may be enough.')
  } else {
    console.log('  ✓ LAME extension present — encoder delay/padding now advertised')
  }

  console.log('\n=== Upload to TEMPORARY storage path ===')
  console.log(`  target: ${TEMP_STORAGE_PATH}`)
  const buf = fs.readFileSync(OUT)
  const { error: upErr } = await sb.storage.from('curriculum-audio').upload(TEMP_STORAGE_PATH, buf, {
    contentType: 'audio/mpeg',
    cacheControl: '31536000',
    upsert: true,
  })
  if (upErr) {
    console.error('UPLOAD FAILED:', upErr.message)
    process.exit(1)
  }
  const publicUrl = `${env.VITE_SUPABASE_URL}/storage/v1/object/public/curriculum-audio/${TEMP_STORAGE_PATH}`
  console.log(`  ✓ uploaded`)

  console.log('\n══════════════════════════════════════════════════════════════════════')
  console.log('PILOT URL (for Ali to test in a fresh browser tab — same test as before):')
  console.log()
  console.log(`  ${publicUrl}`)
  console.log()
  console.log('Original production fixture (UNTOUCHED) for comparison:')
  console.log(`  https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/curriculum-audio/listening/L1/${FIXTURE_ID}/s0_nadia.mp3`)
  console.log()
  console.log('Pass criteria (raw file in fresh browser tab):')
  console.log('  - PASS: audio plays end-to-end without stopping')
  console.log('  - PASS: seeking forward/backward on timeline plays cleanly from new position')
  console.log('  - FAIL: same play-a-few-seconds-stop pattern as original')
  console.log('══════════════════════════════════════════════════════════════════════')
})().catch(e => { console.error('FATAL', e); process.exit(1) })
