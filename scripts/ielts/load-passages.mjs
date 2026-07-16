#!/usr/bin/env node
// Load upgraded reading passages into ielts_reading_passages (UPDATE by id).
// Only touches content/word_count/questions/answer_key/time_limit/title/publish;
// leaves passage_number, topic_category, difficulty_band, test_variant intact.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supa = createClient(URL, KEY, { auth: { persistSession: false } })

const files = process.argv.slice(2)
let ok = 0, fail = 0
for (const f of files) {
  const rows = JSON.parse(fs.readFileSync(f, 'utf8'))
  for (const p of rows) {
    const wc = String(p.content || '').trim().split(/\s+/).filter(Boolean).length
    const { error } = await supa.from('ielts_reading_passages')
      .update({
        title: p.title,
        content: p.content,
        word_count: wc,
        questions: p.questions,
        answer_key: p.answer_key,
        time_limit_minutes: p.time_limit_minutes || 20,
        is_published: true,
      })
      .eq('id', p.id)
    if (error) { console.log(`  ✗ #${p.passage_number} ${String(p.title).slice(0, 34)}: ${error.message}`); fail++; continue }
    console.log(`  ✓ #${p.passage_number} ${String(p.title).slice(0, 40)} (${wc}w, ${p.questions.length}q)`)
    ok++
  }
}
console.log(`\nDone. ok=${ok} fail=${fail}`)
