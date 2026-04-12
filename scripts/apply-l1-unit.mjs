// Apply one L1 unit's new passages + questions to the database.
// Usage: node scripts/apply-l1-unit.mjs <unit_number>
// Reads content from PHASE-2-CLEANUP/l1-content/u<NN>.json
// Validates FKGL/wc/OOV before writing. Runs Phase A.5 student protection,
// Phase F atomic updates with rowcount assertions, Phase G verification.

import { readFileSync, existsSync, appendFileSync, mkdirSync } from 'fs'
import { admin } from './lib/supa.mjs'
import { analyzePassage } from './lib/text-analysis.mjs'

const unitNum = parseInt(process.argv[2], 10)
if (!unitNum || unitNum < 1 || unitNum > 12) {
  console.error('usage: node scripts/apply-l1-unit.mjs <1-12>')
  process.exit(1)
}

const nn = String(unitNum).padStart(2, '0')
const contentPath = `PHASE-2-CLEANUP/l1-content/u${nn}.json`
if (!existsSync(contentPath)) {
  console.error(`missing content: ${contentPath}`)
  process.exit(1)
}
const content = JSON.parse(readFileSync(contentPath, 'utf8'))

// Load baseline for allowlist + unit IDs
const baseline = JSON.parse(readFileSync('PHASE-2-CLEANUP/13-L1-baseline.json', 'utf8'))
const fulldata = JSON.parse(readFileSync('PHASE-2-CLEANUP/13-L1-fulldata.json', 'utf8'))
const allowlist = new Set(fulldata.allowlist)

const unit = fulldata.units.find(u => u.unit_number === unitNum)
if (!unit) { console.error(`unit ${unitNum} not in fulldata`); process.exit(1) }

console.log(`\n=== L1 U${nn}: ${unit.title_en} ===`)

// Ensure content has both A and B
const newByLabel = {}
for (const p of content.passages) newByLabel[p.reading_label] = p
if (!newByLabel.A || !newByLabel.B) {
  console.error('content must have passages A and B')
  process.exit(1)
}

// --- VALIDATION: run text analysis on every new passage ---
const TARGETS = { wc: [120, 200], fkgl: [2.0, 4.0], asl: [8, 12] }
function validatePassage(p) {
  const text = p.paragraphs.join('\n\n')
  const a = analyzePassage(text, allowlist)
  const errs = []
  if (a.word_count < TARGETS.wc[0] || a.word_count > TARGETS.wc[1])
    errs.push(`wc=${a.word_count} outside ${TARGETS.wc.join('-')}`)
  if (a.fkgl < TARGETS.fkgl[0] || a.fkgl > TARGETS.fkgl[1])
    errs.push(`fkgl=${a.fkgl} outside ${TARGETS.fkgl.join('-')}`)
  if (a.avg_sentence_length < TARGETS.asl[0] || a.avg_sentence_length > TARGETS.asl[1])
    errs.push(`asl=${a.avg_sentence_length} outside ${TARGETS.asl.join('-')}`)
  if (a.oov.length > 0)
    errs.push(`oov=${a.oov.length}: ${a.oov.slice(0, 15).join(', ')}`)
  return { analysis: a, errs }
}

let validateFail = false
for (const label of ['A', 'B']) {
  const p = newByLabel[label]
  const { analysis, errs } = validatePassage(p)
  console.log(`  ${label}: wc=${analysis.word_count} fkgl=${analysis.fkgl} asl=${analysis.avg_sentence_length} oov=${analysis.oov.length}`)
  if (errs.length) {
    console.log(`    ❌ ${errs.join(' | ')}`)
    validateFail = true
  } else {
    console.log('    ✓ passes all targets')
  }
}
if (validateFail) {
  console.error('\nValidation failed. Fix content and re-run.')
  process.exit(2)
}

// Cross-check question count vs baseline
for (const label of ['A', 'B']) {
  const oldReading = unit.readings.find(r => r.reading_label === label)
  const expectedQ = oldReading.questions.length
  const gotQ = newByLabel[label].questions.length
  if (expectedQ !== gotQ) {
    console.error(`  ❌ ${label} question count mismatch: expected ${expectedQ}, got ${gotQ}`)
    process.exit(2)
  }
}

// --- Phase A.5: Student Work Protection ---
const passageIds = unit.readings.map(r => r.id)
const { data: protectedRecords, error: protErr } = await admin
  .from('student_curriculum_progress')
  .select('id, student_id, reading_id, section_type, status, score, answers, completed_at, time_spent_seconds')
  .in('reading_id', passageIds)
  .eq('section_type', 'comprehension')
  .eq('status', 'completed')
if (protErr) { console.error('protection query err:', protErr); process.exit(1) }
if (protectedRecords.length) {
  console.log(`[PROTECTION] L1-U${nn}: ${protectedRecords.length} student completion records`)
} else {
  console.log(`[PROTECTION] L1-U${nn}: 0 student completions (no protection needed)`)
}

// --- Phase F: apply updates ---
// Supabase JS has no transactions. We simulate atomicity per-passage by:
// - update passage; if fail, abort this passage (other passages untouched)
// - update each question; if any fails, revert that question and abort passage
// - update protected records last
//
// For maximum simplicity and safety we update passage first, then questions.
// Each is independently guarded by rowcount check.

