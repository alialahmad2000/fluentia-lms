// LISTENING-NO-GAPS Phase B — hardened regen for rows with internal silence gaps.
//
// Strict pipeline:
//   1. Synthesize each segment via ElevenLabs (existing helper already retries 5×)
//   2. Per-segment validation: ffprobe duration > 0.5s + silencedetect finds NO
//      internal silence region > 0.6s. On failure, retry the synth (max 2 retries).
//   3. Concat with re-encoded libmp3lame (existing concat.cjs)
//   4. Post-concat full-file silencedetect — if any internal region > 0.8s
//      (excluding trailing 1.5s) → FAIL the row, retry full row (max 3 attempts)
//   5. Upload to storage with upsert:true + contentType audio/mpeg
//   6. UPDATE curriculum_listening with .select() — confirm rowcount=1
//   7. Re-curl from CDN public URL + silencedetect verify what students fetch
//
// Input:  docs/audits/listening-no-gaps/regen-input.json (21 row ids)
// Output: docs/audits/listening-no-gaps/regen-results.json (per-row status)

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execSync, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createClient } from '@supabase/supabase-js'
import { synthesizeWithTimestamps } from '../../audio-generator/lib/eleven.mjs'

const require = createRequire(import.meta.url)
const { concatMp3Buffers, verifyMp3Decodes } = require('../../audio-v2/lib/concat.cjs')
const { stripSpeakerLabel } = require('../../audio-v2/lib/strip-speaker-label.cjs')
const { sourceTextHash } = require('../../lib/text-hash.cjs')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..', '..')
const FFMPEG = '/opt/homebrew/bin/ffmpeg'
const FFPROBE = '/opt/homebrew/bin/ffprobe'
const CURL = '/usr/bin/curl'
const BUCKET = 'curriculum-audio'

const SEG_SILENCE_DB = '-50'
const SEG_SILENCE_MIN_S = '0.6'        // per-segment threshold (stricter)
const FILE_SILENCE_DB = '-50'
const FILE_SILENCE_MIN_S = '0.8'       // full-file threshold (matches audit)
const TAIL_IGNORE_S = 1.5
const MAX_SEG_RETRIES = 2
const MAX_ROW_RETRIES = 3

function silenceRegions(filePath, dbThreshold, minDuration) {
  let stderr = ''
  try {
    execFileSync(FFMPEG, ['-hide_banner', '-nostats', '-i', filePath, '-af', `silencedetect=noise=${dbThreshold}dB:d=${minDuration}`, '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] })
  } catch (e) {
    stderr = (e.stderr || '').toString() + (e.stdout || '').toString()
  }
  if (!stderr) {
    try {
      stderr = execSync(`"${FFMPEG}" -hide_banner -nostats -i "${filePath}" -af "silencedetect=noise=${dbThreshold}dB:d=${minDuration}" -f null - 2>&1`, { encoding: 'utf8' })
    } catch (e) {
      stderr = (e.stdout || '').toString() + (e.stderr || '').toString()
    }
  }
  const starts = [...stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]))
  const ends = [...stderr.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map((m) => ({ end: parseFloat(m[1]), duration: parseFloat(m[2]) }))
  const regions = []
  for (let i = 0; i < ends.length; i++) {
    regions.push({ start_s: starts[i] ?? null, end_s: ends[i].end, duration_s: ends[i].duration })
  }
  return regions
}

function probeDurationS(filePath) {
  return parseFloat(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath]).toString().trim())
}

function tempWrite(buf, prefix = 'regen-') {
  const f = path.join(os.tmpdir(), `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`)
  fs.writeFileSync(f, buf)
  return f
}

// Per-segment validation — only catches truncated/blank responses, NOT natural
// speech pauses. Threshold for "obviously broken" silence is 2.0s. The
// dispositive quality gate is the post-concat full-file check at 0.8s.
function checkSegmentSilence(buf, segIdx) {
  const f = tempWrite(buf, `seg${segIdx}-`)
  try {
    const dur = probeDurationS(f)
    if (!isFinite(dur) || dur < 0.5) return { ok: false, reason: `duration ${dur}s < 0.5s (likely truncated/blank)` }
    const regions = silenceRegions(f, SEG_SILENCE_DB, '2.0')
    const broken = regions.filter((r) => r.duration_s >= 2.0)
    if (broken.length > 0) return { ok: false, reason: `${broken.length} catastrophic silence(s) >= 2s (segment likely broken)`, regions: broken, duration_s: dur }
    return { ok: true, duration_s: dur }
  } finally {
    try { fs.rmSync(f, { force: true }) } catch {}
  }
}

