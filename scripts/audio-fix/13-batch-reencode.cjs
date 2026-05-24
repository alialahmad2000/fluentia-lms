// Phase 2.2 — Batch re-encode every broken listening file to uniform mono.
//
// Resume-capable (sentinel file per id), 200ms rate limit, sha256 + duration
// assertions. Reads docs/audits/listening-channel-audit-full.json — must run
// after 12-full-72-audit.cjs.

const { createClient } = require('@supabase/supabase-js')
const { execFileSync } = require('child_process')
const crypto = require('crypto')
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

const TMP = path.resolve(__dirname, '../../tmp/audio-batch')
fs.mkdirSync(TMP, { recursive: true })
const SENTINEL_DIR = path.resolve(__dirname, '../../tmp/audio-batch-sentinels')
fs.mkdirSync(SENTINEL_DIR, { recursive: true })
const AUDIT_PATH = path.resolve(__dirname, '../../docs/audits/listening-channel-audit-full.json')
const REPORT_PATH = path.resolve(__dirname, '../../docs/audits/listening-batch-report.json')

function sha256(file) {
  const h = crypto.createHash('sha256')
  h.update(fs.readFileSync(file))
  return h.digest('hex')
}

function frameAudit(file) {
  const stdout = execFileSync('ffprobe',
    ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'frame=channels', '-of', 'json', file],
    { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }
  )
  const frames = JSON.parse(stdout).frames || []
  const counter = {}
  for (const f of frames) counter[f.channels] = (counter[f.channels] || 0) + 1
  return { total: frames.length, counter }
}

function probeDuration(file) {
  const stdout = execFileSync('ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
    { encoding: 'utf8' }
  )
  return parseFloat(stdout.trim())
}

function urlToStoragePath(audioUrl) {
  // audio_url like: https://...storage/v1/object/public/curriculum-audio/listening/L1/<id>/combined.mp3
  const m = audioUrl.match(/\/storage\/v1\/object\/public\/curriculum-audio\/(.+)$/)
  if (!m) throw new Error(`Cannot derive storage path from ${audioUrl}`)
  return m[1]
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

;(async () => {
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error(`Run 12-full-72-audit.cjs first — missing ${AUDIT_PATH}`)
    process.exit(1)
  }
  const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, 'utf8'))
  const broken = audit.findings.filter(f => f.midstream_change)
  console.log(`Batch re-encoding ${broken.length} broken files...`)

  // Load existing report if resuming
  let report = { generated: new Date().toISOString(), entries: [], aggregate: {} }
  if (fs.existsSync(REPORT_PATH)) {
    report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'))
    if (!Array.isArray(report.entries)) report.entries = []
  }
  const doneIds = new Set(report.entries.filter(e => e.status === 'succeeded').map(e => e.id))

  let succeeded = 0, skipped = 0, failed = 0
  for (let i = 0; i < broken.length; i++) {
    const row = broken[i]
    const tag = `[${i + 1}/${broken.length}] ${row.id.slice(0, 8)}`
    const sentinel = path.join(SENTINEL_DIR, `${row.id}.done`)
    if (fs.existsSync(sentinel) && doneIds.has(row.id)) {
      console.log(`${tag} SKIP (sentinel)`)
      skipped++
      continue
    }
    try {
      const storagePath = urlToStoragePath(row.audio_url)
      const localOrig = path.join(TMP, `${row.id}.orig.mp3`)
      const localReenc = path.join(TMP, `${row.id}.reenc.mp3`)

      // Download fresh
      const res = await fetch(row.audio_url + `?_t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`download HTTP ${res.status}`)
      fs.writeFileSync(localOrig, Buffer.from(await res.arrayBuffer()))
      const origSha = sha256(localOrig)
      const origDuration = probeDuration(localOrig)
      const origFrameAudit = frameAudit(localOrig)

      // Re-encode
      execFileSync('ffmpeg', [
        '-y', '-i', localOrig,
        '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-ac', '1',
        '-write_xing', '1', '-id3v2_version', '3', '-map_metadata', '0',
        localReenc,
      ], { stdio: ['ignore', 'ignore', 'pipe'] })

      const newSha = sha256(localReenc)
      const newDuration = probeDuration(localReenc)
      const newFrameAudit = frameAudit(localReenc)
      const durDelta = ((newDuration - origDuration) / origDuration * 100)
      const uniqueCh = Object.keys(newFrameAudit.counter).length

      // Assertions
      if (uniqueCh !== 1) throw new Error(`output still has midstream change (counter=${JSON.stringify(newFrameAudit.counter)})`)
      if (!newFrameAudit.counter['1']) throw new Error(`output not mono (counter=${JSON.stringify(newFrameAudit.counter)})`)
      if (newFrameAudit.counter['1'] !== newFrameAudit.total) throw new Error('mono count != total frames')
      if (newFrameAudit.total === 0) throw new Error('zero frames in output')
      if (Math.abs(durDelta) > 2) throw new Error(`duration drift ${durDelta.toFixed(2)}% > 2%`)

      // Decode check
      try {
        execFileSync('ffmpeg', ['-v', 'error', '-i', localReenc, '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] })
      } catch (e) {
        throw new Error(`decode errors: ${(e.stderr || '').toString().slice(0, 300)}`)
      }

      // Upload (overwrite production)
      const buf = fs.readFileSync(localReenc)
      const { error: upErr } = await sb.storage.from('curriculum-audio').upload(storagePath, buf, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000',
        upsert: true,
      })
      if (upErr) throw new Error(`upload failed: ${upErr.message}`)

      const entry = {
        id: row.id,
        unit_id: row.unit_id,
        audio_type: row.audio_type,
        storage_path: storagePath,
        original_sha: origSha,
        new_sha: newSha,
        original_frames_stereo: row.stereo_frame_count,
        output_frames_total: newFrameAudit.total,
        original_duration_s: origDuration,
        new_duration_s: newDuration,
        duration_delta_pct: Number(durDelta.toFixed(4)),
        status: 'succeeded',
        ts: new Date().toISOString(),
      }
      report.entries.push(entry)
      // Persist sentinel + report after each success
      fs.writeFileSync(sentinel, entry.ts)
      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
      // Clean local files
      fs.unlinkSync(localOrig)
      fs.unlinkSync(localReenc)
      console.log(`${tag} ✓ stereo→mono, dur Δ=${durDelta.toFixed(2)}% ${storagePath}`)
      succeeded++
      await sleep(200)
    } catch (e) {
      const entry = { id: row.id, status: 'failed', error: e.message, ts: new Date().toISOString() }
      report.entries.push(entry)
      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
      console.error(`${tag} ✗ ${e.message}`)
      failed++
      // Halt entire batch
      console.error('\n🛑 HALT: failure encountered, stopping batch')
      report.aggregate = { succeeded, skipped, failed, total: broken.length, halted_at: row.id }
      fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
      process.exit(1)
    }
  }
  report.aggregate = { succeeded, skipped, failed, total: broken.length }
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
  console.log(`\nBATCH COMPLETE  succeeded=${succeeded} skipped=${skipped} failed=${failed}`)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
