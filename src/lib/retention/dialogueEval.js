// dialogueEval — pure rule-based scoring for Module 1 dialogues.
// Same module used both client-side (for instant feedback during play) and
// server-side (mirrored into the edge function for the final attempt eval).

export function evaluateTurn({ studentText, turn }) {
  const text = (studentText || '').toLowerCase().trim()
  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  // 1. Length check
  const meetsLength = wordCount >= (turn.min_words || 1)

  // 2. Vocab hits
  const expectedVocab = (turn.expected_vocab || []).map((v) => v.toLowerCase())
  const vocabHits = expectedVocab.filter((v) => text.includes(v))

  // 3. Response-shape match (very loose heuristic)
  let shapeMatch = true
  if (turn.expected_response_type === 'yes_no') {
    shapeMatch = /\b(yes|yeah|sure|of course|no|not really|nope)\b/.test(text)
  } else if (turn.expected_response_type === 'closing') {
    shapeMatch = /(thank|bye|see you|too)/.test(text)
  }

  // 4. Composite quality
  const vocabScore = expectedVocab.length === 0 ? 1 : vocabHits.length / expectedVocab.length
  const score = meetsLength && shapeMatch ? Math.max(0.3, vocabScore) : Math.max(0, vocabScore * 0.5)

  return {
    wordCount,
    meetsLength,
    shapeMatch,
    vocabHits,
    vocabScore,
    score,
    passed: meetsLength && shapeMatch && score >= 0.3,
  }
}

export function evaluateAttempt({ turns, transcript }) {
  // transcript: [{ turn_id, student_text }]
  const allExpectedVocab = new Set()
  for (const t of turns) for (const v of (t.expected_vocab || [])) allExpectedVocab.add(v.toLowerCase())

  const hits = new Set()
  let totalSeconds = 0
  let completedTurnCount = 0

  for (const entry of transcript || []) {
    const t = turns.find((x) => x.id === entry.turn_id)
    if (!t) continue
    completedTurnCount += 1
    const evalRes = evaluateTurn({ studentText: entry.student_text, turn: t })
    for (const v of evalRes.vocabHits) hits.add(v)
    totalSeconds += entry.duration_seconds || 0
  }

  const vocabTotal = allExpectedVocab.size
  const vocabHitCount = hits.size
  const vocabHitPct = vocabTotal > 0 ? (vocabHitCount / vocabTotal) * 100 : 0
  const completion =
    completedTurnCount >= turns.length ? 'full' :
    completedTurnCount >= Math.ceil(turns.length / 2) ? 'partial' : 'minimal'

  return {
    completion,
    vocab_hit_count: vocabHitCount,
    vocab_hit_pct: Math.round(vocabHitPct * 10) / 10,
    vocab_total: vocabTotal,
    total_speaking_seconds: totalSeconds,
    completed_turn_count: completedTurnCount,
  }
}

export function pickFeedbackTemplate({ templates, attemptEval }) {
  // Most-specific match wins (vocab band + completion match preferred)
  const sortedTemplates = [...(templates || [])].sort((a, b) =>
    Object.keys(b.trigger_condition || {}).length - Object.keys(a.trigger_condition || {}).length
  )
  for (const t of sortedTemplates) {
    if (matchesCondition(t.trigger_condition, attemptEval)) return t
  }
  return null
}

function matchesCondition(cond, ev) {
  if (!cond) return true
  for (const [k, v] of Object.entries(cond)) {
    if (k === 'vocab_hit_pct') {
      const op = v.match(/^(>=|<=|>|<|=)(.+)$/)
      if (!op) continue
      const operator = op[1]
      const val = parseFloat(op[2])
      const got = ev.vocab_hit_pct
      if (operator === '>=' && !(got >= val)) return false
      if (operator === '<=' && !(got <= val)) return false
      if (operator === '>'  && !(got >  val)) return false
      if (operator === '<'  && !(got <  val)) return false
      if (operator === '='  && !(got === val)) return false
    } else if (k === 'completion') {
      if (ev.completion !== v) return false
    }
  }
  return true
}

export function fillTemplate(template_ar, vars = {}) {
  let out = template_ar
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, String(v ?? ''))
  }
  return out
}
