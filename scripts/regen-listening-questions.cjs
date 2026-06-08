// Regenerate listening comprehension questions for every listening task:
//  - 7 questions per task (was 3–5)
//  - varied TYPES: main_idea, detail, inference, vocabulary, speaker_attitude, sequence, cause_effect
//  - 5 DIFFICULTY tiers (1–5) with a real spread + at least one genuinely hard (5) question
//  - 4 options each, plausible transcript-based distractors, explanation_ar
//  - correct answer position RANDOMIZED + balanced per task (fixes the "always the same option" bug)
// Schema-compatible with ListeningMCQ (options rendered in order, graded by correct_answer_index).
//
// Run: node scripts/regen-listening-questions.cjs [--dry-run] [--limit N]
const { createClient } = require('@supabase/supabase-js')
const Anthropic = require('@anthropic-ai/sdk')
require('dotenv').config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null
const N = 7
const ALLOWED_TYPES = ['main_idea', 'detail', 'inference', 'vocabulary', 'speaker_attitude', 'sequence', 'cause_effect']
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const SYSTEM = `You are an expert ESL listening-comprehension assessment writer for Fluentia Academy (Saudi Arabia). Given an English listening transcript and the learner level, write a RICH set of multiple-choice questions that genuinely test understanding at varied depths.

REQUIREMENTS:
- Write EXACTLY ${N} questions, ordered from EASIEST to HARDEST.
- Each question has EXACTLY 4 options; exactly one is correct. Distractors must be plausible and grounded in the transcript (tempting, not random) — especially for harder questions.
- Vary the TYPE across these values (use at least 5 different ones): main_idea, detail, inference, vocabulary (meaning of a word/phrase as used in the audio), speaker_attitude (a speaker's tone, feeling, opinion or purpose), sequence (order of events), cause_effect.
- Vary DIFFICULTY on a 1–5 scale with a real spread: about 2 easy (1–2), 3 medium (3), 2 hard (4–5). AT LEAST ONE question MUST be difficulty 5 — a deep inference or nuance that is NOT easy to get right, with especially tempting distractors. Match the learner level (a level-1 "hard" is gentler than a level-5 "hard").
- Questions in ENGLISH. "explanation_ar" in clear, warm ARABIC (one sentence on why the correct answer is right).
- Calibrate to the level; do not test trivia that isn't in the audio.

Output ONLY a valid JSON array (no markdown, no prose):
[{"question_en":"...","question_type":"<one of the allowed>","difficulty":1,"options":["...","...","...","..."],"correct_index":0,"explanation_ar":"..."}]`

function extractJSON(t) { const s = t.indexOf('['), e = t.lastIndexOf(']'); if (s === -1 || e === -1) throw new Error('no JSON array'); return JSON.parse(t.slice(s, e + 1)) }

// Balanced, shuffled correct-answer positions over 0..3 for n questions (never uniform).
function balancedPositions(n) {
  const base = []
  for (let i = 0; i < n; i++) base.push(i % 4)
  for (let i = base.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[base[i], base[j]] = [base[j], base[i]] }
  if (base.every((p) => p === base[0])) base[0] = (base[0] + 1) % 4 // guarantee non-uniform
  return base
}
function placeCorrect(options, correctIdx, target) {
  const correct = options[correctIdx]
  const rest = options.filter((_, i) => i !== correctIdx)
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[rest[i], rest[j]] = [rest[j], rest[i]] }
  const out = []; let ri = 0
  for (let i = 0; i < options.length; i++) out.push(i === target ? correct : rest[ri++])
  return out
}

async function genQuestions(row) {
  const user = `Learner level: L${row.level_number} (${row.cefr})
Title: ${row.title_en}
Audio type: ${row.audio_type}
Transcript:
"""
${(row.transcript || '').slice(0, 6000)}
"""
Write the ${N} questions as a JSON array.`
  const msg = await anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 3500, temperature: 0.7, system: SYSTEM, messages: [{ role: 'user', content: user }] })
  const arr = extractJSON(msg.content[0].text)
  if (!Array.isArray(arr) || arr.length < 5) throw new Error(`got ${arr?.length} questions`)
  const positions = balancedPositions(arr.length)
  return arr.map((q, i) => {
    let opts = Array.isArray(q.options) ? q.options.map((o) => String(o)) : []
    if (opts.length !== 4) throw new Error(`q${i} has ${opts.length} options`)
    let ci = Number(q.correct_index)
    if (isNaN(ci) || ci < 0 || ci > 3) throw new Error(`q${i} bad correct_index ${q.correct_index}`)
    const target = positions[i]
    const newOpts = placeCorrect(opts, ci, target)
    const diff = Math.min(5, Math.max(1, parseInt(q.difficulty) || 3))
    const qtype = ALLOWED_TYPES.includes(q.question_type) ? q.question_type : 'detail'
    return { type: 'mcq', question_en: String(q.question_en).trim(), question_type: qtype, difficulty: diff, options: newOpts, correct_answer_index: target, explanation_ar: String(q.explanation_ar || '').trim(), sort_order: i }
  })
}

async function main() {
  const { data: rows, error } = await supabase
    .from('curriculum_listening')
    .select('id, title_en, audio_type, transcript, curriculum_units!inner(curriculum_levels!inner(level_number, cefr))')
    .order('sort_order')
  if (error) throw error
  let list = rows
  if (limit) list = list.slice(0, limit)
  console.log(`Listening questions: ${list.length} tasks${dryRun ? ' (DRY-RUN)' : ''}`)

  let ok = 0, fail = 0
  for (let i = 0; i < list.length; i++) {
    const row = list[i]
    row.level_number = row.curriculum_units?.curriculum_levels?.level_number ?? 1
    row.cefr = row.curriculum_units?.curriculum_levels?.cefr ?? ''
    try {
      const questions = await genQuestions(row)
      const idxDist = questions.map((q) => q.correct_answer_index).join('')
      const diffs = questions.map((q) => q.difficulty).join('')
      const types = [...new Set(questions.map((q) => q.question_type))].length
      console.log(`[${i + 1}/${list.length}] ${row.title_en} — ${questions.length}Q, types=${types}, diff=${diffs}, ansPos=${idxDist}`)
      if (!dryRun) {
        const { data: upd, error: uErr } = await supabase.from('curriculum_listening').update({ exercises: questions }).eq('id', row.id).select('id')
        if (uErr) throw uErr
        if (!upd || upd.length !== 1) throw new Error(`expected 1 update got ${upd?.length}`)
      }
      ok++
      await wait(600)
    } catch (e) { console.error(`[${i + 1}] ${row.title_en} FAIL: ${e.message}`); fail++ }
  }
  console.log(`\nDone${dryRun ? ' (DRY-RUN)' : ''}. ok=${ok} fail=${fail}`)
  if (fail > 0) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })
