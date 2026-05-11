/**
 * Phase 1B — Vocab Audio Generator
 *
 * Generates one MP3 per vocab entry: "<word>. ... <example_sentence>"
 * Voice: Alice (Xb7hH8MSUJpSbSDYk0k2) — consistent with curriculum standard.
 *
 * Usage:
 *   node generate-vocab.mjs --dry-run            # projection only, no API calls
 *   node generate-vocab.mjs --limit=50           # first 50 entries (sample test)
 *   node generate-vocab.mjs --level=4            # only L4 entries
 *   node generate-vocab.mjs                      # full run (resumes if re-run)
 *   node generate-vocab.mjs --force              # re-generate even if audio_url set
 *
 * Resume-safe: skips entries where audio_url IS NOT NULL (unless --force).
 * Volume guard: stops at 1.95M cumulative ElevenLabs credits used.
 */

import { createClient }   from '@supabase/supabase-js'
import pkg                 from 'pg'
import { readFileSync }    from 'fs'
import { join, dirname }   from 'path'
import { fileURLToPath }   from 'url'
import fetch               from 'node-fetch'

const { Client } = pkg
const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')

// ─── Config ──────────────────────────────────────────────────────────────────
const ALICE_VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2'
const BUCKET         = 'curriculum-audio'
const BATCH_SIZE     = 50
const CONCURRENCY    = 3
const VOLUME_GUARD   = 1_950_000

// ElevenLabs TTS settings for vocabulary
const TTS_SETTINGS = {
  model_id: 'eleven_multilingual_v2',
  voice_settings: { stability: 0.7, similarity_boost: 0.8, style: 0.0, use_speaker_boost: true },
}

// ─── Env ─────────────────────────────────────────────────────────────────────
function readEnv() {
  const env = {}
  readFileSync(join(ROOT, '.env'), 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m) env[m[1]] = m[2].trim()
  })
  return env
}
const ENV     = readEnv()
const db      = createClient(ENV['VITE_SUPABASE_URL'], ENV['SUPABASE_SERVICE_ROLE_KEY'])
const EL_KEY  = ENV['ELEVENLABS_API_KEY']
const EL_BASE = 'https://api.elevenlabs.io/v1'

// ─── CLI args ────────────────────────────────────────────────────────────────
const DRY_RUN   = process.argv.includes('--dry-run')
const FORCE     = process.argv.includes('--force')
const limitArg  = process.argv.find(a => a.startsWith('--limit='))
const levelArg  = process.argv.find(a => a.startsWith('--level='))
const LIMIT     = limitArg ? parseInt(limitArg.split('=')[1]) : null
const LEVEL     = levelArg ? parseInt(levelArg.split('=')[1]) : null

// ─── ElevenLabs helpers ───────────────────────────────────────────────────────
async function elFetch(path, opts = {}) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${EL_BASE}${path}`, {
      ...opts,
      headers: { 'xi-api-key': EL_KEY, ...opts.headers },
    })
    if (res.status === 429) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 32000)
      console.warn(`  Rate-limited. Backing off ${delay}ms...`)
      await new Promise(r => setTimeout(r, delay))
      continue
    }
    return res
  }
  throw new Error('Max retries hit on ElevenLabs rate limit')
}

async function getSubscription() {
  const res = await elFetch('/user/subscription')
  if (!res.ok) throw new Error(`ElevenLabs subscription check failed: ${res.status}`)
  return res.json()
}

async function generateTTS(text) {
  const res = await elFetch(`/text-to-speech/${ALICE_VOICE_ID}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, ...TTS_SETTINGS }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`TTS failed ${res.status}: ${err.slice(0, 200)}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// ─── Log usage ────────────────────────────────────────────────────────────────
async function logUsage(charCount, vocabId) {
  await db.from('ai_usage').insert({
    feature_key: 'elevenlabs_vocab_audio',
    char_count:  charCount,
    ref_table:   'curriculum_vocabulary',
    ref_id:      vocabId,
  }).catch(() => {}) // non-blocking
}

// ─── Process one entry ────────────────────────────────────────────────────────
async function generateOne(row) {
  // Format: "word. ... example sentence"
  const text = `${row.word}. ... ${row.example_sentence || ''}`

  // Generate audio
  const audioBuffer = await generateTTS(text)

  // Storage path: vocab/L{level_number}/{vocab_id}.mp3
  const storagePath = `vocab/L${row.level_number}/${row.id}.mp3`

  // Upload
  const { error: uploadErr } = await db.storage
    .from(BUCKET)
    .upload(storagePath, audioBuffer, { contentType: 'audio/mpeg', upsert: true })
  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`)

  const publicUrl = db.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl

  // Update DB
  const { error: updateErr } = await db
    .from('curriculum_vocabulary')
    .update({
      audio_url:          publicUrl,
      audio_generated_at: new Date().toISOString(),
      audio_voice_name:   'alice',
    })
    .eq('id', row.id)
  if (updateErr) throw new Error(`DB update failed: ${updateErr.message}`)

  await logUsage(text.length, row.id)
  return { chars: text.length, url: publicUrl }
}

