/**
 * Phase 1A — Listening Audio Generator
 *
 * Generates single MP3 per listening item + word-level timestamps.
 * Strips "Speaker: " labels from transcript for clean single-voice TTS.
 * Uses ElevenLabs /with-timestamps endpoint. Voice: Alice.
 *
 * Usage:
 *   node scripts/generate-listening-audio.mjs --level 1 --dry-run
 *   node scripts/generate-listening-audio.mjs --level 1 [--resume] [--limit N]
 *   node scripts/generate-listening-audio.mjs --level 3 [--resume]
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

// ─── CLI ──────────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2)
const DRY_RUN  = args.includes('--dry-run')
const RESUME   = args.includes('--resume')
const levelArg = args.find(a => a.startsWith('--level'))
const limitArg = args.find(a => a.startsWith('--limit'))
const LEVEL    = levelArg ? parseInt(levelArg.split(/[= ]/)[1] || args[args.indexOf('--level') + 1]) : null
const LIMIT    = limitArg ? parseInt(limitArg.split(/[= ]/)[1] || args[args.indexOf('--limit') + 1]) : null

if (LEVEL === null) {
  console.error('Usage: node generate-listening-audio.mjs --level <1|3> [--dry-run] [--resume] [--limit N]')
  process.exit(1)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

/** Strip "SpeakerName: " prefixes from dialogue transcripts for clean TTS */
function cleanTranscript(transcript) {
  return (transcript || '')
    .split('\n')
    .map(line => {
      // Remove "Name: " at start of each line
      return line.replace(/^\s*[A-Z][a-zA-Z\s]{0,20}:\s+/, '')
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

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
  if (wordChars.length > 0) {
    words.push({
      word:     wordChars.join(''),
      start_ms: Math.round(wordStart),
      end_ms:   Math.round(endTimes[endTimes.length - 1] * 1000),
    })
  }
  return words
}

async function elabsTTS(text, attempt = 0) {
  const url = `${EL_BASE}/text-to-speech/${ALICE}/with-timestamps`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': EL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
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

  return res.json()
}

async function upload(buffer, storagePath) {
  const { error } = await db.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: 'audio/mpeg',
    upsert: true,
  })
  if (error) throw new Error(`Upload failed ${storagePath}: ${error.message}`)
  return db.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== Listening Audio Generator — L${LEVEL} ${DRY_RUN ? '[DRY RUN]' : RESUME ? '[RESUME]' : '[FULL]'} ===\n`)

  const pg = new Client({
    host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432,
    database: 'postgres', user: 'postgres.nmjexpuycmqcxuxljier',
    password: 'Ali-al-ahmad2000', ssl: { rejectUnauthorized: false },
  })
  await pg.connect()

  const resumeWhere = RESUME ? 'AND li.audio_url IS NULL' : ''
  const limitClause = LIMIT ? `LIMIT ${LIMIT}` : ''

  const { rows: items } = await pg.query(`
    SELECT li.id, li.title_en, li.transcript, li.audio_type,
           li.audio_url, l.level_number, u.unit_number
    FROM curriculum_listening li
    JOIN curriculum_units u ON u.id = li.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE l.level_number = $1
      AND li.transcript IS NOT NULL
      AND length(trim(li.transcript)) > 0
      ${resumeWhere}
    ORDER BY u.unit_number
    ${limitClause}
  `, [LEVEL])
  await pg.end()

  const totalChars = items.reduce((s, item) => s + cleanTranscript(item.transcript).length, 0)

  console.log(`Items to process: ${items.length} (L${LEVEL})`)
  console.log(`Total chars:      ${totalChars.toLocaleString()}`)
  console.log(`Est cost:         ~$${(totalChars * 0.000018).toFixed(2)}`)
  console.log(`Est runtime:      ~${Math.ceil(items.length * 2 / 60)} minutes\n`)

  if (DRY_RUN) {
    console.log('[DRY RUN] No API calls made.')
    items.slice(0, 3).forEach(it => {
      const cleaned = cleanTranscript(it.transcript)
      console.log(`  U${it.unit_number} "${it.title_en?.slice(0, 40)}" — ${cleaned.length} chars`)
      console.log(`    Preview: "${cleaned.slice(0, 80)}..."`)
    })
    return
  }

  if (items.length === 0) {
    console.log('Nothing to process.')
    return
  }

  let processed = 0, failed = 0, totalCharsConsumed = 0
  const errors = []

  for (const item of items) {
    const ttsText = cleanTranscript(item.transcript)
    const label = `L${item.level_number} U${item.unit_number} "${item.title_en?.slice(0, 30)}"`
    process.stdout.write(`  ${label} (${ttsText.length} chars)...`)

    try {
      const result = await elabsTTS(ttsText)
      const audioBuffer = Buffer.from(result.audio_base64, 'base64')
      const storagePath = `listening/L${item.level_number}_U${item.unit_number}.mp3`
      const audioUrl = await upload(audioBuffer, storagePath)

      const align = result.alignment || {}
      const words = charAlignmentToWords(
        align.characters || [],
        align.character_start_times_seconds || [],
        align.character_end_times_seconds || [],
      )
      const durationMs = words.length > 0 ? words[words.length - 1].end_ms : 0

      const { error: updateErr } = await db
        .from('curriculum_listening')
        .update({
          audio_url:          audioUrl,
          audio_duration_seconds: Math.round(durationMs / 1000),
          audio_generated_at: new Date().toISOString(),
          word_timestamps:    { words },
        })
        .eq('id', item.id)

      if (updateErr) throw new Error(`DB update: ${updateErr.message}`)

      processed++
      totalCharsConsumed += ttsText.length
      console.log(` ✅ ${Math.round(durationMs / 1000)}s`)
      await sleep(2000)

    } catch (e) {
      failed++
      errors.push({ label, error: e.message })
      console.log(` ❌ ${e.message?.slice(0, 80)}`)
    }
  }

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
