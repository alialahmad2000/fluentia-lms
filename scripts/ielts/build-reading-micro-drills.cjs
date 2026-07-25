#!/usr/bin/env node
/**
 * Build the IELTS reading micro-drill bank (Ali 2026-07-25).
 *
 *   scan       القنص             — derived from real published passages
 *   gist       صيد الفكرة        — derived from real matching-headings questions
 *   paraphrase رادار إعادة الصياغة — hand-authored (seeds/ielts/micro-drills-authored.json)
 *   qualifier  الكلمات المحدِّدة  — hand-authored
 *
 * Derivation is deliberately CONSERVATIVE: a drill whose "correct" answer is
 * wrong is worse than no drill at all, so anything that cannot be verified
 * mechanically (target appears exactly once / paragraph label maps 1:1 to a
 * heading question) is skipped rather than guessed.
 *
 * Idempotent: wipes and rebuilds the derived kinds, upserts the authored ones.
 * Usage:  node scripts/ielts/build-reading-micro-drills.cjs [--dry]
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const DRY = process.argv.includes('--dry')
const MGMT = path.join(__dirname, '..', '_mgmt-query.cjs')

function sql(query) {
  let out
  try {
    out = execFileSync('node', [MGMT, '-'], { input: query, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  } catch (e) {
    // The Management API answers oversized statements with an HTML error page,
    // which is invisible if we swallow it. Surface enough to act on.
    const body = String(e.stdout || '') + String(e.stderr || '')
    const hint = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)
    throw new Error(`mgmt query failed (${query.length} bytes): ${hint || e.message}`)
  }
  const start = out.indexOf('[')
  if (start === -1) return []
  try { return JSON.parse(out.slice(start)) } catch { return [] }
}

const lit = (v) => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`
const jlit = (o) => `${lit(JSON.stringify(o))}::jsonb`

// ── helpers ─────────────────────────────────────────────────────────────────
const words = (s) => s.trim().split(/\s+/).filter(Boolean)

function paragraphsOf(content) {
  return String(content || '').split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 40)
}

/** Pull an excerpt of ~150-260 words made of whole paragraphs. */
function excerptFrom(paras, startIdx) {
  const out = []
  let n = 0
  for (let i = startIdx; i < paras.length && n < 150; i++) {
    out.push(paras[i]); n += words(paras[i]).length
    if (n > 260) break
  }
  const text = out.join('\n\n')
  return words(text).length >= 90 ? text : null
}

/**
 * Find a target string that occurs EXACTLY ONCE in the excerpt. Numbers first —
 * they are what a real scan question asks for and uniqueness is verifiable.
 */
function pickScanTarget(text) {
  const once = (t) => t && text.split(t).length - 1 === 1
  const tries = [
    { re: /\b\d{1,3}(?:,\d{3})+\b/g, kind: 'رقم' },                        // 6,400
    { re: /\b\d+(?:\.\d+)?\s?(?:%|per cent)\b/g, kind: 'نسبة' },            // 12%
    { re: /\b(?:1[0-9]{3}|20[0-2][0-9])\b/g, kind: 'سنة' },                 // 1867
    { re: /\b\d+(?:\.\d+)?\s?(?:km|kg|cm|mm|metres|kilometres|tonnes|hectares)\b/gi, kind: 'قياس' },
    { re: /(?<=[a-z,]\s)\b[A-Z][a-z]{4,}(?:\s[A-Z][a-z]{3,})?\b/g, kind: 'اسم عَلَم' },
  ]
  for (const { re, kind } of tries) {
    const hits = [...new Set((text.match(re) || []))]
    const unique = hits.filter(once)
    if (unique.length) {
      // prefer the longest unique hit — least likely to be a substring of another
      unique.sort((a, b) => b.length - a.length)
      return { target: unique[0], kind }
    }
  }
  return null
}

/**
 * Label paragraphs when the passage explicitly marks them A/B/C…
 *
 * Naively matching /^[A-H]\s+/ is WRONG: a paragraph opening "A number of
 * cities…" gets read as label "A" and the drill then shows a sentence with its
 * first word chopped off. Two guards make this safe:
 *   1. the character after the label must be uppercase (kills the article "A")
 *   2. the labels found must form a contiguous run starting at A, ≥3 long
 *      (a real labelled passage is A,B,C,D…; a false positive is not)
 */
function labelledParagraphs(content) {
  const map = {}
  for (const p of paragraphsOf(content)) {
    const m = p.match(/^([A-H])[.)]?\s+([A-Z].{40,})$/s)
    if (m) map[m[1]] = m[2].trim()
  }
  const keys = Object.keys(map).sort()
  const expected = keys.map((_, i) => String.fromCharCode(65 + i))
  const contiguousFromA = keys.length >= 3 && keys.every((k, i) => k === expected[i])
  return contiguousFromA ? map : {}
}

