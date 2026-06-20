#!/usr/bin/env node
/*
 * fix-answer-length-bias.cjs  (v2 — randomized length targets)
 * ---------------------------------------------------------------------------
 * Problem: in the reading (curriculum_comprehension_questions) and listening
 * (curriculum_listening.exercises) MCQ banks the CORRECT answer was reliably
 * the LONGEST option, so students gamed it by always picking the longest.
 *
 * Fix: make answer LENGTH statistically uninformative. Each question is given a
 * deterministic random target for where the correct answer should fall in the
 * length ordering — 25% longest, 25% shortest, 50% middle — and the three WRONG
 * options (distractors) are rewritten to realise that target while staying
 * plausibly wrong per the source text. The correct answer's text/index is NEVER
 * changed, so grading + already-completed student scores are untouched.
 *   - reading grades by text match (client shuffles order) -> safe
 *   - listening grades by correct_answer_index (correct kept in place) -> safe
 *
 * Short factual answers (< 25 chars: dates, numbers, single words) are left
 * alone — length carries no signal there.
 *
 * Full snapshot for restore: public.qa_distractor_backup_20260620.
 *
 * Usage:
 *   node scripts/fix-answer-length-bias.cjs --reading --listening [--limit N] [--dry]
 */
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')
const fs = require('fs')

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY })
const MODEL = 'claude-sonnet-4-6'

const args = process.argv.slice(2)
const has = (f) => args.includes(f)
const getNum = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? parseInt(args[i + 1], 10) : d }
const LIMIT = getNum('--limit', Infinity)
const DRY = has('--dry')
const DECLUMP = has('--declump') // only re-cluster questions where correct is conspicuously longest by accident
const CONCURRENCY = getNum('--concurrency', 6)
const MIN_LEN_FOR_RANK = 25 // below this, leave the question alone

const len = (s) => (typeof s === 'string' ? s.trim().length : 0)
const norm = (s) => (typeof s === 'string' ? s.toLowerCase().trim() : '')
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

// deterministic hash (djb2) -> target rank for the correct answer
function targetFor(id) {
  let h = 5381; for (let i = 0; i < id.length; i++) h = ((h << 5) + h + id.charCodeAt(i)) >>> 0
  const r = h % 4
  if (r === 0) return 'longest'   // 25%
  if (r === 1) return 'shortest'  // 25%
  return 'middle'                 // 50%
}

function satisfiesTarget(correct, distractors, target) {
  const cl = len(correct); const ls = distractors.map(len)
  if (target === 'longest') return ls.every((l) => l < cl)
  if (target === 'shortest') return ls.every((l) => l > cl)
  if (target === 'cluster') {
    // all distractors near correct's length; at least one nearly as long -> correct not conspicuously longest
    return Math.max(...ls) >= cl * 0.9 && ls.every((l) => l >= cl * 0.55 && l <= cl * 1.45)
  }
  // middle: at least one shorter and one longer
  return ls.some((l) => l < cl) && ls.some((l) => l > cl)
}

function validate(correct, distractors, nNeeded, target) {
  if (!Array.isArray(distractors) || distractors.length !== nNeeded) return 'wrong count'
  const cleaned = distractors.map((d) => (typeof d === 'string' ? d.trim() : ''))
  if (cleaned.some((d) => !d)) return 'empty distractor'
  const set = new Set(cleaned.map(norm))
  if (set.size !== cleaned.length) return 'duplicate distractors'
  if (set.has(norm(correct))) return 'distractor equals correct'
  if (cleaned.some((d) => len(d) < 3)) return 'degenerate distractor'
  if (!satisfiesTarget(correct, cleaned, target)) return `target ${target} not met`
  return null
}

const LOG = `scripts/.length-bias-progress.log`
const log = (m) => { const line = `[${new Date().toISOString()}] ${m}`; console.log(line); fs.appendFileSync(LOG, line + '\n') }

