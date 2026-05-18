// Browser-style stream test for every listening audio.
// 1. HEAD request — confirm 200, Content-Type, Accept-Ranges, Content-Length
// 2. Range 0-65535 — confirm 206
// 3. Range <len-65536>-<len-1> — confirm 206
// 4. Full GET — write to /tmp/listening-qa/<id>.mp3
// 5. ffprobe — container duration
// 6. Decode-test with ffmpeg — parse time= from stderr
// 7. truncation_ratio = decoded / container
// 8. Verdict: OK | TRUNCATED | NO_RANGE | WRONG_MIME | FETCH_FAIL

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const INVENTORY = JSON.parse(fs.readFileSync('docs/audits/listening-qa/inventory.json', 'utf8'))
const TMP = '/tmp/listening-qa'
fs.mkdirSync(TMP, { recursive: true })

async function headReq(url) {
  const r = await fetch(url, { method: 'HEAD', redirect: 'follow' })
  return {
    status: r.status,
    content_type: r.headers.get('content-type'),
    accept_ranges: r.headers.get('accept-ranges'),
    content_length: parseInt(r.headers.get('content-length') || '0', 10),
  }
}

async function rangeReq(url, range) {
  const r = await fetch(url, { method: 'GET', headers: { Range: `bytes=${range}` }, redirect: 'follow' })
  // drain body
  if (r.body) await r.arrayBuffer().catch(() => {})
  return r.status
}

async function fullDownload(url, outPath) {
  const r = await fetch(url, { redirect: 'follow' })
  if (!r.ok) throw new Error(`fetch ${r.status}`)
  const buf = Buffer.from(await r.arrayBuffer())
  fs.writeFileSync(outPath, buf)
  return buf.length
}

function ffprobeDuration(file) {
  const r = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ], { encoding: 'utf8' })
  const v = parseFloat((r.stdout || '').trim())
  return isFinite(v) ? v : null
}

function ffmpegDecodeTime(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-stats', '-i', file, '-f', 'null', '-'], { encoding: 'utf8' })
  // ffmpeg reports progress on stderr. Last "time=HH:MM:SS.MS" wins
  const out = (r.stderr || '') + (r.stdout || '')
  let last = null
  const re = /time=(\d+):(\d+):(\d+\.\d+)/g
  let m
  while ((m = re.exec(out)) != null) last = m
  if (!last) return null
  const h = parseInt(last[1], 10), mn = parseInt(last[2], 10), s = parseFloat(last[3])
  return h * 3600 + mn * 60 + s
}

;(async () => {
  const results = []
  for (let i = 0; i < INVENTORY.length; i++) {
    const row = INVENTORY[i]
    const id = row.id
    const url = row.audio_url
    const out = path.join(TMP, `${id}.mp3`)
    process.stdout.write(`[${i + 1}/${INVENTORY.length}] ${id.slice(0, 8)} ${row.title_ar?.slice(0, 30) || '-'}… `)

    const r = { id, title_ar: row.title_ar, audio_type: row.audio_type }
    try {
      const h = await headReq(url)
      r.head_status = h.status
      r.content_type = h.content_type
      r.accept_ranges = h.accept_ranges
      r.content_length = h.content_length

      if (h.status !== 200) {
        r.verdict = 'FETCH_FAIL'
        process.stdout.write(`FETCH_FAIL\n`)
        results.push(r)
        continue
      }
      if (h.content_type !== 'audio/mpeg') {
        r.verdict = 'WRONG_MIME'
      }

      // Range checks
      r.range_first_64k_status = await rangeReq(url, '0-65535')
      const lastStart = Math.max(0, h.content_length - 65536)
      const lastEnd = h.content_length - 1
      r.range_last_64k_status = await rangeReq(url, `${lastStart}-${lastEnd}`)
      const noRange = r.range_first_64k_status !== 206 || r.range_last_64k_status !== 206
      if (noRange) r.verdict = r.verdict || 'NO_RANGE'

      // Full download
      r.bytes_downloaded = await fullDownload(url, out)

      // Container duration
      r.container_duration_s = ffprobeDuration(out)
      r.decoded_duration_s = ffmpegDecodeTime(out)
      if (r.container_duration_s && r.decoded_duration_s) {
        r.truncation_ratio = Math.round((r.decoded_duration_s / r.container_duration_s) * 10000) / 10000
        if (r.truncation_ratio < 0.95) r.verdict = r.verdict || 'TRUNCATED'
      }

      r.verdict = r.verdict || 'OK'
      process.stdout.write(`${r.verdict} container=${r.container_duration_s}s decoded=${r.decoded_duration_s}s ratio=${r.truncation_ratio}\n`)
    } catch (e) {
      r.verdict = 'FETCH_FAIL'
      r.error = e.message
      process.stdout.write(`ERR ${e.message}\n`)
    }
    results.push(r)
    // Cleanup tmp file to avoid filling disk on long runs
    try { fs.unlinkSync(out) } catch {}
  }

  fs.writeFileSync('docs/audits/listening-qa/stream-test.json', JSON.stringify(results, null, 2))

  // Summary
  const byVerdict = {}
  for (const r of results) byVerdict[r.verdict] = (byVerdict[r.verdict] || 0) + 1
  console.log('\nVerdict summary:', JSON.stringify(byVerdict))
  console.log(`Wrote docs/audits/listening-qa/stream-test.json (${results.length} rows)`)
})()
