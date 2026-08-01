/**
 * Pure IELTS grading helpers — no React, no Supabase.
 * Handles the actual data shapes found in ielts_reading_passages:
 *   - questions: array of {question_number, question_text|statement, options?, correct_answer}
 *   - answer_key: array of {question_number, correct_answer, explanation}
 */

// IELTS band conversion table (scales proportionally for < 40 questions)
export function scoreToBand(correct, total) {
  if (!total || total <= 0) return null
  const scaled = Math.round((correct / total) * 40)
  const table = [
    [39, 9.0], [37, 8.5], [35, 8.0], [33, 7.5], [30, 7.0],
    [27, 6.5], [23, 6.0], [19, 5.5], [15, 5.0], [13, 4.5],
    [10, 4.0], [8, 3.5], [6, 3.0], [4, 2.5], [0, 2.0],
  ]
  for (const [threshold, band] of table) {
    if (scaled >= threshold) return band
  }
  return 2.0
}

export function roundToHalf(n) {
  return Math.round(n * 2) / 2
}

/**
 * Stable per-question storage key. MUST be unique within a section so answers
 * never collapse into one shared slot. Prefers the question's own number, then
 * question_number, then its stable id, and finally the array index as a last
 * resort. Some sections (older AI-generated ones) ship `number: null` on every
 * question, so keying by `number` alone silently merges all answers — that is
 * the bug this guards against. Aligns with how `answer_key` is keyed for every
 * section shape (numeric "1".."10" or id "dl1".."dl10").
 */
export function questionKey(q, idx) {
  return String(q?.number ?? q?.question_number ?? q?.id ?? idx)
}

/**
 * The number shown to the student (badge + palette + scroll anchor). Falls back
 * to the 1-based position when the question carries no number, so a malformed
 * section still reads 1…N instead of "null".
 */
export function questionDisplayNumber(q, idx) {
  return q?.number ?? q?.question_number ?? (idx + 1)
}

function normalizeAnswer(v) {
  return String(v ?? '').trim().toLowerCase()
}

// Punctuation-insensitive form used only as a LAST comparison step. Kept
// deliberately narrow: it collapses spacing and drops full stops/commas so
// "8 p.m." and "8pm" agree, but it never trims or fuzzy-matches words, so
// "Wednesday" still fails against "Wednesdays" and "Park lanen" still fails
// against "Park Lane" — both of which are genuinely wrong in IELTS.
function looseAnswer(v) {
  return normalizeAnswer(v).replace(/[.,]/g, '').replace(/\s+/g, ' ').trim()
}

// IELTS answer keys mark OPTIONAL words with parentheses and alternatives with
// slashes, often nested: "3(rd) (of) September 1995", "6:30 (p.m./pm/in the
// evening)". Expand a key into every string it actually licenses.
//
// This was a real scoring bug, not a nicety. The old code split the WHOLE string
// on "/" before looking at parentheses, so "6:30 (p.m./pm/in the evening)" became
// "6:30 (p.m." · "pm" · "in the evening)" — three fragments that no correct answer
// can ever equal. 23 of 250 listening keys (9.2%) carry parentheses, and every
// one of them was unmatchable: a student writing exactly the keyed answer was
// marked wrong. Recovered from real sessions — "3rd of September 1995" scored
// zero against "3(rd) (of) September 1995".
function expandKey(key) {
  const parts = String(key).split(/(\([^()]*\))/)
  let out = ['']
  for (const part of parts) {
    if (!part) continue
    if (part.startsWith('(') && part.endsWith(')')) {
      // optional group: omit it, or use any of its slash alternatives
      const alts = part.slice(1, -1).split('/').map(a => a.trim())
      out = out.flatMap(prefix => ['', ...alts].map(a => prefix + a))
    } else if (part.includes('/')) {
      // alternatives outside parentheses: "third/3rd"
      const alts = part.split('/').map(a => a.trim())
      out = out.flatMap(prefix => alts.map(a => prefix + a))
    } else {
      out = out.map(prefix => prefix + part)
    }
    if (out.length > 64) out = out.slice(0, 64) // pathological keys: stay bounded
  }
  return out
}

function answersMatch(given, expected) {
  if (given == null || expected == null) return false
  if (Array.isArray(expected)) {
    return expected.some(e => answersMatch(given, e))
  }
  const expectedStr = String(expected)
  // Expand parentheses and slashes together, then compare against every licensed
  // form. Handles them in one pass so "/" inside "( )" is treated as an
  // alternative within that optional group rather than cutting the key apart.
  if (expectedStr.includes('(') || expectedStr.includes('/')) {
    const variants = expandKey(expectedStr)
    if (variants.length > 1 || expectedStr.includes('(')) {
      const g = normalizeAnswer(given)
      const gl = looseAnswer(given)
      return variants.some((v) => {
        const nv = normalizeAnswer(v)
        return nv.length > 0 && (g === nv || gl === looseAnswer(v))
      })
    }
  }
  // T/F/NG flexible matching
  const tfMap = {
    t: 'true', f: 'false', 'ng': 'not given',
    true: 'true', false: 'false', 'not given': 'not given',
    yes: 'yes', no: 'no',
  }
  const normGiven = normalizeAnswer(given)
  const normExpected = normalizeAnswer(expectedStr)
  const mappedGiven = tfMap[normGiven] ?? normGiven
  const mappedExpected = tfMap[normExpected] ?? normExpected
  return mappedGiven === mappedExpected
}