function passageText(pc) {
  if (!pc) return ''
  if (typeof pc === 'string') return pc
  if (Array.isArray(pc)) return pc.map((p) => (typeof p === 'string' ? p : p?.text || '')).join('\n\n')
  if (Array.isArray(pc.paragraphs)) return pc.paragraphs.map((p) => (typeof p === 'string' ? p : p?.text || p?.content || '')).join('\n\n')
  return JSON.stringify(pc).slice(0, 4000)
}

const TARGET_INSTRUCTION = {
  longest: 'ALL of its distractors must be clearly SHORTER than the correct answer (noticeably fewer words).',
  shortest: 'ALL of its distractors must be clearly LONGER than the correct answer (noticeably more words).',
  middle: 'Its distractors must VARY in length: at least one clearly SHORTER than the correct answer and at least one clearly LONGER, so the correct answer falls in the MIDDLE of the length range.',
  cluster: 'Make ALL distractors very close in length to the correct answer (within about 12% of its length), with at least one distractor essentially as long as the correct answer. No option may stand out as clearly the longest — the four options should look uniform in length.',
}

async function rewriteGroup(sourceLabel, sourceText, items) {
  // items: [{ key, question, correct, n_distractors, target }]
  const SYSTEM = `You are an expert ESL test-item writer fixing flawed multiple-choice distractors.
A flaw was found: the correct option was almost always the LONGEST, letting students cheat by length. You will rewrite ONLY the incorrect options (distractors). Rules — follow ALL strictly:
1. Each distractor MUST be clearly WRONG according to the ${sourceLabel}. Never write anything actually true; never write two options meaning the same thing.
2. LENGTH TARGET (critical): each question has a "target" telling you how long the distractors must be RELATIVE TO the correct answer. Obey it exactly:
   - "longest"  -> ${TARGET_INSTRUCTION.longest}
   - "shortest" -> ${TARGET_INSTRUCTION.shortest}
   - "middle"   -> ${TARGET_INSTRUCTION.middle}
3. Keep distractors plausible and tempting — a believable misreading, a true-sounding but unsupported claim, a swapped detail, or a common misconception. Use natural, grammatical English.
4. Distractors must be distinct from each other and from the correct answer.
5. Write in the SAME language as the options (English). Output only the option text — no quotes, letters, or labels.
Return the rewritten distractors via the submit_distractors tool. Provide exactly the requested number per question.`

  const userItems = items.map((it) => ({ key: it.key, question: it.question, correct_answer: it.correct, correct_answer_length_chars: len(it.correct), number_of_distractors_needed: it.n_distractors, target: it.target }))
  const user = `${sourceLabel.toUpperCase()} TEXT:\n"""\n${sourceText.slice(0, 6000)}\n"""\n\nQuestions to fix (rewrite distractors only, obey each target):\n${JSON.stringify(userItems, null, 2)}`

  const tool = {
    name: 'submit_distractors',
    description: 'Submit the rewritten distractors for each question.',
    input_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, distractors: { type: 'array', items: { type: 'string' } } }, required: ['key', 'distractors'] } } }, required: ['items'] },
  }
  const msg = await anthropic.messages.create({ model: MODEL, max_tokens: 3000, temperature: 0.7, system: SYSTEM, messages: [{ role: 'user', content: user }], tools: [tool], tool_choice: { type: 'tool', name: 'submit_distractors' } })
  const block = (msg.content || []).find((b) => b.type === 'tool_use')
  if (!block) throw new Error('no tool_use in reply')
  const byKey = {}; for (const r of block.input.items || []) byKey[String(r.key)] = r.distractors
  return byKey
}

async function runPool(items, n, fn) { let i = 0; const w = Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const idx = i++; await fn(items[idx]) } }); await Promise.all(w) }

