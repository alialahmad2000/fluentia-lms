#!/usr/bin/env node
// LISTENING-NO-GAPS Phase A — internal-silence audit.
// For every listening row, download the audio, run ffmpeg silencedetect, and
// flag any internal silence region >= 0.8s (excluding the trailing 1.5s which
// is normal pad). Writes docs/audits/listening-no-gaps/silence-audit.json.

const fs = require('fs')
const path = require('path')
const { execSync, execFileSync } = require('child_process')
const { createClient } = require('@supabase/supabase-js')

const FFMPEG = '/opt/homebrew/bin/ffmpeg'
const FFPROBE = '/opt/homebrew/bin/ffprobe'
const CURL = '/usr/bin/curl'

const SILENCE_THRESHOLD_DB = -50
const SILENCE_MIN_DURATION_S = 0.8
const TAIL_IGNORE_S = 1.5
const TMP_DIR = '/tmp/listening-silence-audit'

function loadEnv() {
  const env = {}
  fs.readFileSync(path.resolve(__dirname, '../../../.env'), 'utf8').split('\n').forEach((line) => {
    const idx = line.indexOf('=')
    if (idx <= 0) return
    let v = line.slice(idx + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    v = v.replace(/\\n$/, '')
    env[line.slice(0, idx).trim()] = v
  })
  return env
}

function parseSilenceLog(stderr) {
  const startRe = /silence_start: ([\d.]+)/g
  const endRe = /silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g
  const starts = [...stderr.matchAll(startRe)].map((m) => parseFloat(m[1]))
  const ends = [...stderr.matchAll(endRe)].map((m) => ({
    end: parseFloat(m[1]),
    duration: parseFloat(m[2]),
  }))
  const regions = []
  for (let i = 0; i < ends.length; i++) {
    regions.push({
      start_s: starts[i] ?? null,
      end_s: ends[i].end,
      duration_s: ends[i].duration,
    })
  }
  return regions
}

;(async () => {
  const env = loadEnv()
  const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  fs.mkdirSync(TMP_DIR, { recursive: true })
  fs.mkdirSync(path.resolve(__dirname, '../../../docs/audits/listening-no-gaps'), { recursive: true })

  const { data: rows, error } = await sb
    .from('curriculum_listening')
    .select('id, unit_id, audio_url, audio_duration_seconds, audio_type, title_ar, sort_order')
    .not('audio_url', 'is', null)
    .order('unit_id', { ascending: true })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('select failed:', error.message)
    process.exit(1)
  }

  console.log(`Auditing ${rows.length} listening rows for internal silence (threshold ${SILENCE_THRESHOLD_DB}dB, min ${SILENCE_MIN_DURATION_S}s)...`)

  const results = []
  let cleanCount = 0
  let gapCount = 0
  let errorCount = 0

  for (const row of rows) {
    const localPath = path.join(TMP_DIR, `${row.id}.mp3`)
    try {
      if (!fs.existsSync(localPath)) {
        execSync(`${CURL} -sLo "${localPath}" "${row.audio_url}"`, { stdio: 'pipe' })
      }
      const stat = fs.statSync(localPath)
      if (stat.size < 1024) throw new Error('downloaded file < 1KB')

      const containerDuration = parseFloat(
        execFileSync(FFPROBE, [
          '-v', 'error',
          '-show_entries', 'format=duration',
          '-of', 'default=noprint_wrappers=1:nokey=1',
          localPath,
        ]).toString().trim()
      )

      // silencedetect — ffmpeg writes to stderr; trap exit code so we always capture
      let stderr = ''
      try {
        execFileSync(
          FFMPEG,
          ['-hide_banner', '-nostats', '-i', localPath, '-af', `silencedetect=noise=${SILENCE_THRESHOLD_DB}dB:d=${SILENCE_MIN_DURATION_S}`, '-f', 'null', '-'],
          { stdio: ['ignore', 'ignore', 'pipe'] }
        )
      } catch (e) {
        stderr = (e.stderr || '').toString() + (e.stdout || '').toString()
      }
      // ffmpeg without an error code still writes silencedetect to stderr; the
      // execFileSync above will exit 0 with output on stderr. Try a second
      // capture using execSync if stderr is empty.
      if (!stderr) {
        try {
          const out = execSync(
            `"${FFMPEG}" -hide_banner -nostats -i "${localPath}" -af "silencedetect=noise=${SILENCE_THRESHOLD_DB}dB:d=${SILENCE_MIN_DURATION_S}" -f null - 2>&1`,
            { encoding: 'utf8' }
          )
          stderr = out
        } catch (e) {
          stderr = (e.stdout || '').toString() + (e.stderr || '').toString()
        }
      }

      const regions = parseSilenceLog(stderr)
      const significant = regions.filter((s) => {
        if (s.duration_s < SILENCE_MIN_DURATION_S) return false
        if (s.end_s == null) return s.duration_s > 2.0
        const isTrailing = s.end_s >= containerDuration - TAIL_IGNORE_S
        return !isTrailing
      })

      const verdict = significant.length === 0 ? 'CLEAN' : 'HAS_GAPS'
      if (verdict === 'CLEAN') cleanCount++
      else gapCount++

      results.push({
        id: row.id,
        title_ar: row.title_ar,
        unit_id: row.unit_id,
        audio_type: row.audio_type,
        audio_url: row.audio_url,
        container_duration_s: containerDuration,
        silence_regions: regions,
        significant_silence_regions: significant,
        verdict,
      })

      console.log(`${verdict === 'CLEAN' ? '✓' : '✗'} ${row.id} (${row.title_ar || row.audio_type}) — ${significant.length} significant silence(s)`)
    } catch (e) {
      errorCount++
      results.push({ id: row.id, title_ar: row.title_ar, verdict: 'AUDIT_ERROR', error: e.message })
      console.error(`✗ ${row.id} — audit error: ${e.message}`)
    }
  }

  const summary = {
    generated_at: new Date().toISOString(),
    total: results.length,
    clean: cleanCount,
    has_gaps: gapCount,
    audit_errors: errorCount,
    threshold_db: SILENCE_THRESHOLD_DB,
    min_duration_s: SILENCE_MIN_DURATION_S,
    tail_ignore_s: TAIL_IGNORE_S,
  }
  const outPath = path.resolve(__dirname, '../../../docs/audits/listening-no-gaps/silence-audit.json')
  fs.writeFileSync(outPath, JSON.stringify({ summary, rows: results }, null, 2))

  console.log('\n--- SUMMARY ---')
  console.log(JSON.stringify(summary, null, 2))
  console.log(`→ ${outPath}`)
})()
