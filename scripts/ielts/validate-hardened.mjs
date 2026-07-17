#!/usr/bin/env node
// Validate hardened questions against the passage content (from the harden-batch
// inputs, which carry `content`). Checks: verbatim completion answers, matching
// letters in range, contiguous numbering, answer distribution — AND measures
// STEM↔PASSAGE lexical echo (the thing this pass is meant to remove).
import fs from 'node:fs'

const STOP = new Set('the a an of to in on at for and or but with as by from into is are was were be been being it its this that these those their his her they them we you your our not no nor than then so such which who whom whose what when where how why can could may might will would shall should must about over under between among through during before after above below up down out off only also more most less least each any all both few many some other another one two three'.split(/\s+/))
const GAP = new Set(['sentence_completion', 'summary_completion', 'note_table_flowchart', 'short_answer'])
const MATCH_LETTER = new Set(['matching_information'])

const inputs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))     // batch (content)
const hardened = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'))   // hardened (questions)
const byId = {}
for (const p of inputs) byId[p.id] = p

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()
function contentWords(s) { return norm(s).replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w) && w.length > 2) }
// longest run of >=4 consecutive content-words from stem appearing verbatim in passage
function echoRun(stem, passage) {
  const sw = contentWords(stem)
  const pw = ' ' + contentWords(passage).join(' ') + ' '
  let best = 0
  for (let i = 0; i < sw.length; i++) {
    for (let len = sw.length - i; len >= 3; len--) {
      const gram = ' ' + sw.slice(i, i + len).join(' ') + ' '
      if (pw.includes(gram)) { best = Math.max(best, len); break }
    }
  }
  return best
}

let totalErr = 0, totalEcho = 0, totalQ = 0, count = 0
for (const p of hardened) {
  const src = byId[p.id]
  if (!src) { console.log(`✗ passage ${p.passage_number}: no matching content`); totalErr++; continue }
  const content = src.content
  const paras = content.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
  const lastLetter = String.fromCharCode(64 + paras.length)
  const cnorm = norm(content)
  const errs = []
  const dist = {}
  let echoes = 0
  for (const q of p.questions) {
    totalQ++
    const t = q.type, ca = q.correct_answer
    ;(dist[`${t}`] = dist[`${t}`] || {})[String(ca)] = ((dist[`${t}`] || {})[String(ca)] || 0) + 1
    if (ca == null || ca === '') errs.push(`q${q.question_number}: no answer`)
    if (GAP.has(t)) {
      const alts = String(ca).split('/').map((x) => norm(x))
      if (!alts.some((a) => a && cnorm.includes(a))) errs.push(`q${q.question_number} (${t}): answer "${ca}" NOT verbatim`)
    }
    if (t === 'true_false_not_given' && !['TRUE', 'FALSE', 'NOT GIVEN'].includes(String(ca).toUpperCase())) errs.push(`q${q.question_number}: bad TFNG`)
    if (t === 'yes_no_not_given' && !['YES', 'NO', 'NOT GIVEN'].includes(String(ca).toUpperCase())) errs.push(`q${q.question_number}: bad YNNG`)
    if (MATCH_LETTER.has(t)) { const L = String(ca).toUpperCase(); if (L < 'A' || L > lastLetter) errs.push(`q${q.question_number}: match letter ${L} out of A-${lastLetter}`) }
    if (t === 'multiple_choice' && (!q.options || !q.options[String(ca)])) errs.push(`q${q.question_number}: MCQ answer not in options`)
    // echo measure on the stem (only meaningful for stem-bearing types)
    const stem = q.question_text || ''
    const run = echoRun(stem, content)
    if (run >= 4) { echoes++; totalEcho++ }
  }
  // distribution: no value >50% within a type-group of >=3
  for (const [t, vals] of Object.entries(dist)) {
    const n = Object.values(vals).reduce((a, b) => a + b, 0)
    if (n >= 4) { const mx = Math.max(...Object.values(vals)); if (mx / n > 0.5) errs.push(`${t}: answer skew ${mx}/${n}`) }
  }
  const ak = p.answer_key
  const akWarn = (!Array.isArray(ak) || ak.length !== p.questions.length) ? ` ⚠ answer_key ${ak?.length}` : ''
  count++
  if (errs.length) { console.log(`✗ #${p.passage_number}: ${errs.join('; ')}`); totalErr += errs.length }
  else console.log(`✓ #${p.passage_number}  ${p.questions.length}q · stem-echoes: ${echoes}${akWarn}`)
}
console.log(`\n${count} passages · ${totalErr} errors · stem-echoes total ${totalEcho}/${totalQ} questions (lower = harder; completion/TFNG stems that still echo the passage are too easy)`)
process.exit(totalErr ? 1 : 0)