// ── READING ────────────────────────────────────────────────────────────────
async function fixReading() {
  log('READING: loading…')
  const { data: qs, error } = await sb.from('curriculum_comprehension_questions').select('id, reading_id, question_en, choices, correct_answer')
  if (error) throw error
  const byReading = {}; let toFix = 0
  for (const q of qs) {
    if (!Array.isArray(q.choices) || q.choices.length < 3 || !q.correct_answer) continue
    if (!q.choices.some((c) => norm(c) === norm(q.correct_answer))) continue
    if (len(q.correct_answer) < MIN_LEN_FOR_RANK) continue // leave short answers alone
    const distractors = q.choices.filter((c) => norm(c) !== norm(q.correct_answer))
    let target
    if (DECLUMP) {
      // only fix accidental conspicuous-longest (preserve the intended ~25% 'longest')
      const maxD = Math.max(...distractors.map(len))
      const conspicuous = len(q.correct_answer) > maxD * 1.15
      if (!conspicuous || targetFor(q.id) === 'longest') continue
      target = 'cluster'
    } else {
      target = targetFor(q.id)
      if (satisfiesTarget(q.correct_answer, distractors, target)) continue // already correct rank
    }
    ;(byReading[q.reading_id] ||= []).push({ ...q, _target: target, _distractors: distractors })
    toFix++
  }
  const rids = Object.keys(byReading).slice(0, LIMIT)
  log(`READING: ${toFix} questions to rebalance across ${Object.keys(byReading).length} readings; processing ${rids.length}`)
  const { data: readings } = await sb.from('curriculum_readings').select('id, passage_content').in('id', rids)
  const pmap = {}; for (const r of readings || []) pmap[r.id] = passageText(r.passage_content)

  let fixed = 0, skipped = 0, done = 0
  await runPool(rids, CONCURRENCY, async (rid) => {
    const group = byReading[rid]
    const buildItems = (gs) => gs.map((q) => ({ key: q.id, question: q.question_en, correct: q.correct_answer, n_distractors: q.choices.length - 1, target: q._target }))
    const apply = async (gs) => {
      let res = {}
      try { res = await rewriteGroup('passage', pmap[rid] || '', buildItems(gs)) } catch (e) { log(`  reading ${rid}: ${e.message}`); skipped += gs.length; return [] }
      const ok = [], retry = []
      for (const q of gs) { const d = res[q.id]; const err = validate(q.correct_answer, d || [], q.choices.length - 1, q._target); if (err) retry.push(q); else ok.push({ q, d: d.map((x) => x.trim()) }) }
      return [ok, retry]
    }
    let [ok, retry] = await apply(group)
    if (retry && retry.length) { const [ok2] = await apply(retry); ok = ok.concat(ok2 || []); skipped += retry.length - (ok2 ? ok2.length : 0) }
    for (const { q, d } of ok) {
      const newChoices = shuffle([q.correct_answer, ...d])
      if (DRY) { log(`  [DRY ${q._target}] ${q.id}`); fixed++; continue }
      const { error: ue } = await sb.from('curriculum_comprehension_questions').update({ choices: newChoices }).eq('id', q.id)
      if (ue) { log(`  reading ${q.id} WRITE FAIL ${ue.message}`); skipped++ } else fixed++
    }
    if (++done % 15 === 0) log(`READING progress ${done}/${rids.length}: ${fixed} fixed, ${skipped} skipped`)
  })
  log(`READING DONE: ${fixed} fixed, ${skipped} skipped`)
}

