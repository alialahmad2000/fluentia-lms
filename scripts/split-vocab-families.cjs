#!/usr/bin/env node
/**
 * Prompt 35 splitter: divide all curriculum_vocabulary rows that still need
 * word_family generation into 10 balanced batches under scripts/family-batches/.
 *
 * Output format per batch file:
 *   [{ id, word, level, meaning_en, meaning_ar }, ...]
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const s = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function main() {
  const outDir = path.resolve(__dirname, 'family-batches')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  console.log('Fetching vocabulary without word_family...')
  const all = []
  let from = 0
  for (;;) {
    const { data, error } = await s
      .from('curriculum_vocabulary')
      .select(
        'id, word, definition_en, definition_ar, difficulty_tier, reading:curriculum_readings!reading_id(unit:curriculum_units!unit_id(level:curriculum_levels!level_id(level_number)))'
      )
      .is('word_family_generated_at', null)
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < 1000) break
    from += 1000
  }
  console.log(`Total pending: ${all.length}`)
  if (all.length === 0) {
    console.log('Nothing to split.')
    return
  }

  const flat = all.map((row) => ({
    id: row.id,
    word: row.word,
    level: row.reading?.unit?.level?.level_number ?? null,
    meaning_en: row.definition_en,
    meaning_ar: row.definition_ar,
  }))

  const N = 10
  const perBatch = Math.ceil(flat.length / N)
  let written = 0
  for (let i = 0; i < N; i++) {
    const slice = flat.slice(i * perBatch, (i + 1) * perBatch)
    if (slice.length === 0) continue
    const num = String(i + 1).padStart(2, '0')
    const file = path.join(outDir, `batch-${num}.json`)
    fs.writeFileSync(file, JSON.stringify(slice, null, 2))
    console.log(`Wrote batch-${num}.json: ${slice.length} words`)
    written += slice.length
  }
  console.log(`\nDONE — ${written} words across ${N} batches`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