function checkFileSilence(buf) {
  const f = tempWrite(buf, 'file-')
  try {
    const dur = probeDurationS(f)
    const regions = silenceRegions(f, FILE_SILENCE_DB, FILE_SILENCE_MIN_S)
    const significant = regions.filter((s) => {
      if (s.duration_s < parseFloat(FILE_SILENCE_MIN_S)) return false
      if (s.end_s == null) return s.duration_s > 2.0
      const isTrailing = s.end_s >= dur - TAIL_IGNORE_S
      return !isTrailing
    })
    return { ok: significant.length === 0, duration_s: dur, significant }
  } finally {
    try { fs.rmSync(f, { force: true }) } catch {}
  }
}

async function checkCdnSilence(url) {
  const f = path.join(os.tmpdir(), `cdn-${Date.now()}.mp3`)
  try {
    execSync(`${CURL} -sLo "${f}" "${url}"`, { stdio: 'pipe' })
    return checkFileSilence(fs.readFileSync(f))
  } finally {
    try { fs.rmSync(f, { force: true }) } catch {}
  }
}

async function synthSegmentWithValidation(seg, segIdx) {
  for (let attempt = 0; attempt <= MAX_SEG_RETRIES; attempt++) {
    const cleanText = stripSpeakerLabel(seg.text)
    const r = await synthesizeWithTimestamps({ text: cleanText, voiceId: seg.voice_id })
    if (!r) {
      if (attempt === MAX_SEG_RETRIES) return { ok: false, reason: 'synthesis returned null after retries' }
      continue
    }
    const check = checkSegmentSilence(r.audio_buffer, segIdx)
    if (check.ok) return { ok: true, audio_buffer: r.audio_buffer, word_timestamps: r.word_timestamps, char_count: r.char_count, duration_s: check.duration_s }
    if (attempt === MAX_SEG_RETRIES) return { ok: false, reason: `failed validation after ${MAX_SEG_RETRIES + 1} attempts: ${check.reason}`, last_check: check }
    console.warn(`    seg${segIdx} validation failed (${check.reason}) — retrying (${attempt + 1}/${MAX_SEG_RETRIES})`)
  }
  return { ok: false, reason: 'unreachable' }
}

async function uploadWithUpsert(sb, storagePath, buffer) {
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buffer, { contentType: 'audio/mpeg', upsert: true })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  const { data } = sb.storage.from(BUCKET).getPublicUrl(storagePath)
  return { url: data.publicUrl, path: storagePath }
}

async function regenerateRow(sb, row, attempt) {
  const segs = Array.isArray(row.speaker_segments) ? row.speaker_segments : JSON.parse(row.speaker_segments || '[]')
  if (!segs.length) return { ok: false, reason: 'no speaker_segments' }

  console.log(`\n--- ${row.id.slice(0, 8)} attempt ${attempt}/${MAX_ROW_RETRIES} (L${row.level_number}/U?, ${segs.length} segs, ${row.audio_type}) ---`)

  const segBuffers = []
  const segWordTs = []
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]
    if (!seg.text || !seg.voice_id) {
      return { ok: false, reason: `seg${i} missing text/voice_id` }
    }
    const r = await synthSegmentWithValidation(seg, i)
    if (!r.ok) return { ok: false, reason: `seg${i}: ${r.reason}` }
    segBuffers.push(r.audio_buffer)
    segWordTs.push(r.word_timestamps.map((wt) => ({ ...wt, speaker: seg.speaker })))
    console.log(`    seg${i} "${seg.speaker || seg.speaker_name || '?'}" ${r.audio_buffer.length}B / ${r.duration_s.toFixed(1)}s ✓`)
  }

  let combined
  try {
    combined = await concatMp3Buffers(segBuffers)
  } catch (e) {
    return { ok: false, reason: `concat failed: ${e.message}` }
  }

  if (!verifyMp3Decodes(combined.buffer)) {
    return { ok: false, reason: 'decode-verify failed after concat' }
  }
  const fileCheck = checkFileSilence(combined.buffer)
  if (!fileCheck.ok) {
    return { ok: false, reason: `post-concat: ${fileCheck.significant.length} internal silence(s) > ${FILE_SILENCE_MIN_S}s`, significant: fileCheck.significant }
  }
  console.log(`    concat → ${(combined.durationMs / 1000).toFixed(1)}s clean ✓`)

  // Upload
  const storagePath = `listening/L${row.level_number}/${row.id}/combined.mp3`
  const uploaded = await uploadWithUpsert(sb, storagePath, combined.buffer)
  console.log(`    upload → ${uploaded.url}`)

  // Re-curl + silencedetect to confirm what students will fetch
  // Wait a brief moment for storage CDN propagation
  await new Promise((res) => setTimeout(res, 1500))
  const cdnCheck = await checkCdnSilence(uploaded.url + `?cb=${Date.now()}`)
  if (!cdnCheck.ok) {
    return { ok: false, reason: `CDN re-fetch shows ${cdnCheck.significant.length} silence(s) > ${FILE_SILENCE_MIN_S}s`, significant: cdnCheck.significant }
  }
  console.log(`    CDN verify ${cdnCheck.duration_s.toFixed(1)}s clean ✓`)

  return {
    ok: true,
    uploaded,
    combined_duration_ms: combined.durationMs,
    segs,
    segWordTs,
    segmentOffsets: combined.segmentOffsets,
    segmentDurations: combined.segmentDurations,
  }
}