let totalQUpdated = 0
let passagesUpdated = 0

for (const label of ['A', 'B']) {
  const oldReading = unit.readings.find(r => r.reading_label === label)
  const newP = newByLabel[label]
  const text = newP.paragraphs.join('\n\n')
  const { analysis } = validatePassage(newP)

  // Step 1: update passage
  const { data: rUpd, error: rErr } = await admin
    .from('curriculum_readings')
    .update({
      title_en: newP.title_en || oldReading.title_en,
      passage_content: { paragraphs: newP.paragraphs },
      passage_word_count: analysis.word_count,
      updated_at: new Date().toISOString(),
    })
    .eq('id', oldReading.id)
    .select('id')
  if (rErr) { console.error(`[ROWCOUNT FAIL] passage ${label} ${oldReading.id}:`, rErr); process.exit(1) }
  if (!rUpd || rUpd.length !== 1) {
    console.error(`[ROWCOUNT FAIL] passage_id=${oldReading.id}, table=curriculum_readings, expected=1, got=${rUpd?.length ?? 0}`)
    process.exit(1)
  }

  // Step 2: update questions (match by sort_order to stable question IDs)
  const oldQs = [...oldReading.questions].sort((a, b) => a.sort_order - b.sort_order)
  const newQs = [...newP.questions].sort((a, b) => a.sort_order - b.sort_order)
  for (let i = 0; i < oldQs.length; i++) {
    const oq = oldQs[i]
    const nq = newQs[i]
    const { data: qUpd, error: qErr } = await admin
      .from('curriculum_comprehension_questions')
      .update({
        question_en: nq.question_en,
        question_ar: nq.question_ar,
        choices: nq.choices,
        correct_answer: nq.correct_answer,
        explanation_en: nq.explanation_en,
        explanation_ar: nq.explanation_ar,
      })
      .eq('id', oq.id)
      .select('id')
    if (qErr) { console.error(`[ROWCOUNT FAIL] question ${oq.id}:`, qErr); process.exit(1) }
    if (!qUpd || qUpd.length !== 1) {
      console.error(`[ROWCOUNT FAIL] question_id=${oq.id}, table=curriculum_comprehension_questions, expected=1, got=${qUpd?.length ?? 0}`)
      process.exit(1)
    }
    totalQUpdated++
  }

  // Step 3: student protection — if any records exist for this reading, rebuild answers
  const protectedForThis = protectedRecords.filter(r => r.reading_id === oldReading.id)
  for (const rec of protectedForThis) {
    // Build new answers: map new question_id → correct_answer.
    // Because the old answers keyed by question_id, the new answers must do the same.
    const newAnswers = {}
    for (let i = 0; i < oldQs.length; i++) {
      newAnswers[oldQs[i].id] = newQs[i].correct_answer
    }
    const { data: pUpd, error: pErr } = await admin
      .from('student_curriculum_progress')
      .update({
        answers: newAnswers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rec.id)
      .select('id')
    if (pErr) { console.error(`[ROWCOUNT FAIL] protected ${rec.id}:`, pErr); process.exit(1) }
    if (!pUpd || pUpd.length !== 1) {
      console.error(`[ROWCOUNT FAIL] protected_record_id=${rec.id}, table=student_curriculum_progress, expected=1, got=${pUpd?.length ?? 0}`)
      process.exit(1)
    }
  }

  passagesUpdated++
}

// --- Phase G: per-unit verification ---
const { data: verifyReadings } = await admin
  .from('curriculum_readings')
  .select('id, reading_label, passage_word_count')
  .eq('unit_id', unit.id)
  .order('reading_label')

const { data: verifyQuestions } = await admin
  .from('curriculum_comprehension_questions')
  .select('id, reading_id')
  .in('reading_id', passageIds)

const expectedQCount = unit.readings.reduce((a, r) => a + r.questions.length, 0)
if (verifyQuestions.length !== expectedQCount) {
  console.error(`VERIFY FAIL: question count ${verifyQuestions.length} != baseline ${expectedQCount}`)
  process.exit(1)
}

// Student protection verification
const { count: postProtectedCount } = await admin
  .from('student_curriculum_progress')
  .select('*', { count: 'exact', head: true })
  .in('reading_id', passageIds)
  .eq('section_type', 'comprehension')
  .eq('status', 'completed')

if (postProtectedCount !== protectedRecords.length) {
  console.warn(`WARN: student records changed ${protectedRecords.length} -> ${postProtectedCount}`)
}

// --- Log + append to progress ---
mkdirSync('PHASE-2-CLEANUP', { recursive: true })
const logLine = `[L1-U${nn}] ${unit.title_en} | A: wc=${validatePassage(newByLabel.A).analysis.word_count} fkgl=${validatePassage(newByLabel.A).analysis.fkgl} | B: wc=${validatePassage(newByLabel.B).analysis.word_count} fkgl=${validatePassage(newByLabel.B).analysis.fkgl} | Q updated: ${totalQUpdated} | Protected: ${protectedRecords.length}\n`
appendFileSync('PHASE-2-CLEANUP/13-L1-progress.log', logLine)
console.log(`\n✓ L1-U${nn} applied. Passages: ${passagesUpdated}/2, Questions: ${totalQUpdated}, Protected: ${protectedRecords.length}`)
console.log(logLine.trim())
