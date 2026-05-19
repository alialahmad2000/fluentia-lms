/**
 * Regenerate audio for the 22 reading rows whose audio narrates an older
 * version of the text. Built on the proven pattern from
 * scripts/audio-v2/regen-reading-truncated.mjs (May 18 — 13 truncated rows).
 *
 * Each row: full audio + per-paragraph audio + word_timestamps via ElevenLabs
 * with-timestamps API. Then upserts reading_passage_audio + updates
 * curriculum_readings mirror columns.
 *
 * Usage:
 *   node scripts/audits/audio-text-mismatch-fix/10-regen-drifted.mjs [--dry-run] [--limit N]
 */

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { query, closeDb } from '../../audio-generator/lib/db.mjs'
import { synthesizeWithTimestamps } from '../../audio-generator/lib/eleven.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..', '..')
const DRY_RUN = process.argv.includes('--dry-run')
const limitArg = process.argv.find(a => a.startsWith('--limit'))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] || process.argv[process.argv.indexOf('--limit') + 1]) : null

const drift = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'docs/audits/audio-text-mismatch-fix/text-vs-audio-drift.json'), 'utf8'))
const DRIFTED_IDS = drift.drifted_rows.map(r => r.reading_id)
console.log(`Drifted set: ${DRIFTED_IDS.length} ids`)

const ALICE = 'Xb7hH8MSUJpSbSDYk0k2'
const BUCKET = 'curriculum-audio'

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

function stripMarkdown(text) {
  return (text || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim()
}

async function upsertStorage(storagePath, buffer) {
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buffer, { contentType: 'audio/mpeg', upsert: true })
  if (error) throw new Error(`Upload ${storagePath}: ${error.message}`)
  return sb.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log(`\n=== Regen drifted reading audio ${DRY_RUN ? '[DRY RUN]' : ''} ===`)
  const ids = LIMIT ? DRIFTED_IDS.slice(0, LIMIT) : DRIFTED_IDS
  console.log(`Will process: ${ids.length}`)

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
  const rows = await query(`
    SELECT cr.id, cr.reading_label, cr.passage_word_count, cr.passage_content,
           l.level_number, u.unit_number,
           rpa.full_audio_path, rpa.paragraph_audio
    FROM curriculum_readings cr
    JOIN curriculum_units u ON u.id = cr.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    LEFT JOIN reading_passage_audio rpa ON rpa.passage_id = cr.id
    WHERE cr.id IN (${placeholders})
    ORDER BY l.level_number, u.unit_number, cr.reading_label
  `, ids)

  // sum chars budget
  let totalChars = 0
  for (const row of rows) {
    const paras = (row.passage_content?.paragraphs || []).map(p => stripMarkdown(p)).filter(Boolean)
    const fullText = paras.join(' ')
    // full + per-para
    totalChars += fullText.length + paras.reduce((s, p) => s + p.length, 0)
  }
  console.log(`Total chars to generate: ${totalChars} (budget allows ~1.16M remaining)`)

  if (DRY_RUN) { console.log(`Dry run only — exiting.`); await closeDb(); return }

  let success = 0, fail = 0
  const results = []

  for (const row of rows) {
    const paras = (row.passage_content?.paragraphs || []).map(p => stripMarkdown(p)).filter(Boolean)
    const fullText = paras.join(' ')
    const label = `L${row.level_number}/U${row.unit_number}/${row.reading_label}`
    console.log(`\n── ${label} (${row.id}) ──`)
    console.log(`  paragraphs=${paras.length} chars=${fullText.length}`)

    const fullPath = row.full_audio_path || `reading/L${row.level_number}/${row.id}/full.mp3`

    try {
      // 1. Full passage audio
      process.stdout.write(`  [1] full audio…`)
      const fullResult = await synthesizeWithTimestamps({ text: fullText, voiceId: ALICE })
      if (!fullResult) throw new Error('ElevenLabs returned null for full audio')
      const fullUrl = await upsertStorage(fullPath, fullResult.audio_buffer)
      const fullDurationMs = fullResult.word_timestamps.length > 0
        ? fullResult.word_timestamps[fullResult.word_timestamps.length - 1].end_ms
        : 0
      console.log(` ✓ ${Math.round(fullDurationMs / 1000)}s ${fullResult.word_timestamps.length} wts`)
      await sleep(1500)

      // 2. Per-paragraph audio
      const existingParaAudio = Array.isArray(row.paragraph_audio) ? row.paragraph_audio : []
      const newParaAudio = []
      const wordTimestampsByPara = []

      for (let i = 0; i < paras.length; i++) {
        const paraText = paras[i]
        const existingPath = existingParaAudio[i]?.audio_path
        const paraPath = existingPath || `reading/L${row.level_number}/${row.id}/para_${i}.mp3`
        process.stdout.write(`  [2.${i + 1}] para ${i + 1}/${paras.length}…`)
        const paraResult = await synthesizeWithTimestamps({ text: paraText, voiceId: ALICE })
        if (!paraResult) throw new Error(`para ${i} returned null`)
        const paraUrl = await upsertStorage(paraPath, paraResult.audio_buffer)
        const paraDurationMs = paraResult.word_timestamps.length > 0
          ? paraResult.word_timestamps[paraResult.word_timestamps.length - 1].end_ms
          : 0
        console.log(` ✓ ${Math.round(paraDurationMs / 1000)}s`)
        newParaAudio.push({
          paragraph_index: i,
          audio_url: paraUrl,
          audio_path: paraPath,
          duration_ms: paraDurationMs,
          text: paraText,
          char_count: paraText.length,
        })
        wordTimestampsByPara.push({ index: i, words: paraResult.word_timestamps })
        await sleep(1000)
      }

      // 3. Upsert reading_passage_audio
      const { error: upErr, data: upData } = await sb.from('reading_passage_audio').upsert({
        passage_id: row.id,
        full_audio_url: fullUrl,
        full_audio_path: fullPath,
        full_duration_ms: fullDurationMs,
        paragraph_audio: newParaAudio,
        word_timestamps: { all_words: fullResult.word_timestamps, paragraphs: wordTimestampsByPara },
        voice_id: 'alice',
        generated_at: new Date().toISOString(),
      }, { onConflict: 'passage_id' }).select()
      if (upErr) throw new Error(`db upsert: ${upErr.message}`)

      // 4. Update curriculum_readings mirror
      const { error: updErr, data: updData } = await sb.from('curriculum_readings').update({
        passage_audio_url: fullUrl,
        audio_duration_seconds: Math.round(fullDurationMs / 1000),
        audio_generated_at: new Date().toISOString(),
      }).eq('id', row.id).select()
      if (updErr) throw new Error(`db update curriculum_readings: ${updErr.message}`)

      console.log(`  ✓ done — ${Math.round(fullDurationMs / 1000)}s full, ${paras.length} paras`)
      results.push({ id: row.id, level: row.level_number, unit: row.unit_number, label: row.reading_label, duration_s: Math.round(fullDurationMs / 1000), wt_count: fullResult.word_timestamps.length })
      success++

    } catch (e) {
      console.error(`  ✗ FAILED: ${e.message}`)
      fail++
    }
  }

  const reportPath = path.join(ROOT, 'docs/audits/audio-text-mismatch-fix/regen-drifted-results.json')
  fs.writeFileSync(reportPath, JSON.stringify({ generated_at: new Date().toISOString(), success, fail, results }, null, 2))
  console.log(`\n=== ${success} succeeded, ${fail} failed ===`)
  console.log(`Report: ${reportPath}`)
  await closeDb()
}

main().catch(async e => { console.error('Fatal:', e); await closeDb(); process.exit(1) })
