#!/usr/bin/env node
// Load the authored Academic Reading question-type curriculum into
// ielts_reading_skills (12 rows). Requires SUPABASE_SERVICE_ROLE_KEY = sb_secret_*.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supa = createClient(URL, KEY, { auth: { persistSession: false } })

const path = process.argv[2]
const rows = JSON.parse(fs.readFileSync(path, 'utf8'))
let ok = 0
for (const r of rows) {
  const { error } = await supa.from('ielts_reading_skills')
    .update({
      name_ar: r.name_ar,
      name_en: r.name_en,
      family: r.family,
      sort_order: r.sort_order,
      explanation_ar: r.explanation_ar,
      instruction_en: r.instruction_en,
      answer_format_ar: r.answer_format_ar,
      strategy_steps: r.strategy_steps,
      common_mistakes_ar: r.common_mistakes_ar,
      worked_example: r.worked_example,
      band_tip_ar: r.band_tip_ar,
    })
    .eq('question_type', r.question_type)
  if (error) { console.log(`  ✗ ${r.question_type}: ${error.message}`); continue }
  console.log(`  ✓ ${r.question_type}`)
  ok++
}
console.log(`\nUpdated ${ok}/${rows.length}`)
