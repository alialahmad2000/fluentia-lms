#!/usr/bin/env node
// Load hardened questions into ielts_reading_passages (UPDATE questions +
// answer_key by id only — passage content/title/band untouched).
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supa = createClient(URL, KEY, { auth: { persistSession: false } })

let ok = 0, fail = 0
for (const f of process.argv.slice(2)) {
  const rows = JSON.parse(fs.readFileSync(f, 'utf8'))
  for (const p of rows) {
    const { error } = await supa.from('ielts_reading_passages')
      .update({ questions: p.questions, answer_key: p.answer_key })
      .eq('id', p.id)
    if (error) { console.log(`  ✗ #${p.passage_number}: ${error.message}`); fail++; continue }
    console.log(`  ✓ #${p.passage_number} (${p.questions.length}q)`)
    ok++
  }
}
console.log(`\nDone. ok=${ok} fail=${fail}`)
