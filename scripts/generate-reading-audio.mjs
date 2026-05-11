/**
 * Phase 1A — Reading Passage Audio Generator
 *
 * Generates full passage audio + per-paragraph audio with word-level timestamps.
 * Uses ElevenLabs /with-timestamps endpoint.
 *
 * Usage:
 *   node scripts/generate-reading-audio.mjs --level 1 --dry-run
 *   node scripts/generate-reading-audio.mjs --level 1 [--resume] [--limit N]
 *   node scripts/generate-reading-audio.mjs --level 3 [--resume]
 *
 * Flags:
 *   --level N    Required. Process only level N (1 or 3 for Phase 1A)
 *   --dry-run    Show character counts, skip API calls
 *   --resume     Skip passages already in reading_passage_audio
 *   --limit N    Process at most N passages (for testing)
 */

import { createClient }   from '@supabase/supabase-js'
import pkg                 from 'pg'
import { readFileSync }    from 'fs'
import { join, dirname }   from 'path'
import { fileURLToPath }   from 'url'
import fetch               from 'node-fetch'

const { Client } = pkg
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function readEnv() {
  const env = {}
  readFileSync(join(ROOT, '.env'), 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m) env[m[1]] = m[2].trim()
  })
  return env
}
const ENV    = readEnv()
const db     = createClient(ENV['VITE_SUPABASE_URL'], ENV['SUPABASE_SERVICE_ROLE_KEY'])
const EL_KEY = ENV['ELEVENLABS_API_KEY']
const EL_BASE = 'https://api.elevenlabs.io/v1'
const ALICE  = 'Xb7hH8MSUJpSbSDYk0k2'
const BUCKET = 'curriculum-audio'

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2)
const DRY_RUN  = args.includes('--dry-run')
const RESUME   = args.includes('--resume')
const levelArg = args.find(a => a.startsWith('--level'))
const limitArg = args.find(a => a.startsWith('--limit'))
const LEVEL    = levelArg ? parseInt(levelArg.split(/[= ]/)[1] || args[args.indexOf('--level') + 1]) : null
const LIMIT    = limitArg ? parseInt(limitArg.split(/[= ]/)[1] || args[args.indexOf('--limit') + 1]) : null

if (LEVEL === null) {
  console.error('Usage: node generate-reading-audio.mjs --level <1|3> [--dry-run] [--resume] [--limit N]')
  process.exit(1)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

/** Strip *word* markdown asterisks for clean TTS text */
function stripMarkdown(text) {
  return (text || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim()
}

/** Parse character-level alignment → word-level timestamps */
function charAlignmentToWords(characters, startTimes, endTimes) {
  const words = []
  let wordChars = []
  let wordStart = null

  for (let i = 0; i < characters.length; i++) {
    const ch = characters[i]
    const isSpace = /\s/.test(ch)

    if (!isSpace) {
      if (wordStart === null) wordStart = startTimes[i] * 1000
      wordChars.push(ch)
    } else {
      if (wordChars.length > 0) {
        words.push({
          word:     wordChars.join(''),
          start_ms: Math.round(wordStart),
          end_ms:   Math.round(endTimes[i - 1] * 1000),
        })
        wordChars = []
        wordStart = null
      }
    }
  }
  // Last word (no trailing space)
  if (wordChars.length > 0) {
    words.push({
      word:     wordChars.join(''),
      start_ms: Math.round(wordStart),
      end_ms:   Math.round(endTimes[endTimes.length - 1] * 1000),
    })
  }
  return words
}

/** Call ElevenLabs with-timestamps, retry on 429 */
async function elabsTTS(text, attempt = 0) {
  const url = `${EL_BASE}/text-to-speech/${ALICE}/with-timestamps`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': EL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
    }),
  })

  if (res.status === 429) {
    const delay = Math.min(1000 * Math.pow(2, attempt), 64000)
    console.warn(`  ⏳ Rate-limited. Waiting ${delay / 1000}s...`)
    await sleep(delay)
    return elabsTTS(text, attempt + 1)
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`ElevenLabs ${res.status}: ${err.slice(0, 200)}`)
  }

  return res.json()  // { audio_base64, alignment: {characters, character_start_times_seconds, character_end_times_seconds} }
}

