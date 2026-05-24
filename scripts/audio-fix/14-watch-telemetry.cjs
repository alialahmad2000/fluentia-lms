// Phase 5.4 — 4-hour production telemetry watch.
//
// Polls audio_telemetry + audio_event_log every 5 minutes for new error rows
// inserted after the start time. Prints each new error row. Exits with
// status 1 if any new error row appears from a real student (profile_id /
// student_id not NULL). Exits 0 (clean) after 4 hours.
//
// Usage:
//   node scripts/audio-fix/14-watch-telemetry.cjs            # default 4h watch
//   WATCH_MINUTES=10 node scripts/audio-fix/14-watch-telemetry.cjs  # short test

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

const WATCH_MINUTES = parseInt(process.env.WATCH_MINUTES || '240', 10)  // default 4 hours
const POLL_INTERVAL_MS = 5 * 60 * 1000                                  // 5 min
const OUT_PATH = path.resolve(__dirname, '../../docs/audits/phase5-telemetry-watch.json')

;(async () => {
  const startedAt = new Date()
  const watchUntil = new Date(startedAt.getTime() + WATCH_MINUTES * 60 * 1000)
  console.log(`Watching audio_telemetry + audio_event_log starting ${startedAt.toISOString()}`)
  console.log(`Will exit at ${watchUntil.toISOString()} (${WATCH_MINUTES} minutes)`)
  console.log(`Polling every ${POLL_INTERVAL_MS / 60000} min`)

  const newErrors = []
  let lastCheck = startedAt.toISOString()
  let realStudentErrorCount = 0

  while (Date.now() < watchUntil.getTime()) {
    // Pull new error rows from audio_telemetry
    const { data: telemetryRows, error: tErr } = await sb
      .from('audio_telemetry')
      .select('id, occurred_at, profile_id, context, audio_url, error_code, error_message, browser_ua')
      .gt('occurred_at', lastCheck)
      .order('occurred_at', { ascending: false })
      .limit(100)
    if (tErr) console.error(`audio_telemetry query error: ${tErr.message}`)
    for (const r of telemetryRows || []) {
      newErrors.push({ table: 'audio_telemetry', ...r })
      if (r.profile_id) {
        realStudentErrorCount++
        console.log(`[REAL STUDENT ERROR] ${r.occurred_at} ${r.context} code=${r.error_code} ${r.error_message?.slice(0, 100)} url=${r.audio_url}`)
      } else {
        console.log(`  (anon) ${r.occurred_at} ${r.context} code=${r.error_code}`)
      }
    }

    // Pull new rows from audio_event_log with error states/reasons
    const { data: eventRows, error: eErr } = await sb
      .from('audio_event_log')
      .select('id, created_at, student_id, audio_url, event, reason, state, user_agent')
      .gt('created_at', lastCheck)
      .in('event', ['error', 'play_rejected', 'preload_failed', 'stalled', 'aborted'])
      .order('created_at', { ascending: false })
      .limit(100)
    if (eErr) console.error(`audio_event_log query error: ${eErr.message}`)
    for (const r of eventRows || []) {
      newErrors.push({ table: 'audio_event_log', ...r })
      if (r.student_id) {
        realStudentErrorCount++
        console.log(`[REAL STUDENT EVENT] ${r.created_at} ${r.event} reason=${r.reason} url=${r.audio_url}`)
      } else {
        console.log(`  (anon) ${r.created_at} ${r.event} reason=${r.reason}`)
      }
    }
    lastCheck = new Date().toISOString()
    const elapsedMin = ((Date.now() - startedAt.getTime()) / 60000).toFixed(1)
    console.log(`  [${elapsedMin}min elapsed] ${newErrors.length} total errors collected (${realStudentErrorCount} from real students)`)
    fs.writeFileSync(OUT_PATH, JSON.stringify({
      started_at: startedAt.toISOString(),
      watch_until: watchUntil.toISOString(),
      poll_interval_min: POLL_INTERVAL_MS / 60000,
      total_errors: newErrors.length,
      real_student_errors: realStudentErrorCount,
      rows: newErrors,
    }, null, 2))
    if (Date.now() + POLL_INTERVAL_MS >= watchUntil.getTime()) break
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }

  const result = {
    started_at: startedAt.toISOString(),
    ended_at: new Date().toISOString(),
    watch_minutes: WATCH_MINUTES,
    total_errors: newErrors.length,
    real_student_errors: realStudentErrorCount,
    rows: newErrors,
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2))
  console.log(`\nWatch complete. Wrote ${OUT_PATH}`)
  console.log(`Total errors: ${newErrors.length}, real-student errors: ${realStudentErrorCount}`)
  process.exit(realStudentErrorCount > 0 ? 1 : 0)
})().catch(e => { console.error('FATAL', e); process.exit(2) })
