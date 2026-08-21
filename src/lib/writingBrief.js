/**
 * Typesetting for a writing brief.
 *
 * A brief is a task specification, not prose, and it is written to a consistent
 * shape: an optional scenario, the ask, the moves the student has to make, and
 * the language she has to use. Rendered as one paragraph none of that is
 * visible — she has to read all of it to find the four things she is being
 * asked for, and the moves hide inside a comma series:
 *
 *   "Open with a brief thank-you, state the main goal for the quarter, explain
 *    the plan clearly (…), and close with when you will send the full timeline."
 *
 * That is four instructions, not one. This module finds them.
 *
 * It NEVER edits, reorders, hides or invents text. Every character of the input
 * survives in `lead`/`s`/`tail`, and `tests/unit/writingBrief.test.mjs` asserts
 * that re-joining every brief in the database reproduces the original exactly.
 * If that assertion fails, the formatter is wrong — not the content.
 */

// Verbs that, at the head of a clause, name something the student must do.
// Conservative on purpose: a false emphasis teaches her to distrust the emphasis.
const MOVE_VERBS = [
  'write', 'describe', 'tell', 'include', 'use', 'consider', 'state', 'support',
  'choose', 'open', 'explain', 'close', 'thank', 'answer', 'summarise', 'summarize',
  'list', 'ask', 'compare', 'contrast', 'evaluate', 'analyse', 'analyze', 'keep',
  'mention', 'add', 'give', 'begin', 'start', 'end', 'finish', 'suggest', 'propose',
  'confirm', 'apologise', 'apologize', 'invite', 'recommend', 'imagine', 'reply',
  'greet', 'introduce', 'present', 'outline', 'justify', 'conclude', 'organise',
  'organize', 'link', 'avoid', 'remember', 'show', 'name',
]

// The grammar a task is testing. Longest first so "simple present tense" wins
// over "present tense" and "going to" is not eaten by a shorter match.
const GRAMMAR_TERMS = [
  'reported (indirect) questions', 'reported speech', 'indirect questions',
  'first conditional', 'second conditional', 'third conditional', 'zero conditional',
  'simple present tense', 'simple past tense', 'present perfect continuous',
  'present perfect', 'past perfect', 'present continuous', 'past continuous',
  'future continuous', 'future forms', 'passive voice', 'active voice',
  'relative clauses', 'linking words', 'time expressions',
  'comparative adjectives', 'superlative adjectives', 'modal verbs',
  'present simple', 'past simple', 'present tense', 'past tense', 'future tense',
  'comparatives', 'superlatives', 'modals', 'the passive', 'going to', 'used to',
  'will', "won't", 'would', 'should', 'must',
]

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const verbAlt = MOVE_VERBS.map(escapeRe).join('|')

/* ── Sentences ─────────────────────────────────────────────────────────── */

/** Split into sentences without breaking on brackets, abbreviations or decimals. */
export function splitSentences(text) {
  if (!text) return []
  const out = []
  let buf = ''
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    buf += c
    if (c === '(' || c === '[') depth++
    else if (c === ')' || c === ']') depth = Math.max(0, depth - 1)
    else if ((c === '.' || c === '!' || c === '?') && depth === 0) {
      const prev = text[i - 1]
      const next = text[i + 1]
      const isDecimal = /\d/.test(prev || '') && /\d/.test(next || '')
      // "e.g." / "U.S." — a single letter before the dot, preceded by a dot or space.
      const isAbbrev = /[A-Za-z]/.test(prev || '') && /[.\s]/.test(text[i - 2] || ' ')
      if (!isDecimal && !isAbbrev && (next === undefined || next === ' ' || next === '\n')) {
        out.push(buf)
        buf = ''
      }
    }
  }
  if (buf) out.push(buf)
  return out
}

/* ── Clauses ───────────────────────────────────────────────────────────── */

/**
 * Split a sentence into its separate instructions when it carries a series of
 * them. Returns `[{ lead, s, tail }]` — `lead`/`tail` hold the connector and
 * punctuation that belong to the seam, so display can drop them while the join
 * stays byte-exact.
 */
export function splitMoveClauses(sentence) {
  const heads = []
  // A move verb that heads the sentence, or follows a comma / semicolon / "and".
  const re = new RegExp(`(^\\s*|[,;]\\s+(?:and\\s+|then\\s+|or\\s+)?|\\s+and\\s+|\\s+then\\s+)(${verbAlt})\\b`, 'gi')
  for (const m of sentence.matchAll(re)) {
    // Never split inside brackets — "(which channel gets the budget, when you
    // launch…)" is one parenthetical, not three steps.
    const before = sentence.slice(0, m.index)
    const depth = (before.match(/[([]/g) || []).length - (before.match(/[)\]]/g) || []).length
    if (depth > 0) continue
    heads.push({ sepStart: m.index, verbStart: m.index + m[1].length })
  }
  if (heads.length < 2) return [{ lead: '', s: sentence, tail: '' }]

  const parts = []
  for (let i = 0; i < heads.length; i++) {
    const from = heads[i].verbStart
    const to = i + 1 < heads.length ? heads[i + 1].sepStart : sentence.length
    const lead = i === 0 ? sentence.slice(0, from) : sentence.slice(heads[i].sepStart, from)
    let body = sentence.slice(from, to)
    // Trailing punctuation/whitespace belongs to the seam, not to the instruction —
    // otherwise one step in a series ends with a full stop and the rest do not.
    const tm = body.match(/([,;.]?\s*)$/)
    const tail = tm ? tm[1] : ''
    if (tail) body = body.slice(0, body.length - tail.length)
    parts.push({ lead, s: body, tail })
  }
  return parts
}