/** Upload buffer to Supabase Storage, return public URL */
async function upload(buffer, path) {
  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType: 'audio/mpeg',
    upsert: true,
  })
  if (error) throw new Error(`Upload failed ${path}: ${error.message}`)
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== Reading Audio Generator — L${LEVEL} ${DRY_RUN ? '[DRY RUN]' : RESUME ? '[RESUME]' : '[FULL]'} ===\n`)

  const pg = new Client({
    host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432,
    database: 'postgres', user: 'postgres.nmjexpuycmqcxuxljier',
    password: 'Ali-al-ahmad2000', ssl: { rejectUnauthorized: false },
  })
  await pg.connect()

  // Load passages
  const resumeJoin = RESUME
    ? 'LEFT JOIN reading_passage_audio rpa ON rpa.passage_id = r.id'
    : ''
  const resumeWhere = RESUME ? 'AND rpa.passage_id IS NULL' : ''
  const limitClause = LIMIT ? `LIMIT ${LIMIT}` : ''

  const { rows: passages } = await pg.query(`
    SELECT r.id, r.reading_label, r.passage_word_count,
           r.passage_content->'paragraphs' AS paragraphs,
           l.level_number, u.unit_number
    FROM curriculum_readings r
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    ${resumeJoin}
    WHERE l.level_number = $1 ${resumeWhere}
    ORDER BY u.unit_number, r.reading_label
    ${limitClause}
  `, [LEVEL])
  await pg.end()

  // Character count projection
  let totalChars = 0
  for (const p of passages) {
    const paras = (p.paragraphs || []).map(stripMarkdown)
    const fullText = paras.join(' ')
    totalChars += fullText.length
    // Per-paragraph calls
    totalChars += paras.reduce((s, t) => s + t.length, 0)
  }

  console.log(`Passages to process:  ${passages.length} (L${LEVEL}, ${RESUME ? 'resume mode' : 'full run'})`)
  console.log(`Total chars:          ${totalChars.toLocaleString()} (full + paragraph calls)`)
  console.log(`Est API calls:        ${passages.length + passages.reduce((s, p) => s + (p.paragraphs?.length || 0), 0)}`)
  console.log(`Est ElevenLabs cost:  ~$${(totalChars * 0.000018).toFixed(2)}`)
  console.log(`Est runtime:          ~${Math.ceil(passages.length * 6 / 60)} minutes\n`)

  if (DRY_RUN) {
    console.log('[DRY RUN] No API calls made.')
    return
  }

  if (passages.length === 0) {
    console.log('Nothing to process.')
    return
  }

  // ─── Generation loop ─────────────────────────────────────────────────────
  let processed = 0, failed = 0, totalCharsConsumed = 0
  const errors = []

  for (const passage of passages) {
    const paras = (passage.paragraphs || []).map(p => stripMarkdown(p)).filter(Boolean)
    const fullText = paras.join(' ')
    const label = `L${passage.level_number} U${passage.unit_number} ${passage.reading_label || ''}`

    process.stdout.write(`  Processing ${label} (${paras.length} paras, ${fullText.length} chars)...`)

    try {
      // 1. Full passage audio with timestamps
      const fullResult = await elabsTTS(fullText)
      const fullBuffer = Buffer.from(fullResult.audio_base64, 'base64')
      const fullPath = `readings/L${passage.level_number}_U${passage.unit_number}_${passage.reading_label || 'A'}_full.mp3`
      const fullUrl = await upload(fullBuffer, fullPath)

      // Parse word timestamps from full passage
      const align = fullResult.alignment || {}
      const allWords = charAlignmentToWords(
        align.characters || [],
        align.character_start_times_seconds || [],
        align.character_end_times_seconds || [],
      )
      const fullDurationMs = allWords.length > 0 ? allWords[allWords.length - 1].end_ms : 0

      totalCharsConsumed += fullText.length
      await sleep(1500)

      // 2. Per-paragraph audio
      const paraAudio = []
      const wordTimestampsByPara = []

      for (let i = 0; i < paras.length; i++) {
        const paraText = paras[i]
        if (!paraText) continue

        const paraResult = await elabsTTS(paraText)
        const paraBuffer = Buffer.from(paraResult.audio_base64, 'base64')
        const paraPath = `readings/L${passage.level_number}_U${passage.unit_number}_${passage.reading_label || 'A'}_p${i}.mp3`
        const paraUrl = await upload(paraBuffer, paraPath)

        const pAlign = paraResult.alignment || {}
        const paraWords = charAlignmentToWords(
          pAlign.characters || [],
          pAlign.character_start_times_seconds || [],
          pAlign.character_end_times_seconds || [],
        )
        const paraDurationMs = paraWords.length > 0 ? paraWords[paraWords.length - 1].end_ms : 0

        paraAudio.push({
          paragraph_index: i,
          audio_url:       paraUrl,
          audio_path:      paraPath,
          duration_ms:     paraDurationMs,
          text:            paraText,
          char_count:      paraText.length,
        })
        wordTimestampsByPara.push({ index: i, words: paraWords })
        totalCharsConsumed += paraText.length
        await sleep(1500)
      }

      // 3. Upsert reading_passage_audio
      const { error: upsertErr } = await db
        .from('reading_passage_audio')
        .upsert({
          passage_id:     passage.id,
          full_audio_url: fullUrl,
          full_audio_path: fullPath,
          full_duration_ms: fullDurationMs,
          paragraph_audio: paraAudio,
          word_timestamps: { all_words: allWords, paragraphs: wordTimestampsByPara },
          voice_id:       'alice',
          generated_at:   new Date().toISOString(),
        }, { onConflict: 'passage_id' })

      if (upsertErr) throw new Error(`DB upsert: ${upsertErr.message}`)

      // Also update passage_audio_url on curriculum_readings
      await db.from('curriculum_readings').update({
        passage_audio_url:   fullUrl,
        audio_duration_seconds: Math.round(fullDurationMs / 1000),
        audio_generated_at: new Date().toISOString(),
      }).eq('id', passage.id)

      processed++
      console.log(` ✅ ${Math.round(fullDurationMs / 1000)}s`)

    } catch (e) {
      failed++
      errors.push({ label, error: e.message })
      console.log(` ❌ ${e.message?.slice(0, 80)}`)
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n=== Done ===`)
  console.log(`Processed:      ${processed}`)
  console.log(`Failed:         ${failed}`)
  console.log(`Chars consumed: ${totalCharsConsumed.toLocaleString()}`)
  if (errors.length) {
    console.log('\nErrors:')
    errors.forEach(e => console.log(`  ${e.label}: ${e.error}`))
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