// ── Why the answer was wrong ─────────────────────────────────────────────────
// Reading mistakes are not really "I got Matching Headings wrong" — they are one
// of four failures, and each one points at a different drill. Knowing the TYPE
// tells a student nothing actionable; knowing the CAUSE tells them exactly what
// to practise next. These are heuristics over what we can actually observe
// (the answer given, the answer expected, how long it took, whether the clock
// ran out) — deliberately conservative, and always overridable by a trainer.
const TYPE_FAMILY = {
  true_false_not_given: 'judge',
  yes_no_not_given: 'judge',
  multiple_choice: 'judge',
  matching_information: 'locate',
  matching_headings: 'locate',
  matching_features: 'locate',
  matching_sentence_endings: 'locate',
  sentence_completion: 'complete',
  summary_completion: 'complete',
  note_table_flowchart: 'complete',
  diagram_label: 'complete',
  short_answer: 'complete',
}

const isNotGiven = (v) => /not\s*given|^ng$/i.test(String(v ?? '').trim())

/**
 * @returns 'paraphrase_trap' | 'not_located' | 'misread' | 'ran_out_of_time'
 */
export function classifyCause({ given, expected, type, secs, timedOut }) {
  const blank = given == null || String(given).trim() === ''
  // A blank is only "ran out of time" if the clock actually expired; otherwise
  // the student reached it and could not find the answer.
  if (blank) return timedOut ? 'ran_out_of_time' : 'not_located'
  // Answered in under six seconds is a guess, not a read — that is time pressure.
  if (secs != null && secs < 6) return 'ran_out_of_time'

  // A distractor in a multiple choice is engineered to echo the passage's words.
  if (type === 'multiple_choice') return 'paraphrase_trap'

  if (TYPE_FAMILY[type] === 'judge') {
    // TRUE↔FALSE swap: the claim was found and its polarity read backwards.
    if (!isNotGiven(given) && !isNotGiven(expected)) return 'misread'
    // Anything involving NOT GIVEN: surface words were matched to a claim the
    // passage never actually made (or a real paraphrase was not recognised).
    return 'paraphrase_trap'
  }

  // locate family: the wrong option was chosen because it looked similar.
  if (TYPE_FAMILY[type] === 'locate') return 'paraphrase_trap'

  // complete family is copy-from-text — a wrong word means the wrong place.
  return 'not_located'
}

/**
 * Grade a set of student answers against a passage.
 *
 * Actual shapes:
 *   questions: [{question_number, question_text|statement, options?, correct_answer}]
 *   answerKey: [{question_number, correct_answer, explanation}]
 *   studentAnswers: { "1": "B", "2": "True", ... }  (string keys from UI state)
 *
 * Returns:
 *   { correct, total, band, perQuestion: [{qNum, isCorrect, given, expected, explanation, text, type, secs, cause}] }
 *
 * `type`, `secs` and `cause` are what the reading ladder is built on — the
 * per-type heatmap and the cause diagnosis both read them straight back out of
 * session_data, so every graded question must carry them. `secondsByKey` is
 * optional: pass { [question_number]: seconds } to record per-question timing;
 * `timedOut` marks a session whose clock actually expired.
 */
export function gradeQuestions({ questions, answerKey, studentAnswers, secondsByKey, timedOut }) {
  // Build lookup: question_number → {correct_answer, explanation}
  const keyLookup = {}
  if (Array.isArray(answerKey)) {
    for (const entry of answerKey) {
      const num = entry.question_number ?? entry.q_number
      if (num != null) keyLookup[String(num)] = entry
    }
  } else if (answerKey && typeof answerKey === 'object') {
    for (const [k, v] of Object.entries(answerKey)) {
      keyLookup[String(k)] = typeof v === 'object' ? v : { correct_answer: v }
    }
  }

  const qList = Array.isArray(questions) ? questions : []
  let correct = 0
  const perQuestion = []

  qList.forEach((q, idx) => {
    const qKey = questionKey(q, idx)
    const qNum = questionDisplayNumber(q, idx)
    const keyEntry = keyLookup[qKey] || {}
    const expected = keyEntry.correct_answer ?? q.correct_answer ?? q.correct
    const explanation = keyEntry.explanation ?? q.explanation ?? ''
    const text = q.question_text || q.statement || q.text || q.question || `Question ${qNum}`
    const given = studentAnswers?.[qKey]
    const isCorrect = answersMatch(given, expected)
    const type = q.type || q.question_type || null
    const secs = secondsByKey?.[qKey] ?? secondsByKey?.[qNum] ?? null

    if (isCorrect) correct++
    perQuestion.push({
      qNum, isCorrect, given, expected, explanation, text, options: q.options,
      type, secs,
      cause: isCorrect ? null : classifyCause({ given, expected, type, secs, timedOut }),
    })
  })

  return {
    correct,
    total: qList.length,
    band: scoreToBand(correct, qList.length),
    perQuestion,
  }
}