/* ── Inline runs ───────────────────────────────────────────────────────── */

/**
 * Tokenise into runs: `text`, `spec` (word counts + the grammar being tested),
 * `move` (the verb naming the step) and `aside` (a parenthetical).
 * Lossless — the `s` values concatenate back to the input.
 */
export function tokenizeSentence(sentence, { grammarTopic } = {}) {
  const marks = []
  const push = (start, end, kind) => {
    if (start < 0 || end <= start || end > sentence.length) return
    if (marks.some((m) => start < m.end && end > m.start)) return // no overlaps
    marks.push({ start, end, kind })
  }

  // Word counts: "(120-180 words)", "120-180 words", "150 words".
  for (const m of sentence.matchAll(/\(?\b\d{2,4}\s*[-–—]\s*\d{2,4}\s+words\b\)?|\b\d{2,4}\s+words\b/gi)) {
    push(m.index, m.index + m[0].length, 'spec')
  }

  // The grammar under test, whether named by the row or by the prose.
  const terms = [...GRAMMAR_TERMS]
  if (grammarTopic && grammarTopic.trim().length > 2) terms.unshift(grammarTopic.trim())
  terms.sort((a, b) => b.length - a.length)
  for (const term of terms) {
    for (const m of sentence.matchAll(new RegExp(`\\b${escapeRe(term)}\\b`, 'gi'))) {
      push(m.index, m.index + m[0].length, 'spec')
    }
  }

  // The verb that heads this instruction.
  for (const m of sentence.matchAll(new RegExp(`(^\\s*|[,;:]\\s+|\\s+and\\s+|\\s+then\\s+|\\s+or\\s+)(${verbAlt})\\b`, 'gi'))) {
    const start = m.index + m[1].length
    push(start, start + m[2].length, 'move')
  }

  // Parentheticals are supporting detail — they should read quieter, not equal.
  for (const m of sentence.matchAll(/\([^()]*\)/g)) {
    const inner = m[0]
    // Keep any spec/move emphasis that lives inside the bracket.
    const overlapping = marks.filter((k) => k.start >= m.index && k.end <= m.index + inner.length)
    if (overlapping.length === 0) push(m.index, m.index + inner.length, 'aside')
  }

  marks.sort((a, b) => a.start - b.start)
  const runs = []
  let cursor = 0
  for (const m of marks) {
    if (m.start > cursor) runs.push({ kind: 'text', s: sentence.slice(cursor, m.start) })
    runs.push({ kind: m.kind, s: sentence.slice(m.start, m.end) })
    cursor = m.end
  }
  if (cursor < sentence.length) runs.push({ kind: 'text', s: sentence.slice(cursor) })
  return runs
}

/* ── The brief ─────────────────────────────────────────────────────────── */

const startsWithMove = (s) =>
  new RegExp(`^\\s*(${verbAlt})\\b`, 'i').test(s)

// "Use the first conditional…" / "Your essay should demonstrate…" — a rule about
// the language, not another step.
const isConstraint = (s, runs) =>
  /^\s*use\b/i.test(s) && runs.some((r) => r.kind === 'spec')

/**
 * `{ scenario, ask, moves, constraint }`
 *  - scenario  : the setup, when the brief opens with one          (Run[] | null)
 *  - ask       : the sentence that names the deliverable            (Run[])
 *  - moves     : one entry per instruction, series split apart      ({lead,tail,runs}[])
 *  - constraint: the language rule, when the brief ends with one    (Run[] | null)
 */
export function analyzeBrief(promptEn, opts = {}) {
  const sentences = splitSentences(promptEn || '')
  if (!sentences.length) return { scenario: null, ask: [], moves: [], constraint: null }

  let idx = 0
  let scenario = null
  // A brief may open with a situation before it asks for anything. Only treat the
  // first sentence that way, and only if there IS a later sentence to be the ask.
  if (sentences.length > 1 && !startsWithMove(sentences[0]) && !/\bwrite\b/i.test(sentences[0])) {
    scenario = tokenizeSentence(sentences[0], opts)
    idx = 1
  }

  const ask = tokenizeSentence(sentences[idx] ?? '', opts)
  idx++

  const moves = []
  let constraint = null
  for (let i = idx; i < sentences.length; i++) {
    const raw = sentences[i]
    const whole = tokenizeSentence(raw, opts)
    if (i === sentences.length - 1 && isConstraint(raw, whole)) {
      constraint = whole
      continue
    }
    for (const part of splitMoveClauses(raw)) {
      moves.push({ lead: part.lead, tail: part.tail, runs: tokenizeSentence(part.s, opts) })
    }
  }

  return { scenario, ask, moves, constraint }
}

/** Re-join an analysis. The test uses this to prove nothing was lost. */
export function joinAnalysis({ scenario, ask, moves, constraint }) {
  const sent = (runs) => (runs || []).map((r) => r.s).join('')
  let out = ''
  if (scenario) out += sent(scenario)
  out += sent(ask)
  for (const m of moves) out += m.lead + sent(m.runs) + m.tail
  if (constraint) out += sent(constraint)
  return out
}
