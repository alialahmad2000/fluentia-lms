#!/usr/bin/env node
/**
 * Verifies synonyms/antonyms coverage on curriculum_vocabulary after agents run.
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function fetchAll() {
  const rows = []
  let from = 0
  const pageSize = 1000
  for (;;) {
    const { data, error } = await supabase
      .from('curriculum_vocabulary')
      .select('id, word, synonyms, antonyms, relationships_generated_at')
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

function isValidLevel(l) {
  return Number.isInteger(l) && l >= 1 && l <= 5
}

async function main() {
  const rows = await fetchAll()
  const total = rows.length

  let processed = 0
  let withSyns = 0
  let withAnts = 0
  let invalidLevel = 0
  let missingStrongest = 0
  let linkedCount = 0
  let linkableCount = 0

  for (const r of rows) {
    if (r.relationships_generated_at) processed++
    const syns = Array.isArray(r.synonyms) ? r.synonyms : []
    const ants = Array.isArray(r.antonyms) ? r.antonyms : []
    if (syns.length > 0) withSyns++
    if (ants.length > 0) withAnts++

    for (const s of syns) {
      if (!isValidLevel(s.level)) invalidLevel++
      linkableCount++
      if (s.vocabulary_id) linkedCount++
    }
    for (const a of ants) {
      if (!isValidLevel(a.level)) invalidLevel++
      linkableCount++
      if (a.vocabulary_id) linkedCount++
    }
    if (syns.length > 0 && !syns.some((s) => s.is_strongest)) missingStrongest++
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Vocabulary relationships verification')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Total rows:         ${total}`)
  console.log(`Processed:          ${processed} (${((processed / total) * 100).toFixed(1)}%)`)
  console.log(`With synonyms:      ${withSyns}`)
  console.log(`With antonyms:      ${withAnts}`)
  console.log(`Invalid levels:     ${invalidLevel}`)
  console.log(`Missing strongest:  ${missingStrongest}`)
  console.log(
    `Linked refs:        ${linkedCount}/${linkableCount} (${
      linkableCount ? ((linkedCount / linkableCount) * 100).toFixed(1) : 0
    }%)`
  )

  // Random 20 spot-check
  console.log('\n━━ Sample (20 random rows) ━━')
  const sample = rows.filter((r) => r.synonyms?.length || r.antonyms?.length)
  for (let i = 0; i < Math.min(20, sample.length); i++) {
    const r = sample[Math.floor(Math.random() * sample.length)]
    console.log(`\n${r.word}`)
    console.log(`  syns:`, (r.synonyms || []).map((s) => `${s.word}(L${s.level})${s.is_strongest ? '⭐' : ''}`).join(', '))
    console.log(`  ants:`, (r.antonyms || []).map((a) => `${a.word}(L${a.level})`).join(', '))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
