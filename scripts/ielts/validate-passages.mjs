#!/usr/bin/env node
// Validate upgraded passage JSON before load: word count, question shapes,
// verbatim completion answers, matching letters in range, answer-key parity.
import fs from 'node:fs'

const GAP = new Set(['sentence_completion', 'summary_completion', 'note_table_flowchart', 'short_answer'])
const MATCH_LETTER = new Set(['matching_information'])
const files = process.argv.slice(2)
let allErr = 0, allWarn = 0, count = 0

for (const f of files) {
  const rows = JSON.parse(fs.readFileSync(f, 'utf8'))
  for (const p of rows) {
    count++
    const errs = [], warns = []
    const content = String(p.content || '')
    const wc = content.trim().split(/\s+/).filter(Boolean).length
    const paras = content.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
    const lastLetter = String.fromCharCode(64 + paras.length)
    if (wc < 780 || wc > 1000) warns.push(`words=${wc} (target 850±)`)
    if (paras.length < 5 || paras.length > 9) warns.push(`paras=${paras.length}`)
    const qs = p.questions || []
    if (qs.length < 12 || qs.length > 14) warns.push(`qcount=${qs.length}`)
    // contiguous numbering
    const nums = qs.map((q) => q.question_number)
    for (let i = 0; i < nums.length; i++) if (nums[i] !== i + 1) { errs.push(`q# not contiguous at idx ${i}: ${nums[i]}`); break }
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()
    const cnorm = norm(content)
    for (const q of qs) {
      const t = q.type
      // answer_key parity
      const ca = q.correct_answer
      if (ca == null || ca === '') errs.push(`q${q.question_number}: no correct_answer`)
      if (GAP.has(t)) {
        // verbatim substring (any slash-alt)
        const alts = String(ca).split('/').map((x) => norm(x))
        if (!alts.some((a) => a && cnorm.includes(a))) errs.push(`q${q.question_number} (${t}): answer "${ca}" NOT verbatim in passage`)
      }
      if (t === 'true_false_not_given' && !['TRUE', 'FALSE', 'NOT GIVEN'].includes(String(ca).toUpperCase())) errs.push(`q${q.question_number}: bad TFNG "${ca}"`)
      if (t === 'yes_no_not_given' && !['YES', 'NO', 'NOT GIVEN'].includes(String(ca).toUpperCase())) errs.push(`q${q.question_number}: bad YNNG "${ca}"`)
      if (MATCH_LETTER.has(t)) {
        const L = String(ca).toUpperCase()
        if (L < 'A' || L > lastLetter) errs.push(`q${q.question_number}: matching letter ${L} out of range A-${lastLetter}`)
      }
      if (t === 'multiple_choice' && (!q.options || !q.options[String(ca)])) errs.push(`q${q.question_number}: MCQ answer ${ca} not in options`)
    }
    // answer_key array parity
    const ak = p.answer_key
    if (!Array.isArray(ak) || ak.length !== qs.length) warns.push(`answer_key length ${ak?.length} != ${qs.length}`)
    const tag = `#${p.passage_number} ${String(p.title).slice(0, 34)}`
    if (errs.length) { console.log(`✗ ${tag}\n   ${errs.join('\n   ')}`); allErr += errs.length }
    else console.log(`✓ ${tag}  (${wc}w, ${paras.length}p, ${qs.length}q)${warns.length ? '  ⚠ ' + warns.join('; ') : ''}`)
    allWarn += warns.length
  }
}
console.log(`\n${count} passages · ${allErr} errors · ${allWarn} warnings`)
process.exit(allErr ? 1 : 0)
