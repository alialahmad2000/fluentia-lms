// Validate that single-speaker files DON'T have the midstream channel issue.
// Re-uses already-downloaded files in tmp/audio-diagnose.

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
  const { data } = await sb.from('curriculum_listening')
    .select('id, audio_url, audio_type')
    .in('audio_type', ['monologue', 'lecture'])
    .not('audio_url', 'is', null)
  console.log(`Single-speaker files (monologue + lecture): ${data.length}`)

  const findings = []
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const local = path.join(OUT_DIR, `${row.id}.mp3`)
    if (!fs.existsSync(local) || fs.statSync(local).size === 0) {
      const res = await fetch(row.audio_url + `?_t=${Date.now()}`, { cache: 'no-store' })
      const buf = Buffer.from(await res.arrayBuffer())
      fs.writeFileSync(local, buf)
    }
    process.stdout.write(`[${i+1}/${data.length}] ${row.id.slice(0,8)} (${row.audio_type})... `)
    const audit = chAudit(local)
    const uniqueChannels = Object.keys(audit).filter(k => k !== 'total')
    if (uniqueChannels.length > 1) {
      console.log(`⚠ MIDSTREAM: ${JSON.stringify(audit)}`)
      findings.push({ ...row, midstream: true, audit })
    } else {
      console.log(`ok (channels=${uniqueChannels[0]}, ${audit.total} frames)`)
      findings.push({ ...row, midstream: false, audit })
    }
  }

  const broken = findings.filter(f => f.midstream)
  console.log(`\n========================`)
  console.log(`Single-speaker files with midstream change: ${broken.length}/${findings.length}`)
  if (broken.length) {
    for (const b of broken) console.log(`  ${b.id} (${b.audio_type}): ${JSON.stringify(b.audit)}`)
  }
  fs.writeFileSync(path.join(OUT_DIR, '_single-speaker-frame-audit.json'), JSON.stringify(findings, null, 2))
  console.log(`Wrote tmp/audio-diagnose/_single-speaker-frame-audit.json`)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