// ── LISTENING ────────────────────────────────────────────────────────────
async function fixListening() {
  log('LISTENING: loading…')
  const { data: rows, error } = await sb.from('curriculum_listening').select('id, transcript, exercises').not('exercises', 'is', null)
  if (error) throw error
  const targets = []; let toFix = 0
  for (const row of rows) {
    if (!Array.isArray(row.exercises)) continue
    const idxs = []
    row.exercises.forEach((ex, idx) => {
      if (ex?.type !== 'mcq' || !Array.isArray(ex.options) || ex.options.length < 3) return
      const ci = ex.correct_answer_index
      if (typeof ci !== 'number' || ci < 0 || ci >= ex.options.length) return
      const correct = ex.options[ci]
      if (len(correct) < MIN_LEN_FOR_RANK) return
      const distractors = ex.options.filter((_, i) => i !== ci)
      let target
      if (DECLUMP) {
        const maxD = Math.max(...distractors.map(len))
        const conspicuous = len(correct) > maxD * 1.15
        if (!conspicuous || targetFor(`${row.id}:${idx}`) === 'longest') return
        target = 'cluster'
      } else {
        target = targetFor(`${row.id}:${idx}`)
        if (satisfiesTarget(correct, distractors, target)) return
      }
      idxs.push({ idx, target }); toFix++
    })
    if (idxs.length) targets.push({ row, idxs })
  }
  const slice = targets.slice(0, LIMIT)
  log(`LISTENING: ${toFix} exercises to rebalance across ${targets.length} rows; processing ${slice.length}`)
  let fixed = 0, skipped = 0, done = 0
  await runPool(slice, CONCURRENCY, async ({ row, idxs }) => {
    const items = idxs.map(({ idx, target }) => { const ex = row.exercises[idx]; const ci = ex.correct_answer_index; return { key: String(idx), question: ex.question_en, correct: ex.options[ci], n_distractors: ex.options.length - 1, target } })
    let res = {}
    try { res = await rewriteGroup('audio transcript', row.transcript || '', items) } catch (e) { log(`  listening ${row.id}: ${e.message}`); skipped += idxs.length; done++; return }
    const newEx = row.exercises.map((e) => ({ ...e })); let changed = false
    const applyOne = (idx, d) => { const ex = newEx[idx]; const ci = ex.correct_answer_index; const correct = ex.options[ci]; let di = 0; ex.options = ex.options.map((_, i) => (i === ci ? correct : d[di++])); changed = true }
    const retry = []
    for (const { idx, target } of idxs) { const ex = row.exercises[idx]; const ci = ex.correct_answer_index; const d = res[String(idx)]; const err = validate(ex.options[ci], d || [], ex.options.length - 1, target); if (err) { retry.push({ idx, target }); continue } applyOne(idx, d.map((x) => x.trim())); fixed++ }
    if (retry.length) {
      try {
        const r2items = retry.map(({ idx, target }) => { const ex = row.exercises[idx]; const ci = ex.correct_answer_index; return { key: String(idx), question: ex.question_en, correct: ex.options[ci], n_distractors: ex.options.length - 1, target } })
        const r2 = await rewriteGroup('audio transcript', row.transcript || '', r2items)
        for (const { idx, target } of retry) { const ex = row.exercises[idx]; const ci = ex.correct_answer_index; const d = r2[String(idx)]; const err = validate(ex.options[ci], d || [], ex.options.length - 1, target); if (err) { log(`  listening ${row.id}[${idx}] SKIP (${err})`); skipped++; continue } applyOne(idx, d.map((x) => x.trim())); fixed++ }
      } catch (e) { log(`  listening ${row.id} retry ${e.message}`); skipped += retry.length }
    }
    if (changed && !DRY) { const { error: ue } = await sb.from('curriculum_listening').update({ exercises: newEx }).eq('id', row.id); if (ue) log(`  listening ${row.id} WRITE FAIL ${ue.message}`) }
    if (++done % 15 === 0) log(`LISTENING progress ${done}/${slice.length}: ${fixed} fixed, ${skipped} skipped`)
  })
  log(`LISTENING DONE: ${fixed} fixed, ${skipped} skipped`)
}

async function main() {
  fs.writeFileSync(LOG, '')
  if (has('--reading')) await fixReading()
  if (has('--listening')) await fixListening()
  if (!has('--reading') && !has('--listening')) { await fixReading(); await fixListening() }
  log('ALL DONE')
}
main().catch((e) => { console.error(e); process.exit(1) })
