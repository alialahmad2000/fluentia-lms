#!/usr/bin/env node
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const s = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

function markStrongest(syns) {
  if (syns.length === 0) return syns
  let maxLvl = -1
  for (const x of syns) if (x.level > maxLvl) maxLvl = x.level
  let marked = false
  return syns.map((x) => {
    const base = { ...x }
    delete base.is_strongest
    if (!marked && x.level === maxLvl) {
      marked = true
      return { ...base, is_strongest: true }
    }
    return { ...base, is_strongest: false }
  })
}

async function main() {
  // Find all self-refs
  const all = []
  let from = 0
  for (;;) {
    const { data, error } = await s
      .from('curriculum_vocabulary')
      .select('id, word, synonyms, antonyms')
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  let fixed = 0
  for (const row of all) {
    const w = row.word.toLowerCase()
    const syns = row.synonyms || []
    const ants = row.antonyms || []
    const cleanedSyns = syns.filter((x) => x.word && x.word.toLowerCase() !== w)
    const cleanedAnts = ants.filter((x) => x.word && x.word.toLowerCase() !== w)
    if (cleanedSyns.length === syns.length && cleanedAnts.length === ants.length) continue
    const resyns = markStrongest(cleanedSyns)
    const { error } = await s
      .from('curriculum_vocabulary')
      .update({ synonyms: resyns, antonyms: cleanedAnts })
      .eq('id', row.id)
    if (error) console.error('fail', row.id, error.message)
    else {
      fixed++
      console.log(`Fixed ${row.word} — syns ${syns.length}→${resyns.length}, ants ${ants.length}→${cleanedAnts.length}`)
    }
  }
  console.log(`\nDone — fixed ${fixed} rows`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
