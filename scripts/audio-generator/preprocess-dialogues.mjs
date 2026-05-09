// Phase 0.5 — Dialogue Preprocessor for curriculum_listening
// Parses "Name: text" patterns in transcripts → speaker_segments JSONB
// READ the transcript, WRITE speaker_segments only (transcript never modified).
//
// CLI flags:
//   --dry-run     Print what would be written, don't touch DB
//   --id <uuid>   Process one item only
//   --level <n>   Process only items in one level (0-5)
//   --force       Re-process even if segments_processed_at IS NOT NULL

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')

// ─── Load env ───────────────────────────────────────────────────────────────
function readEnv() {
  const raw = readFileSync(join(ROOT, '.env'), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

const ENV = readEnv()
const SUPABASE_URL = ENV['VITE_SUPABASE_URL']
const SERVICE_KEY  = ENV['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SERVICE_KEY)

// ─── Load gender map ─────────────────────────────────────────────────────────
const GENDER_MAP = JSON.parse(readFileSync(
  join(__dirname, 'speaker-gender-map.json'), 'utf8'
))

// ─── Parse CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY_RUN  = args.includes('--dry-run')
const FORCE    = args.includes('--force')
const idIdx    = args.indexOf('--id')
const levelIdx = args.indexOf('--level')
const TARGET_ID    = idIdx    >= 0 ? args[idIdx + 1]    : null
const TARGET_LEVEL = levelIdx >= 0 ? parseInt(args[levelIdx + 1]) : null

if (DRY_RUN)      console.log('🔍 DRY-RUN mode — no DB writes\n')
if (TARGET_ID)    console.log(`🔎 Processing single item: ${TARGET_ID}\n`)
if (TARGET_LEVEL !== null) console.log(`🔎 Processing only level ${TARGET_LEVEL}\n`)

// ─── Speaker regex ───────────────────────────────────────────────────────────
const SPEAKER_RE = /(?:^|\n)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?):\s+/gm

// ─── Parse segments from transcript ──────────────────────────────────────────
function parseSegments(transcript) {
  if (!transcript) return null

  SPEAKER_RE.lastIndex = 0
  const matches = [...transcript.matchAll(SPEAKER_RE)]
  if (matches.length === 0) return null

  // Filter false positives (common non-name words at line start)
  const FALSE_POSITIVES = new Set([
    'Note','Source','From','To','Re','Ps','Dear','The','This','That',
    'Chapter','Section','Part','Unit','Exercise','Example','Question',
    'Answer','Topic','Task','Step',
  ])
  const validMatches = matches.filter(m => !FALSE_POSITIVES.has(m[1].trim()))
  if (validMatches.length === 0) return null

  const segments = []
  for (let i = 0; i < validMatches.length; i++) {
    const m = validMatches[i]
    const speaker = m[1].trim()
    const startOfText = m.index + m[0].length
    const endOfText = i + 1 < validMatches.length ? validMatches[i + 1].index : transcript.length
    const text = transcript.slice(startOfText, endOfText).trim()
    if (text.length > 0) {
      segments.push({ order: segments.length + 1, speaker, text, char_count: text.length })
    }
  }

  return segments.length > 0 ? segments : null
}

// ─── Assign voices per item ───────────────────────────────────────────────────
function assignVoices(segments) {
  const counters = { female: 0, male: 0, unknown: 0 }
  const seen = new Map()  // speaker name → { gender, voice_id, voice_name }
  let hasUnknownGender = false

  for (const seg of segments) {
    if (seen.has(seg.speaker)) {
      const v = seen.get(seg.speaker)
      seg.gender     = v.gender
      seg.voice_id   = v.voice_id
      seg.voice_name = v.voice_name
      continue
    }

    const speakerInfo = GENDER_MAP.speakers[seg.speaker]
    const gender = speakerInfo?.gender || 'unknown'

    let voice_name
    if (gender === 'female') {
      voice_name = counters.female % 2 === 0 ? 'alice' : 'matilda'
      counters.female++
    } else if (gender === 'male') {
      voice_name = counters.male % 2 === 0 ? 'george' : 'daniel'
      counters.male++
    } else {
      // Unknown — default to alice, log warning
      voice_name = 'alice'
      counters.unknown++
      hasUnknownGender = true
      console.warn(`  ⚠️  UNKNOWN gender for "${seg.speaker}" — defaulting to alice`)
    }

    const voice_id = GENDER_MAP.voices[voice_name].id
    seg.gender     = gender
    seg.voice_id   = voice_id
    seg.voice_name = voice_name
    seen.set(seg.speaker, { gender, voice_id, voice_name })
  }

  return { segments, uniqueSpeakers: [...seen.keys()], hasUnknownGender }
}

// ─── Validate gender map covers all speakers in inventory ────────────────────
function validateGenderMap() {
  const inventoryPath = join(ROOT, 'docs', 'audits', 'dialogue-inventory.json')
  let inventory
  try {
    inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'))
  } catch {
    console.warn('  ⚠️  dialogue-inventory.json not found — skipping pre-flight check')
    return true
  }

  const missing = []
  for (const item of inventory.items) {
    for (const spk of (item.speakers || [])) {
      const name = spk.name
      if (!GENDER_MAP.speakers[name] && !['Note','Narrator'].includes(name)) {
        // Check if it's covered by dictionary names
        const FALSE_POSITIVES = new Set(['Note','Source','From','To','Re','The','This','That'])
        if (!FALSE_POSITIVES.has(name) && !GENDER_MAP.speakers[name]) {
          missing.push(name)
        }
      }
    }
  }

  const uniqueMissing = [...new Set(missing)]
  if (uniqueMissing.length > 0) {
    console.error(`❌ ABORT: These speakers are in dialogue-inventory.json but NOT in speaker-gender-map.json:`)
    uniqueMissing.forEach(n => console.error(`   - "${n}"`))
    return false
  }
  return true
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Phase 0.5 — Dialogue Preprocessor ===\n')

  // Pre-flight: validate gender map
  console.log('Validating speaker-gender-map.json against dialogue-inventory.json...')
  if (!validateGenderMap()) process.exit(1)
  console.log('✅ All speakers covered\n')

  // Load all listening items
  let query = db
    .from('curriculum_listening')
    .select(`
      id, unit_id, audio_type, transcript, segments_processed_at,
      curriculum_units!inner(unit_number, curriculum_levels!inner(level_number))
    `)
    .order('id')

  if (TARGET_ID)                    query = query.eq('id', TARGET_ID)
  if (!FORCE && !DRY_RUN)           query = query.is('segments_processed_at', null)
  if (FORCE || DRY_RUN)             { /* no filter — process all */ }

  const { data: items, error } = await query
  if (error) { console.error('Failed to load items:', error.message); process.exit(1) }

  // Filter by level if requested
  const filtered = TARGET_LEVEL !== null
    ? items.filter(it => it.curriculum_units?.curriculum_levels?.level_number === TARGET_LEVEL)
    : items

  console.log(`Loaded ${filtered.length} item(s) to process\n`)

  // Stats
  const stats = {
    processed: 0, multiVoice: 0, singleVoice: 0, nullSegments: 0,
    totalSegments: 0, unknownGenderWarnings: 0,
    voices: { alice: 0, matilda: 0, george: 0, daniel: 0 },
  }

  const spotCheckItems = []

  for (const item of filtered) {
    const level = item.curriculum_units?.curriculum_levels?.level_number ?? '?'
    const unit  = item.curriculum_units?.unit_number ?? '?'
    const prefix = `  L${level} U${unit} [${item.id.slice(0,8)}…]`

    const raw = parseSegments(item.transcript)

    if (!raw) {
      console.log(`${prefix} → NULL (no speaker pattern, single-voice)`)
      stats.nullSegments++
      if (!DRY_RUN) {
        const { error: upErr } = await db
          .from('curriculum_listening')
          .update({ speaker_segments: null, segments_processed_at: new Date().toISOString() })
          .eq('id', item.id)
        if (upErr) console.error(`  ❌ Update failed: ${upErr.message}`)
      }
      stats.processed++
      continue
    }

    const { segments, uniqueSpeakers, hasUnknownGender } = assignVoices(raw)
    if (hasUnknownGender) stats.unknownGenderWarnings++

    const isMultiVoice = uniqueSpeakers.length > 1
    console.log(`${prefix} → ${segments.length} segments, ${uniqueSpeakers.length} speaker(s): ${uniqueSpeakers.join(', ')}`)

    // Voice usage
    for (const seg of segments) {
      if (seg.voice_name) stats.voices[seg.voice_name] = (stats.voices[seg.voice_name] || 0) + 1
    }

    stats.totalSegments += segments.length
    if (isMultiVoice) stats.multiVoice++
    else stats.singleVoice++

    if (DRY_RUN) {
      console.log(`    [DRY-RUN] Would write ${segments.length} segments`)
      segments.slice(0, 2).forEach(s =>
        console.log(`    [${s.order}] ${s.speaker} → ${s.voice_name} (${s.char_count} chars): "${s.text.slice(0,60)}..."`)
      )
    } else {
      const { error: upErr } = await db
        .from('curriculum_listening')
        .update({
          speaker_segments: segments,
          segments_processed_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      if (upErr) {
        console.error(`  ❌ Update failed for ${item.id}: ${upErr.message}`)
        continue
      }
    }

    stats.processed++
    if (spotCheckItems.length < 3 && isMultiVoice) spotCheckItems.push({ item, segments, level, unit })
  }

  console.log('\n─── Summary ───')
  console.log(`  Processed:            ${stats.processed}`)
  console.log(`  Multi-voice items:    ${stats.multiVoice + stats.singleVoice}`)
  console.log(`  — Multi-speaker:      ${stats.multiVoice}`)
  console.log(`  — Single-speaker:     ${stats.singleVoice}`)
  console.log(`  Null (no pattern):    ${stats.nullSegments}`)
  console.log(`  Total segments:       ${stats.totalSegments}`)
  console.log(`  Unknown-gender warns: ${stats.unknownGenderWarnings}`)
  console.log('\n  Voice usage (segment count):')
  for (const [v, n] of Object.entries(stats.voices)) console.log(`    ${v}: ${n}`)

  if (stats.unknownGenderWarnings > 0) {
    console.error('\n❌ Unknown-gender warnings exist — fix speaker-gender-map.json before running audio generation')
    process.exit(1)
  }

  // Phase F spot check
  if (spotCheckItems.length > 0 && !DRY_RUN) {
    console.log('\n─── Phase F: Spot Check ───')
    for (const { item, segments, level, unit } of spotCheckItems) {
      console.log(`\nItem ${item.id} (L${level} U${unit}, audio_type=${item.audio_type}):`)
      for (const seg of segments) {
        console.log(`  [${seg.order}] ${seg.speaker} (${seg.voice_name} / ${seg.gender}, ${seg.char_count} chars)`)
        console.log(`       "${seg.text.slice(0, 80)}${seg.text.length > 80 ? '...' : ''}"`)
      }
      // Checks
      const noPrefix = segments.every(s => !/^[A-Z][a-z]+:/.test(s.text))
      const noEmpty  = segments.every(s => s.text.length > 0)
      const consistent = (() => {
        const m = new Map()
        for (const s of segments) {
          if (!m.has(s.speaker)) m.set(s.speaker, s.voice_name)
          else if (m.get(s.speaker) !== s.voice_name) return false
        }
        return true
      })()
      console.log(`  ✅ No Name: prefix:    ${noPrefix}`)
      console.log(`  ✅ No empty text:      ${noEmpty}`)
      console.log(`  ✅ Consistent voices:  ${consistent}`)
    }
  }

  console.log('\n' + (DRY_RUN ? '🔍 Dry-run complete — no DB writes made.' : '✅ Processing complete.'))
  return stats
}

main().catch(e => { console.error('Fatal:', e.message, e.stack); process.exit(1) })
