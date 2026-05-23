// Phase 1.3 follow-up — answer Ali's three questions before batching:
//
// Q1: classify all 72 listening MP3s as single-speaker vs multi-speaker
// Q2: pull audio_event_log rows to learn WHICH file students actually hit
//     when the failure was observed
// Q3: pick 3 multi-speaker files for re-probe (next script)

const { createClient } = require('@supabase/supabase-js')
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

;(async () => {
  // ── Q1 ─────────────────────────────────────────────────────
  console.log('=== Q1: audio_type distribution across 72 listening rows ===\n')
  const { data: cl, error: e1 } = await sb
    .from('curriculum_listening')
    .select('id, unit_id, audio_url, audio_type, audio_duration_seconds, title_ar, created_at')
    .not('audio_url', 'is', null)
  if (e1) throw e1

  const byType = {}
  for (const r of cl) byType[r.audio_type || '<null>'] = (byType[r.audio_type || '<null>'] || 0) + 1
  for (const k of Object.keys(byType).sort()) console.log(`  ${k.padEnd(15)} ${byType[k]}`)

  // Multi-speaker = dialogue OR interview. Single-speaker = monologue OR lecture.
  const multi = cl.filter(r => ['dialogue', 'interview'].includes(r.audio_type))
  const single = cl.filter(r => ['monologue', 'lecture'].includes(r.audio_type))
  console.log(`\n  multi-speaker total: ${multi.length}  (dialogue + interview)`)
  console.log(`  single-speaker total: ${single.length}  (monologue + lecture)`)

  // Cross-check via listening_audio (per-segment table). A "true" multi-speaker
  // file should have >1 distinct speaker_label across its segments.
  console.log('\n--- cross-check via listening_audio.speaker_label ---')
  const { data: la } = await sb
    .from('listening_audio')
    .select('transcript_id, segment_index, speaker_label, audio_url')
  const speakerSetByTranscript = {}
  for (const row of (la || [])) {
    speakerSetByTranscript[row.transcript_id] = speakerSetByTranscript[row.transcript_id] || new Set()
    if (row.speaker_label) speakerSetByTranscript[row.transcript_id].add(row.speaker_label)
  }
  const speakerCountDist = {}
  for (const [tid, set] of Object.entries(speakerSetByTranscript)) {
    const k = set.size
    speakerCountDist[k] = (speakerCountDist[k] || 0) + 1
  }
  console.log('  distinct-speaker-label count per listening row:')
  for (const k of Object.keys(speakerCountDist).sort((a, b) => +a - +b)) {
    console.log(`    ${k} speaker(s): ${speakerCountDist[k]} rows`)
  }

  // ── Q2 ─────────────────────────────────────────────────────
  console.log('\n\n=== Q2: audio_event_log — which files have actually failed in production? ===\n')
  const { data: evlog, error: e2 } = await sb
    .from('audio_event_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (e2) {
    console.log('  audio_event_log error:', e2.message)
  } else {
    // Cluster by player_id prefix (listening: or reading:) and by URL
    const listenEvents = (evlog || []).filter(r => (r.player_id || '').startsWith('listening:') || (r.audio_url || '').includes('/listening/'))
    console.log(`  total events: ${evlog?.length}`)
    console.log(`  listening events: ${listenEvents.length}`)
    if (listenEvents.length) {
      // Group by audio_url
      const byUrl = {}
      for (const r of listenEvents) {
        const u = r.audio_url || '<no-url>'
        if (!byUrl[u]) byUrl[u] = { count: 0, events: [], reasons: new Set() }
        byUrl[u].count++
        byUrl[u].events.push(r.event)
        if (r.reason) byUrl[u].reasons.add(r.reason)
      }
      console.log(`\n  unique listening URLs in failure log:`)
      for (const [url, info] of Object.entries(byUrl)) {
        const id = url.match(/\/listening\/L\d+\/([a-f0-9-]+)\//)?.[1] || '?'
        const matchingRow = cl.find(r => r.audio_url === url)
        const type = matchingRow?.audio_type || '?'
        console.log(`    ${id.slice(0,8)}  type=${type.padEnd(10)} events=${info.count}  reasons=${[...info.reasons].join('|') || '<none>'}`)
        console.log(`      ${url}`)
      }
    }

    // Show what events we have in the log (event/reason histogram)
    console.log('\n  event/reason histogram (all rows):')
    const hist = {}
    for (const r of (evlog || [])) {
      const k = `${r.event || '?'} / ${r.reason || '<none>'}`
      hist[k] = (hist[k] || 0) + 1
    }
    for (const [k, n] of Object.entries(hist).sort((a, b) => b[1] - a[1])) console.log(`    ${n}  ${k}`)
  }

  // ── Q3 ─────────────────────────────────────────────────────
  console.log('\n\n=== Q3: pick 3 multi-speaker files for re-probe ===\n')
  // Spread across audio_type values (1 dialogue, 1 interview) + 1 long
  const dialogues = multi.filter(r => r.audio_type === 'dialogue')
  const interviews = multi.filter(r => r.audio_type === 'interview')
  // Deterministic shuffle by hashing id
  const sortBy = (arr) => arr.slice().sort((a, b) =>
    require('crypto').createHash('sha256').update('multi-2026-05-23' + a.id).digest('hex')
      .localeCompare(require('crypto').createHash('sha256').update('multi-2026-05-23' + b.id).digest('hex'))
  )
  const picks = []
  if (dialogues.length) picks.push(sortBy(dialogues)[0])
  if (interviews.length) {
    const sorted = sortBy(interviews)
    picks.push(sorted[0])
    if (sorted.length > 1) picks.push(sorted[1])  // 2 interviews + 1 dialogue
  }
  // If we don't have 3 yet, pad from multi
  while (picks.length < 3 && multi.length > picks.length) {
    const next = sortBy(multi).find(r => !picks.find(p => p.id === r.id))
    if (next) picks.push(next); else break
  }

  console.log('  selected 3 multi-speaker files:')
  for (const p of picks) {
    const speakers = speakerSetByTranscript[p.id]
    console.log(`    ${p.id} (${p.audio_type}, ${p.audio_duration_seconds}s, ${speakers ? speakers.size : '?'} speakers)`)
    console.log(`      ${p.audio_url}`)
  }

  // Write picks to a manifest so 04-probe-multispeaker.cjs can pick them up
  fs.writeFileSync(
    path.resolve(__dirname, '../../tmp/audio-diagnose/_multispeaker-picks.json'),
    JSON.stringify(picks, null, 2)
  )
  console.log('\n  manifest: tmp/audio-diagnose/_multispeaker-picks.json')
})().catch(e => { console.error('FATAL', e); process.exit(1) })
