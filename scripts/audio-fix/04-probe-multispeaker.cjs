// Download + probe the 3 multi-speaker files picked in 03-multispeaker-discovery.
// Compare pathology profile vs the single-speaker fixture.

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.resolve(__dirname, '../../tmp/audio-diagnose')
const picks = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '_multispeaker-picks.json'), 'utf8'))

function probe(file) {
  const stdout = execFileSync('ffprobe',
    ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }
  )
  return JSON.parse(stdout)
}

function decodeCheck(file) {
  try {
    execFileSync('ffmpeg',
      ['-v', 'error', '-i', file, '-f', 'null', '-'],
      { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 16 * 1024 * 1024 }
    )
    return ''
  } catch (e) { return (e.stderr || '').toString() }
}

function scanHeaders(file) {
  const fd = fs.openSync(file, 'r')
  const buf = Buffer.alloc(8192)
  fs.readSync(fd, buf, 0, 8192, 0)
  fs.closeSync(fd)
  let off = 0
  if (buf.slice(0, 3).toString() === 'ID3') {
    const sz = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f)
    off = 10 + sz
  }
  const window = buf.slice(off, off + 400)
  const findStr = (s) => window.indexOf(Buffer.from(s))
  const xingIdx = findStr('Xing')
  const infoIdx = findStr('Info')
  const lameIdx = findStr('LAME')
  // After Xing/Info magic at offset X, the 120-byte block ends and LAME extension would be at X+120
  let lameVer = null
  const hdrIdx = xingIdx >= 0 ? xingIdx : infoIdx
  if (hdrIdx >= 0 && window.length >= hdrIdx + 130) {
    lameVer = window.slice(hdrIdx + 120, hdrIdx + 129).toString('latin1').trim()
  }
  return {
    xing: xingIdx >= 0 ? `yes@${xingIdx}` : 'no',
    info: infoIdx >= 0 ? `yes@${infoIdx}` : 'no',
    lame: lameIdx >= 0 ? `yes@${lameIdx}` : 'no',
    lameExtTag: lameVer,
  }
}

;(async () => {
  console.log('Downloading + probing 3 multi-speaker files:\n')
  const rows = []
  for (const p of picks) {
    const out = path.join(OUT_DIR, `${p.id}.mp3`)
    if (!fs.existsSync(out) || fs.statSync(out).size === 0) {
      console.log(`  Downloading ${p.id}...`)
      const res = await fetch(p.audio_url + `?_t=${Date.now()}`, { cache: 'no-store' })
      const buf = Buffer.from(await res.arrayBuffer())
      fs.writeFileSync(out, buf)
    }
    const size = fs.statSync(out).size
    const probeJson = probe(out)
    const errs = decodeCheck(out)
    const headers = scanHeaders(out)
    fs.writeFileSync(`${out}.probe.json`, JSON.stringify(probeJson, null, 2))
    fs.writeFileSync(`${out}.decode-errors.txt`, errs)
    const fmt = probeJson.format
    const str = probeJson.streams[0]
    rows.push({
      id: p.id, audio_type: p.audio_type, db_duration: p.audio_duration_seconds,
      size, probe_duration: Number(fmt.duration).toFixed(3),
      codec: str.codec_name, sample_rate: str.sample_rate, channels: str.channels,
      bit_rate: fmt.bit_rate, encoder: fmt.tags?.encoder || '?',
      decode_err_lines: errs.trim() ? errs.trim().split('\n').length : 0,
      decode_err_sample: errs.trim().split('\n').slice(0, 3).join(' | '),
      ...headers,
    })
  }

  console.log('=== Multi-speaker probe results ===')
  console.log()
  console.log('ID            type     codec  Hz       ch  bit_rate  duration   Xing/Info  LAME-ext   encoder        decode-errs')
  for (const r of rows) {
    const hdr = r.xing.startsWith('yes') ? `Xing@${r.xing.split('@')[1]}` : (r.info.startsWith('yes') ? `Info@${r.info.split('@')[1]}` : 'NONE')
    console.log(`${r.id.slice(0,8)}      ${r.audio_type.padEnd(8)} ${r.codec.padEnd(5)} ${String(r.sample_rate).padEnd(8)} ${String(r.channels).padEnd(2)}  ${String(r.bit_rate).padEnd(8)}  ${r.probe_duration.padEnd(9)}  ${hdr.padEnd(10)} ${(r.lameExtTag || '?').padEnd(10)} ${r.encoder.padEnd(15)} ${r.decode_err_lines}`)
    if (r.decode_err_sample) console.log(`    err sample: ${r.decode_err_sample}`)
  }

  // Compare with single-speaker probe summary from Phase 0
  console.log('\n=== Cross-check with Phase 0 single-speaker probe summary ===')
  const single = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '_probe-summary.json'), 'utf8'))
  const singleByType = {}
  for (const s of single) {
    singleByType[s.audio_type] = singleByType[s.audio_type] || []
    singleByType[s.audio_type].push(s)
  }
  for (const t of Object.keys(singleByType).sort()) {
    const arr = singleByType[t]
    const sample = arr[0]
    console.log(`  ${t}:`)
    console.log(`    ${arr.length} sampled, ${arr.filter(s => s.decode_err_lines > 0).length} with decode errors`)
    console.log(`    sample channels=${sample.channels} sample_rate=${sample.sample_rate} encoder=${sample.tags_encoder || '?'}`)
  }

  fs.writeFileSync(
    path.join(OUT_DIR, '_multispeaker-probe.json'),
    JSON.stringify(rows, null, 2)
  )
  console.log('\nWrote tmp/audio-diagnose/_multispeaker-probe.json')
})().catch(e => { console.error('FATAL', e); process.exit(1) })