function shuffleWithSeed(arr, seed) {
  const a = arr.slice()
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── build ───────────────────────────────────────────────────────────────────
console.log('Fetching published passages…')
const passages = sql(`
  select id, title, content, questions
  from ielts_reading_passages
  where is_published and content is not null
  order by passage_number, title;
`)
console.log(`  ${passages.length} passages`)

const rows = []
let skippedScan = 0, skippedGist = 0

// ---- scan: locate a token against a clock. Pure location, zero comprehension.
for (const p of passages) {
  const paras = paragraphsOf(p.content)
  if (paras.length < 2) { skippedScan++; continue }
  // two excerpts per passage: front half and back half
  for (const startIdx of [0, Math.floor(paras.length / 2)]) {
    const text = excerptFrom(paras, startIdx)
    if (!text) { skippedScan++; continue }
    const hit = pickScanTarget(text)
    if (!hit) { skippedScan++; continue }
    rows.push({
      kind: 'scan',
      d: words(text).length > 200 ? 3 : words(text).length > 150 ? 2 : 1,
      payload: { text, target: hit.target, kind_ar: hit.kind, source_title: p.title },
      src: p.id,
    })
  }
}

// ---- gist: 20 seconds on a paragraph, pick its heading. Only where the
//      passage labels its paragraphs, so the mapping is certain rather than assumed.
for (const p of passages) {
  const labels = labelledParagraphs(p.content)
  if (!Object.keys(labels).length) continue
  const qs = (Array.isArray(p.questions) ? p.questions : []).filter((q) => q.type === 'matching_headings')
  for (const q of qs) {
    const m = String(q.question_text || '').match(/Paragraph\s+([A-H])/i)
    if (!m) { skippedGist++; continue }
    const para = labels[m[1].toUpperCase()]
    const opts = q.options && typeof q.options === 'object' ? q.options : null
    const correctKey = String(q.correct_answer || '').trim()
    if (!para || !opts || !opts[correctKey]) { skippedGist++; continue }
    const correctText = String(opts[correctKey])
    const distractors = Object.entries(opts)
      .filter(([k]) => k !== correctKey)
      .map(([, v]) => String(v))
    if (distractors.length < 3) { skippedGist++; continue }
    const seed = para.length + correctText.length
    const chosen = shuffleWithSeed(distractors, seed).slice(0, 3)
    const options = shuffleWithSeed([correctText, ...chosen], seed + 7)
    rows.push({
      kind: 'gist',
      d: words(para).length > 130 ? 3 : 2,
      payload: {
        paragraph: para,
        options,
        answer: options.indexOf(correctText),
        note_ar: 'العنوان الصحيح يلخّص الفقرة كلها — لا يلتقط جملة واحدة منها.',
        source_title: p.title,
      },
      src: p.id,
    })
  }
}

// ---- authored: paraphrase + qualifier
const authored = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'seeds', 'ielts', 'micro-drills-authored.json'), 'utf8'))
for (const it of authored.paraphrase || []) {
  const seed = it.stem.length * 31
  const correctText = it.options[it.answer]
  const options = shuffleWithSeed(it.options, seed)
  rows.push({
    kind: 'paraphrase', d: it.d,
    payload: { stem: it.stem, options, answer: options.indexOf(correctText), note_ar: it.note_ar },
    src: null,
  })
}
for (const it of authored.gist || []) {
  const seed = it.paragraph.length * 17
  const correctText = it.options[it.answer]
  const options = shuffleWithSeed(it.options, seed)
  rows.push({
    kind: 'gist', d: it.d,
    payload: { paragraph: it.paragraph, options, answer: options.indexOf(correctText), note_ar: it.note_ar },
    src: null,
  })
}
for (const it of authored.qualifier || []) {
  rows.push({
    kind: 'qualifier', d: it.d,
    payload: {
      passage: it.passage, claim: it.claim,
      options: ['TRUE', 'FALSE', 'NOT GIVEN'],
      answer: ['TRUE', 'FALSE', 'NOT GIVEN'].indexOf(it.answer),
      focus: it.focus, note_ar: it.note_ar,
    },
    src: null,
  })
}

const byKind = rows.reduce((a, r) => ((a[r.kind] = (a[r.kind] || 0) + 1), a), {})
console.log('\nBuilt:', byKind)
console.log(`Skipped: scan ${skippedScan}, gist ${skippedGist}`)

if (DRY) {
  console.log('\n--dry: nothing written. Sample of each kind:')
  for (const k of ['scan', 'gist', 'paraphrase', 'qualifier']) {
    const s = rows.find((r) => r.kind === k)
    if (s) console.log(`\n[${k}]`, JSON.stringify(s.payload).slice(0, 400))
  }
  process.exit(0)
}

// ---- write (full rebuild — the bank is generated, never hand-edited in place)
console.log('\nRebuilding ielts_micro_drills…')
const values = rows.map((r, i) =>
  `(${lit(r.kind)}, ${r.d}, ${jlit(r.payload)}, ${r.src ? lit(r.src) + '::uuid' : 'NULL'}, ${i})`
)
const CHUNK = 6
sql('delete from ielts_micro_drills;')
for (let i = 0; i < values.length; i += CHUNK) {
  const slice = values.slice(i, i + CHUNK)
  sql(`insert into ielts_micro_drills (drill_kind, difficulty, payload, source_passage_id, sort_order) values ${slice.join(',')};`)
  process.stdout.write(`  ${Math.min(i + CHUNK, values.length)}/${values.length}\r`)
}
const check = sql(`select drill_kind, count(*)::int n from ielts_micro_drills group by drill_kind order by drill_kind;`)
console.log('\n\nIn DB:', check)
