// Phase 2.1 — Full audit of ALL 72 listening files.
//
// Frame-audit every row in curriculum_listening with audio_url. Save canonical
// list of broken files (any frame with channels != mode) to
// docs/audits/listening-channel-audit-full.json.

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
const TMP = path.resolve(__dirname, '../../tmp/audio-diagnose')
fs.mkdirSync(TMP, { recursive: true })

function frameAudit(file) {
  const stdout = execFileSync('ffprobe',
    ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'frame=channels', '-of', 'json', file],
    { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }
  )
  const frames = (JSON.parse(stdout).frames || [])
  const counter = {}
  for (const f of frames) counter[f.channels] = (counter[f.channels] || 0) + 1
  return { total: frames.length, counter }
}

;(async () => {
  const { data: rows, error } = await sb.from('curriculum_listening')
    .select('id, unit_id, audio_url, audio_type')
    .not('audio_url', 'is', null)
    .order('id')
  if (error) throw error
  console.log(`Auditing ${rows.length} listening rows...`)

  const findings = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const local = path.join(TMP, `${row.id}.mp3`)
    if (!fs.existsSync(local) || fs.statSync(local).size === 0) {
      try {
        const res = await fetch(row.audio_url + `?_t=${Date.now()}`, { cache: 'no-store' })
        fs.writeFileSync(local, Buffer.from(await res.arrayBuffer()))
      } catch (e) {
        console.error(`  [${i+1}/${rows.length}] ${row.id.slice(0,8)} DOWNLOAD_FAILED ${e.message}`)
        findings.push({ ...row, download_failed: true, error: e.message })
        continue
      }
    }
    let audit
    try {
      audit = frameAudit(local)
    } catch (e) {
      console.error(`  [${i+1}/${rows.length}] ${row.id.slice(0,8)} PROBE_FAILED ${e.message}`)
      findings.push({ ...row, probe_failed: true, error: e.message })
      continue
    }
    const uniqueCh = Object.keys(audit.counter).length
    const stereo = audit.counter['2'] || 0
    const mono = audit.counter['1'] || 0
    const broken = uniqueCh > 1
    if (broken) {
      console.log(`  [${i+1}/${rows.length}] ${row.id.slice(0,8)} ⚠ broken (mono=${mono} stereo=${stereo} total=${audit.total})`)
    } else {
      console.log(`  [${i+1}/${rows.length}] ${row.id.slice(0,8)} ok (${Object.keys(audit.counter)[0]}ch, ${audit.total} frames)`)
    }
    findings.push({
      id: row.id,
      unit_id: row.unit_id,
      audio_type: row.audio_type,
      audio_url: row.audio_url,
      total_frames: audit.total,
      channel_counts: audit.counter,
      midstream_change: broken,
      stereo_frame_count: stereo,
      mono_frame_count: mono,
    })
  }

  const broken = findings.filter(f => f.midstream_change)
  const clean = findings.filter(f => !f.midstream_change && !f.probe_failed && !f.download_failed)
  console.log(`\n========================`)
  console.log(`TOTAL: ${findings.length}`)
  console.log(`BROKEN (midstream change): ${broken.length}`)
  console.log(`CLEAN: ${clean.length}`)
  console.log(`FAILED probes/downloads: ${findings.length - broken.length - clean.length}`)

  const out = {
    audit_date: new Date().toISOString().slice(0, 10),
    total: findings.length,
    broken: broken.length,
    clean: clean.length,
    findings,
  }
  const outPath = path.resolve(__dirname, '../../docs/audits/listening-channel-audit-full.json')
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(`\nWrote ${outPath}`)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
