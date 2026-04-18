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

function normalizeAnswer(v) {
  return String(v ?? '').trim().toLowerCase()
}

function answersMatch(given, expected) {
  if (given == null || expected == null) return false
  if (Array.isArray(expected)) {
    return expected.some(e => normalizeAnswer(given) === normalizeAnswer(e))
  }
  // T/F/NG flexible matching
  const tfMap = {
    t: 'true', f: 'false', 'ng': 'not given',
    true: 'true', false: 'false', 'not given': 'not given',
    yes: 'yes', no: 'no',
  }
  const normGiven = normalizeAnswer(given)
  const normExpected = normalizeAnswer(expected)
  const mappedGiven = tfMap[normGiven] ?? normGiven
  const mappedExpected = tfMap[normExpected] ?? normExpected
  return mappedGiven === mappedExpected
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
 *   { correct, total, band, perQuestion: [{qNum, isCorrect, given, expected, explanation, text}] }
 */
export function gradeQuestions({ questions, answerKey, studentAnswers }) {
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

  for (const q of qList) {
    const qNum = q.question_number ?? q.number ?? q.id
    const qKey = String(qNum)
    const keyEntry = keyLookup[qKey] || {}
    const expected = keyEntry.correct_answer ?? q.correct_answer
    const explanation = keyEntry.explanation ?? q.explanation ?? ''
    const text = q.question_text || q.statement || q.text || `Question ${qNum}`
    const given = studentAnswers?.[qKey]
    const isCorrect = answersMatch(given, expected)

    if (isCorrect) correct++
    perQuestion.push({ qNum, isCorrect, given, expected, explanation, text, options: q.options })
  }

  return {
    correct,
    total: qList.length,
    band: scoreToBand(correct, qList.length),
    perQuestion,
  }
}
