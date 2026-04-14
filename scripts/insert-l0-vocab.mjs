#!/usr/bin/env node
/**
 * LEGENDARY-B1: Insert L0 vocabulary into curriculum_vocabulary
 * Uses existing reading "A" entries per unit. Deduplicates against existing words.
 * Idempotent: ON CONFLICT DO NOTHING on unique index (reading_id, lower(word)).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEyNTYxOCwiZXhwIjoyMDg4NzAxNjE4fQ.Abbt3bzmud1B55ym_UW_3kEUMyVkhOiQ_iiLpHo1tfs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function main() {
  console.log('=== LEGENDARY-B1: L0 Vocabulary Insertion ===\n')

  // 1. Get L0 level and units
  const { data: level } = await supabase
    .from('curriculum_levels')
    .select('id')
    .eq('level_number', 0)
    .single()

  const { data: units } = await supabase
    .from('curriculum_units')
    .select('id, unit_number')
    .eq('level_id', level.id)
    .order('unit_number')

  console.log(`L0 units: ${units.length}`)
  const unitIds = units.map(u => u.id)
  const unitMap = Object.fromEntries(units.map(u => [u.id, u.unit_number]))

  // 2. Get existing readings (reading "A" per unit will hold new vocab)
  const { data: readings } = await supabase
    .from('curriculum_readings')
    .select('id, unit_id, reading_label')
    .in('unit_id', unitIds)
    .order('sort_order')

  console.log(`Existing L0 readings: ${readings.length}`)

  // Map unit_number → reading "A" id (insert new vocab into reading A)
  const unitToReadingA = {}
  for (const r of readings) {
    const un = unitMap[r.unit_id]
    if (r.reading_label === 'A') {
      unitToReadingA[un] = r.id
    }
  }

  // 3. Get existing words for deduplication
  const readingIds = readings.map(r => r.id)
  const { data: existingVocab } = await supabase
    .from('curriculum_vocabulary')
    .select('word, reading_id')
    .in('reading_id', readingIds)

  const existingWords = new Set((existingVocab || []).map(v => v.word.toLowerCase()))
  console.log(`Existing L0 vocab: ${existingVocab.length} rows, ${existingWords.size} unique`)

  // 4. Load word list and dedup
  const allNewWords = JSON.parse(readFileSync('data/wordlists/cefr_a1_l0.json', 'utf-8'))
  const words = allNewWords.filter(w => !existingWords.has(w.word.toLowerCase()))
  console.log(`New words after dedup: ${words.length} (removed ${allNewWords.length - words.length} duplicates)`)
  console.log(`Projected total: ${existingWords.size + words.length}`)

  // 5. Insert vocabulary one-by-one to handle conflicts gracefully
  let insertedTotal = 0
  let skippedTotal = 0

  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const readingId = unitToReadingA[w.unit_number]

    if (!readingId) {
      console.error(`No reading A for unit ${w.unit_number}, skipping ${w.word}`)
      skippedTotal++
      continue
    }

    const row = {
      reading_id: readingId,
      word: w.word,
      definition_en: w.example_sentence,
      definition_ar: w.definition_ar,
      example_sentence: w.example_sentence,
      part_of_speech: w.part_of_speech,
      difficulty_tier: w.tier === 'core' ? 'high_frequency' : w.tier === 'extended' ? 'medium_frequency' : 'low_frequency',
      tier: w.tier,
      cefr_level: 'A1',
      source_list: w.source_list,
      appears_in_passage: false,
      tier_order: i + 1,
      added_in_prompt: 'LEGENDARY-B1',
      sort_order: 100 + i, // After existing words
    }

    const { data: inserted, error } = await supabase
      .from('curriculum_vocabulary')
      .insert(row)
      .select('id')

    if (error) {
      if (error.message.includes('duplicate') || error.code === '23505') {
        skippedTotal++
      } else {
        console.error(`Failed: ${w.word} — ${error.message}`)
        skippedTotal++
      }
    } else {
      insertedTotal++
    }

    if ((i + 1) % 50 === 0) process.stdout.write(`  ${i + 1}/${words.length} processed...\n`)
  }

  console.log(`\n=== INSERTION SUMMARY ===`)
  console.log(`Inserted: ${insertedTotal}`)
  console.log(`Skipped: ${skippedTotal}`)

  // 6. Verification
  console.log('\n=== POST-INSERT VERIFICATION ===')

  // Per-unit counts (all readings, not just A)
  for (const unit of units) {
    const unitReadings = readings.filter(r => unitMap[r.unit_id] === unit.unit_number).map(r => r.id)
    const { count } = await supabase
      .from('curriculum_vocabulary')
      .select('id', { count: 'exact', head: true })
      .in('reading_id', unitReadings)
    console.log(`Unit ${unit.unit_number}: ${count} words`)
  }

  // Total L0 unique
  const { data: allVocab } = await supabase
    .from('curriculum_vocabulary')
    .select('word')
    .in('reading_id', readingIds)

  const uniqueWords = new Set((allVocab || []).map(v => v.word.toLowerCase()))
  console.log(`\nTotal L0 unique words: ${uniqueWords.size}`)
  console.log(`Target: 350`)
  console.log(`Meets target: ${uniqueWords.size >= 350 ? 'YES ✓' : 'NO ✗'}`)

  // Tier breakdown
  for (const tier of ['core', 'extended', 'mastery']) {
    const { count } = await supabase
      .from('curriculum_vocabulary')
      .select('id', { count: 'exact', head: true })
      .in('reading_id', readingIds)
      .eq('tier', tier)
    console.log(`${tier}: ${count}`)
  }

  // Verify every unit ≥ 25
  let allAbove25 = true
  for (const unit of units) {
    const unitReadings = readings.filter(r => unitMap[r.unit_id] === unit.unit_number).map(r => r.id)
    const { count } = await supabase
      .from('curriculum_vocabulary')
      .select('id', { count: 'exact', head: true })
      .in('reading_id', unitReadings)
    if (count < 25) { allAbove25 = false; console.log(`WARNING: Unit ${unit.unit_number} has only ${count} words (< 25)`) }
  }
  console.log(`Every unit ≥ 25 words: ${allAbove25 ? 'YES ✓' : 'NO ✗'}`)

  console.log('\n=== DONE ===')
}

main().catch(e => { console.error(e); process.exit(1) })
