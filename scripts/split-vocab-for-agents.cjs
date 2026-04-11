#!/usr/bin/env node
/**
 * Splits all unprocessed curriculum_vocabulary rows into 10 balanced batches.
 *
 * Writes:
 *   scripts/agent-batches/batch-01.json .. batch-10.json
 * Each file entry: { id, word, level, part_of_speech, definition_en, definition_ar }
 *
 * Level is derived via: curriculum_vocabulary.reading_id -> curriculum_readings.unit_id
 *   -> curriculum_units.level_id -> curriculum_levels.level_number
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

const BATCH_COUNT = 10
const OUT_DIR = path.resolve(__dirname, 'agent-batches')

async function fetchAll() {
  const pageSize = 1000
  let from = 0
  const rows = []
  for (;;) {
    const { data, error } = await supabase
      .from('curriculum_vocabulary')
      .select(
        `id, word, part_of_speech, definition_en, definition_ar, relationships_generated_at,
         reading:curriculum_readings!inner (
           unit:curriculum_units!inner (
             level:curriculum_levels!inner ( level_number )
           )
         )`
      )
      .is('relationships_generated_at', null)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }
  return rows
}

function normalizeLevel(levelNumber) {
  // Fluentia levels: 0..5. Spec expects synonym levels 1..5.
  // Use the level of the source word; clamp 0->1.
  if (levelNumber == null) return 1
  if (levelNumber <= 0) return 1
  if (levelNumber > 5) return 5
  return levelNumber
}

function splitBalanced(items, n) {
  const batches = Array.from({ length: n }, () => [])
  items.forEach((it, i) => {
    batches[i % n].push(it)
  })
  return batches
}

async function main() {
  console.log('Fetching unprocessed curriculum_vocabulary rows...')
  const raw = await fetchAll()
  console.log(`Fetched ${raw.length} rows`)

  const flattened = raw.map((r) => ({
    id: r.id,
    word: r.word,
    level: normalizeLevel(r.reading?.unit?.level?.level_number),
    part_of_speech: r.part_of_speech || null,
    definition_en: r.definition_en || null,
    definition_ar: r.definition_ar || null,
  }))

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  const batches = splitBalanced(flattened, BATCH_COUNT)

  const summary = []
  batches.forEach((batch, idx) => {
    const n = String(idx + 1).padStart(2, '0')
    const file = path.join(OUT_DIR, `batch-${n}.json`)
    fs.writeFileSync(file, JSON.stringify(batch, null, 2), 'utf8')
    summary.push(`batch-${n}.json: ${batch.length} words`)
  })

  console.log('Prepared ' + summary.join(' | '))
  console.log('Total:', flattened.length)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
