// Phase 0.4 — ffprobe + ffmpeg decode-check on each sampled file.
//
// For each file, capture:
//   <file>.probe.json     — full format + stream metadata
//   <file>.decode-errors.txt — stderr of `ffmpeg -v error -i ... -f null -`
//
// Then synthesize a per-file summary row (codec, sample-rate, channels, duration,
// xing-header presence, decode error line count) for the report.

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.resolve(__dirname, '../../tmp/audio-diagnose')
const manifest = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '_sample.json'), 'utf8'))

function probe(filePath) {
  const stdout = execFileSync('ffprobe',
    ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', filePath],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  )
  return JSON.parse(stdout)
}

function decodeCheck(filePath) {
  // Decode to null, capture stderr. Returns the error string ('' = clean).
  try {
    execFileSync('ffmpeg',
      ['-v', 'error', '-i', filePath, '-f', 'null', '-'],
      { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'], maxBuffer: 8 * 1024 * 1024 }
    )
    return ''
  } catch (e) {
    return (e.stderr || '').toString()
  }
}

// Quick Xing/LAME header detector: scan first 4 KiB for "Xing", "Info", or "Lame"
function detectXing(filePath) {
  const fd = fs.openSync(filePath, 'r')
  const buf = Buffer.alloc(4096)
  fs.readSync(fd, buf, 0, 4096, 0)
  fs.closeSync(fd)
  const s = buf.toString('latin1')
  return {
    xing: s.includes('Xing'),
    info: s.includes('Info'),
    lame: s.includes('LAME'),
    // ID3v2 header signature
    id3v2: s.startsWith('ID3'),
  }
}

const rows = []
for (const f of manifest) {
  process.stdout.write(`probing ${f.id}... `)
  const probeJson = probe(f.path)
  const errs = decodeCheck(f.path)
  const xingScan = detectXing(f.path)

  fs.writeFileSync(`${f.path}.probe.json`, JSON.stringify(probeJson, null, 2))
  fs.writeFileSync(`${f.path}.decode-errors.txt`, errs)

  const format = probeJson.format || {}
  const stream = (probeJson.streams || [])[0] || {}

  const decodeErrLines = errs.trim() ? errs.trim().split('\n').length : 0
  const errSample = errs.trim() ? errs.trim().split('\n').slice(0, 3).join(' | ') : ''

  const summary = {
    id: f.id,
    audio_type: f.audioType,
    db_duration: f.dbDuration,
    size: f.size,
    format_name: format.format_name,
    duration: format.duration ? Number(format.duration).toFixed(3) : null,
    bit_rate: format.bit_rate,
    codec: stream.codec_name,
    sample_rate: stream.sample_rate,
    channels: stream.channels,
    channel_layout: stream.channel_layout,
    tags_encoder: (format.tags?.encoder || stream.tags?.encoder) || null,
    id3v2: xingScan.id3v2,
    xing: xingScan.xing,
    info: xingScan.info,
    lame: xingScan.lame,
    decode_err_lines: decodeErrLines,
    decode_err_sample: errSample,
  }
  rows.push(summary)
  console.log(`ok (${summary.codec} ${summary.sample_rate}Hz ch=${summary.channels} dur=${summary.duration}s Xing=${summary.xing} decode-errs=${decodeErrLines})`)
}

fs.writeFileSync(path.join(OUT_DIR, '_probe-summary.json'), JSON.stringify(rows, null, 2))
console.log('\nWrote', path.join(OUT_DIR, '_probe-summary.json'))

// Print a flat summary table
console.log('\n=== PROBE SUMMARY ===')
console.log('ID                  codec  Hz       ch  Xing  Info  LAME  duration   db_dur  decode_errs')
for (const r of rows) {
  console.log(`${r.id.slice(0,8)}            ${r.codec.padEnd(5)} ${String(r.sample_rate).padEnd(8)} ${String(r.channels).padEnd(2)}  ${(r.xing?'YES':'no ')}  ${(r.info?'YES':'no ')}  ${(r.lame?'YES':'no ')}  ${(r.duration||'?').padEnd(9)}  ${String(r.db_duration||'?').padEnd(6)}  ${r.decode_err_lines}`)
}