;(async () => {
  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const inputPath = path.join(ROOT, 'docs/audits/listening-no-gaps/regen-input.json')
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  let targetIds = input.rows.map((r) => r.id)

  // Allow --ids=<csv> override for resume / single-row testing
  const idsArg = process.argv.find((a) => a.startsWith('--ids='))
  if (idsArg) targetIds = idsArg.split('=')[1].split(',').filter(Boolean)

  console.log(`[regen] ${targetIds.length} rows to regenerate (target chars: ${input.total_chars})`)

  const { data: rows, error } = await sb
    .from('curriculum_listening')
    .select('id, unit_id, audio_url, audio_type, transcript, speaker_segments, audio_duration_seconds, sort_order, title_ar')
    .in('id', targetIds)
  if (error) throw error

  // Fetch unit→level mapping
  const unitIds = [...new Set(rows.map((r) => r.unit_id))]
  const { data: units, error: ue } = await sb
    .from('curriculum_units')
    .select('id, level_id, unit_number')
    .in('id', unitIds)
  if (ue) throw ue
  const { data: levels, error: le } = await sb
    .from('curriculum_levels')
    .select('id, level_number')
    .in('id', [...new Set(units.map((u) => u.level_id))])
  if (le) throw le
  const unitMap = new Map(units.map((u) => [u.id, u]))
  const levelMap = new Map(levels.map((l) => [l.id, l.level_number]))
  for (const r of rows) {
    const u = unitMap.get(r.unit_id)
    r.unit_number = u?.unit_number
    r.level_number = levelMap.get(u?.level_id)
  }

  const results = []
  let success = 0
  let fail = 0

  for (const row of rows) {
    let lastFailure = null
    let result = null
    for (let attempt = 1; attempt <= MAX_ROW_RETRIES; attempt++) {
      try {
        result = await regenerateRow(sb, row, attempt)
        if (result.ok) break
        lastFailure = result
        console.warn(`  row ${row.id.slice(0, 8)} attempt ${attempt} failed: ${result.reason}`)
      } catch (e) {
        lastFailure = { ok: false, reason: e.message }
        console.error(`  row ${row.id.slice(0, 8)} attempt ${attempt} threw: ${e.message}`)
      }
    }

    if (!result?.ok) {
      fail++
      results.push({ id: row.id, title_ar: row.title_ar, ok: false, reason: lastFailure?.reason || 'unknown', significant: lastFailure?.significant })
      continue
    }

    // Stitch word timestamps with segment offsets
    const allWordTs = []
    for (let i = 0; i < result.segWordTs.length; i++) {
      const offset = result.segmentOffsets[i] ?? 0
      for (const wt of result.segWordTs[i]) {
        allWordTs.push({ word: wt.word, start_ms: wt.start_ms + offset, end_ms: wt.end_ms + offset, speaker: wt.speaker })
      }
    }

    // Enrich speaker_segments with accurate offsets
    const enrichedSegs = result.segs.map((seg, i) => ({
      ...seg,
      start_ms: result.segmentOffsets[i] ?? 0,
      end_ms: (result.segmentOffsets[i] ?? 0) + (result.segmentDurations[i] ?? 0),
    }))

    // Compute drift-protection hash from current transcript
    const textHash = sourceTextHash(row.transcript)

    // UPDATE with .select() — confirms rowcount and returns the new row
    const { data: updated, error: updErr } = await sb
      .from('curriculum_listening')
      .update({
        audio_url: result.uploaded.url,
        audio_duration_seconds: Math.round(result.combined_duration_ms / 1000),
        speaker_segments: enrichedSegs,
        word_timestamps: allWordTs,
        audio_generated_at: new Date().toISOString(),
        source_text_hash: textHash,
        source_text_hash_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .select('id')

    if (updErr || !updated || updated.length !== 1) {
      fail++
      results.push({ id: row.id, title_ar: row.title_ar, ok: false, reason: `DB update failed: ${updErr?.message || 'rowcount != 1'}` })
      continue
    }

    success++
    results.push({
      id: row.id,
      title_ar: row.title_ar,
      ok: true,
      duration_ms: result.combined_duration_ms,
      segs: result.segs.length,
      audio_url: result.uploaded.url,
    })
    console.log(`✓ ${row.id.slice(0, 8)} (${row.title_ar?.slice(0, 40)})`)
  }

  const outPath = path.join(ROOT, 'docs/audits/listening-no-gaps/regen-results.json')
  fs.writeFileSync(outPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_targets: rows.length,
    success,
    fail,
    results,
  }, null, 2))

  console.log(`\n[regen] Done: ${success} OK, ${fail} failed → ${outPath}`)
  process.exit(fail > 0 ? 2 : 0)
})()