// ─── Load pending entries ─────────────────────────────────────────────────────
async function loadPending(pgClient) {
  const levelFilter = LEVEL !== null ? `AND l.level_number = ${LEVEL}` : ''
  const audioFilter = FORCE ? '' : 'AND v.audio_url IS NULL'
  const limitClause = LIMIT ? `LIMIT ${LIMIT}` : ''

  const { rows } = await pgClient.query(`
    SELECT v.id, v.word, v.example_sentence, v.audio_url, l.level_number
    FROM curriculum_vocabulary v
    JOIN curriculum_readings r ON r.id = v.reading_id
    JOIN curriculum_units u ON u.id = r.unit_id
    JOIN curriculum_levels l ON l.id = u.level_id
    WHERE v.word IS NOT NULL
      AND v.example_sentence IS NOT NULL
      AND length(trim(v.example_sentence)) > 5
      ${audioFilter}
      ${levelFilter}
    ORDER BY l.level_number, v.id
    ${limitClause}
  `)
  return rows
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const modeLabel = DRY_RUN ? '[DRY RUN]' : LIMIT ? `[--limit=${LIMIT}]` : LEVEL !== null ? `[--level=${LEVEL}]` : '[FULL RUN]'
  console.log(`\n=== VOCAB AUDIO ${modeLabel} ===\n`)

  // Connect to DB for batch loading
  const pgClient = new Client({
    host: 'aws-1-eu-central-1.pooler.supabase.com', port: 5432,
    database: 'postgres', user: 'postgres.nmjexpuycmqcxuxljier',
    password: 'Ali-al-ahmad2000', ssl: { rejectUnauthorized: false },
  })
  await pgClient.connect()

  const pending = await loadPending(pgClient)
  const totalChars = pending.reduce((s, r) => s + (r.word?.length || 0) + 5 + (r.example_sentence?.length || 0), 0)
  const etaHours = (pending.length / (CONCURRENCY * 60 * 60 / 2)).toFixed(1) // ~2s per entry

  // Stats DB counts
  const { rows: [{ done, total }] } = await pgClient.query(`
    SELECT count(*) FILTER (WHERE audio_url IS NOT NULL) AS done, count(*) AS total
    FROM curriculum_vocabulary
  `)
  await pgClient.end()

  console.log(`Entries pending:         ${pending.length.toLocaleString()}`)
  console.log(`Already with audio_url:  ${parseInt(done).toLocaleString()} / ${parseInt(total).toLocaleString()}`)
  console.log(`Total chars projected:   ${totalChars.toLocaleString()}`)
  console.log(`Est runtime:             ~${etaHours} hours at 3 concurrent`)

  // ElevenLabs balance (will fail if API unreachable)
  let sub = null
  try {
    sub = await getSubscription()
    const remaining = (sub.character_limit || 0) - (sub.character_count || 0)
    const headroom = remaining - totalChars
    console.log(`\nElevenLabs tier:         ${sub.tier}`)
    console.log(`Credits used:            ${(sub.character_count || 0).toLocaleString()}`)
    console.log(`Credits limit:           ${(sub.character_limit || 0).toLocaleString()}`)
    console.log(`Remaining credits:       ${remaining.toLocaleString()}`)
    console.log(`Headroom after run:      ${headroom.toLocaleString()} ${headroom < 0 ? '❌ INSUFFICIENT — upgrade plan first' : '✅'}`)

    if (sub.tier !== 'scale' && sub.tier !== 'business' && sub.tier !== 'creator') {
      console.log(`\n❌ ABORT: ElevenLabs tier "${sub.tier}" is not sufficient. Need Scale plan or higher.`)
      process.exit(1)
    }
    if (remaining < 1_500_000 && !LIMIT) {
      console.log(`\n⚠️  WARNING: Only ${remaining.toLocaleString()} credits remaining. Full run needs ~${totalChars.toLocaleString()}.`)
      if (headroom < 0) { console.log('❌ ABORT: Insufficient credits.'); process.exit(1) }
    }
  } catch (e) {
    console.log(`\n⚠️  ElevenLabs API unreachable: ${e.message}`)
    console.log('   → Cannot verify subscription tier or credit balance.')
    console.log('   → Fix network connectivity or API key before running.')
    if (DRY_RUN) {
      console.log('\n[DRY RUN] Projection complete (balance check skipped).')
      console.log('Reply "GO" in chat after verifying ElevenLabs balance manually.')
      process.exit(0)
    } else {
      console.log('\n❌ Cannot generate audio without ElevenLabs API access.')
      process.exit(1)
    }
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Projection complete. Reply "GO" in chat to start generation.')
    process.exit(0)
  }

  // ─── Real run ───────────────────────────────────────────────────────────────
  const startTime = Date.now()
  let processed = 0, failed = 0, charsConsumed = 0
  const failedRows = []

  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const chunk = pending.slice(i, i + CONCURRENCY)
    const results = await Promise.allSettled(chunk.map(row => generateOne(row)))

    for (const [j, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        processed++
        charsConsumed += result.value.chars
      } else {
        failed++
        const row = chunk[j]
        failedRows.push({ id: row.id, word: row.word, error: result.reason?.message })
        console.error(`  ❌ "${row.word}": ${result.reason?.message?.slice(0, 80)}`)
      }
    }

    // Progress every 100
    if (processed % 100 === 0 || i + CONCURRENCY >= pending.length) {
      const pct = Math.round(((processed + failed) / pending.length) * 100)
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
      process.stdout.write(`\r  ${processed + failed}/${pending.length} (${pct}%) ✅${processed} ❌${failed} | ${charsConsumed.toLocaleString()} chars | ${elapsed}m elapsed`)
    }

    // Volume guard — check every 500 entries
    if ((processed + failed) % 500 === 0 && processed > 0) {
      try {
        const sub2 = await getSubscription()
        if (sub2.character_count >= VOLUME_GUARD) {
          console.log(`\n⛔ Volume guard triggered at ${sub2.character_count.toLocaleString()} chars. Stopping.`)
          break
        }
      } catch { /* continue if check fails */ }
    }
  }

  console.log('\n')
  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  console.log(`=== Generation complete ===`)
  console.log(`Processed:        ${processed}`)
  console.log(`Failed:           ${failed}`)
  console.log(`Chars consumed:   ${charsConsumed.toLocaleString()}`)
  console.log(`Runtime:          ${elapsed} minutes`)

  if (failedRows.length > 0) {
    console.log(`\nFailed rows (first 10):`)
    failedRows.slice(0, 10).forEach(r => console.log(`  "${r.word}": ${r.error}`))
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
