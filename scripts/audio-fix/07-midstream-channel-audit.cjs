// Phase 0.5 follow-up — hunt for the "Channels: 2 vs 1" midstream config
// change that audio_telemetry caught Chromium choking on.
//
// Audit ALL 44 multi-speaker (dialogue + interview) production files for
// per-frame channel-count inconsistency.
//
// Method: stream each file through ffmpeg, ask it to print PER-PACKET metadata
// via `-show_packets` (or use `ffmpeg -v info -i ... -f null -` and parse the
// stream change warnings — that's how Chromium notices the issue too).

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

const OUT_DIR = path.resolve(__dirname, '../../tmp/audio-diagnose')
fs.mkdirSync(OUT_DIR, { recursive: true })

// Audit a file: walk frame-by-frame via ffprobe -show_frames in JSON mode,
// count unique (sample_rate, channels) combinations. >1 = midstream change.
// JSON output is reliable; CSV column order has been a footgun.
function frameAudit(file) {
  const stdout = execFileSync('ffprobe',
    ['-v', 'error', '-select_streams', 'a:0',
     '-show_entries', 'frame=sample_rate,channels',
     '-of', 'json', file],
    { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }
  )
  const parsed = JSON.parse(stdout)
  const frames = parsed.frames || []
  const combos = new Map()
  for (let idx = 0; idx < frames.length; idx++) {
    const f = frames[idx]
    const key = `${f.sample_rate}Hz/${f.channels}ch`
    if (!combos.has(key)) combos.set(key, { count: 0, firstIdx: idx, lastIdx: idx })
    const e = combos.get(key)
    e.count++
    e.lastIdx = idx
  }
  return { total: frames.length, combos: Object.fromEntries(combos) }
}

;(async () => {
  // Pull all 44 multi-speaker rows
  const { data: cl, error } = await sb
    .from('curriculum_listening')
    .select('id, unit_id, audio_url, audio_type')
    .in('audio_type', ['dialogue', 'interview'])
    .not('audio_url', 'is', null)
  if (error) throw error
  console.log(`Multi-speaker files to audit: ${cl.length}`)

  // Add the specific telemetry-flagged file in case it's already in the list
  const FAILED_ID = '896ab711-ea14-47bc-9e36-f4d09931ffab'
  if (!cl.find(r => r.id === FAILED_ID)) {
    const { data: f } = await sb.from('curriculum_listening').select('id, unit_id, audio_url, audio_type')
      .eq('id', FAILED_ID).maybeSingle()
    if (f) cl.unshift(f)
  } else {
    const i = cl.findIndex(r => r.id === FAILED_ID)
    const [hit] = cl.splice(i, 1)
    cl.unshift(hit) // probe it first
  }

  const findings = []
  for (let i = 0; i < cl.length; i++) {
    const row = cl[i]
    const local = path.join(OUT_DIR, `${row.id}.mp3`)
    // Download if not cached
    if (!fs.existsSync(local) || fs.statSync(local).size === 0) {
      const res = await fetch(row.audio_url + `?_t=${Date.now()}`, { cache: 'no-store' })
      const buf = Buffer.from(await res.arrayBuffer())
      fs.writeFileSync(local, buf)
    }
    process.stdout.write(`[${i+1}/${cl.length}] ${row.id.slice(0,8)} (${row.audio_type})... `)
    const audit = frameAudit(local)
    const numCombos = Object.keys(audit.combos).length
    if (numCombos > 1) {
      console.log(`⚠ ${numCombos} combos: ${Object.keys(audit.combos).join(' + ')}`)
      findings.push({ ...row, ...audit, midstream_change: true })
    } else {
      const k = Object.keys(audit.combos)[0]
      console.log(`ok (${k}, ${audit.total} frames)`)
      findings.push({ ...row, ...audit, midstream_change: false })
    }
  }

  const broken = findings.filter(f => f.midstream_change)
  const clean = findings.filter(f => !f.midstream_change)
  console.log(`\n========================`)
  console.log(`MIDSTREAM CHANGE FOUND IN ${broken.length}/${findings.length} multi-speaker files.`)
  console.log(`Clean: ${clean.length}/${findings.length}`)
  if (broken.length) {
    console.log(`\nBroken files:`)
    for (const b of broken) {
      const combos = Object.entries(b.combos).map(([k, v]) => `${k}@frame${v.firstIdx}-${v.lastIdx}(${v.count})`).join(' + ')
      console.log(`  ${b.id.slice(0,8)} (${b.audio_type}): ${combos}`)
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, '_midstream-audit.json'), JSON.stringify(findings, null, 2))
  console.log(`\nWrote tmp/audio-diagnose/_midstream-audit.json`)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
