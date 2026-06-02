#!/usr/bin/env node
/**
 * LISTENING SAFARI FIX — normalize mixed-channel-mode MP3s to uniform mono.
 *
 * Root cause: concatenated combined.mp3 files contain a SINGLE mp3 stream whose
 * frames switch between mono and stereo (one block per concatenated speaker
 * segment). Chrome's decoder reconfigures channel layout mid-stream; WebKit/Safari
 * locks the layout from frame 1 and chokes on the differing frames → silent/stall.
 * Fix: re-encode the inconsistent files to uniform mono 44.1k CBR so there is one
 * channel config throughout. Consistent files are left untouched (no transcode loss).
 *
 *   node normalize-listening-audio.cjs           # SCAN only (no writes)
 *   node normalize-listening-audio.cjs --apply   # re-encode + re-upload fixes
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const APPLY = process.argv.includes('--apply')
const REF = 'nmjexpuycmqcxuxljier'
const ROWS = JSON.parse(fs.readFileSync('/tmp/listening_rows.json', 'utf8'))
const SECRET = (() => {
  const keys = JSON.parse(fs.readFileSync('/tmp/apikeys.json', 'utf8'))
  const k = keys.find((x) => x.type === 'secret' && /^sb_secret_/.test(x.api_key || x.secret_jwt || ''))
  return (k && (k.api_key || k.secret_jwt)) || null
})()

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lfix-'))

function probeChannels(file) {
  // distinct per-frame channel counts + sample rates
  const ch = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a',
    '-show_entries', 'frame=channels', '-of', 'csv=p=0', file], { encoding: 'utf8' })
  const sr = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a',
    '-show_entries', 'frame=sample_rate', '-of', 'csv=p=0', file], { encoding: 'utf8' })
  const chSet = new Set(ch.split('\n').map((s) => s.trim()).filter(Boolean))
  const srSet = new Set(sr.split('\n').map((s) => s.trim()).filter(Boolean))
  return { chSet: [...chSet], srSet: [...srSet] }
}

async function download(url, dest) {
  let lastErr
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'cb=' + Date.now())
      if (!r.ok) throw new Error('download HTTP ' + r.status)
      const buf = Buffer.from(await r.arrayBuffer())
      fs.writeFileSync(dest, buf)
      return buf.length
    } catch (e) {
      lastErr = e
      await new Promise((res) => setTimeout(res, 800))
    }
  }
  throw lastErr
}

function parseBucketPath(url) {
  const m = url.split('/object/public/')[1]
  if (!m) throw new Error('cannot parse storage path: ' + url)
  const i = m.indexOf('/')
  return { bucket: m.slice(0, i), objectPath: m.slice(i + 1) }
}

async function upload(bucket, objectPath, file) {
  const body = fs.readFileSync(file)
  const u = `https://${REF}.supabase.co/storage/v1/object/${bucket}/${objectPath}`
  const r = await fetch(u, {
    method: 'PUT', // PUT overwrites an existing object; POST errors on existing

    headers: {
      Authorization: `Bearer ${SECRET}`,
      apikey: SECRET,
      'Content-Type': 'audio/mpeg',
      'x-upsert': 'true',
      'cache-control': '3600',
    },
    body,
  })
  if (!r.ok) throw new Error('upload HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200))
}

;(async () => {
  // Only multi-speaker combined.mp3 files are concatenations at risk of mixed
  // channel modes; single-segment monologues (s0_*.mp3) are uniform by construction.
  const TARGETS = ROWS.filter((r) => /combined\.mp3(\?|$)/.test(r.audio_url))
  let consistent = 0, needFix = 0, fixed = 0, failed = 0
  const fixList = []
  const limit = 2
  let idx = 0
  async function worker() {
    while (idx < TARGETS.length) {
      const row = TARGETS[idx++]
      const n = idx
      const local = path.join(tmp, `a${n}.mp3`)
      try {
        await download(row.audio_url, local)
        const { chSet, srSet } = probeChannels(local)
        // NOTE: ffprobe does not emit per-frame sample_rate for these MP3s (srSet is
        // always empty), so uniformity is judged on CHANNEL MODE alone — which is the
        // actual Safari-killer. The re-encode forces -ar 44100 so sample rate is uniform.
        const uniform = chSet.length === 1 && chSet[0] === '1'
        const inconsistent = chSet.length > 1
        const tag = uniform ? 'OK-mono' : inconsistent ? 'MIXED' : `uniform-${chSet.join('/')}ch`
        const name = row.audio_url.split('/').slice(-2).join('/')
        if (uniform) { consistent++; }
        else if (inconsistent) {
          needFix++; fixList.push({ name, chSet, srSet })
          console.log(`  ${tag.padEnd(8)} ${name}  channels=[${chSet}] sr=[${srSet}]`)
          if (APPLY) {
            const out = path.join(tmp, `o${n}.mp3`)
            execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', local,
              '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k',
              '-map_metadata', '-1', out])
            const after = probeChannels(out)
            if (!(after.chSet.length === 1 && after.chSet[0] === '1'))
              throw new Error('re-encode still not uniform mono: ch=' + after.chSet)
            const { bucket, objectPath } = parseBucketPath(row.audio_url)
            await upload(bucket, objectPath, out)
            fixed++
            console.log(`    ✓ fixed + uploaded ${name}`)
          }
        } else {
          // uniform but stereo — plays fine in Safari (consistent); leave it.
          consistent++
        }
      } catch (e) {
        failed++
        console.log(`  FAIL ${row.audio_url.split('/').slice(-2).join('/')} — ${e.message}`)
      }
    }
  }
  console.log(`\n${APPLY ? 'APPLY' : 'SCAN'} — ${TARGETS.length} combined.mp3 files of ${ROWS.length} total (secret key: ${SECRET ? 'present' : 'MISSING'})\n`)
  await Promise.all(Array.from({ length: limit }, worker))
  console.log(`\n=== ${APPLY ? 'APPLY' : 'SCAN'} SUMMARY ===`)
  console.log(`consistent (left as-is): ${consistent}`)
  console.log(`inconsistent (need fix): ${needFix}`)
  if (APPLY) console.log(`fixed + re-uploaded:     ${fixed}`)
  console.log(`failed:                  ${failed}`)
  fs.rmSync(tmp, { recursive: true, force: true })
  process.exit(failed > 0 ? 1 : 0)
})()
