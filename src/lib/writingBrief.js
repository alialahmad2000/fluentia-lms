/**
 * Typesetting for a writing brief.
 *
 * The briefs are written to a consistent shape — a lead sentence naming the
 * deliverable, then the moves the student has to make, then (usually) the
 * language constraint. As one grey paragraph none of that is visible; a student
 * has to read all of it to find the four things she is actually being asked for.
 *
 * This turns the same words into structure. It NEVER edits, reorders, hides or
 * invents text: `segmentBrief()` is lossless, and `tests/unit/writingBrief.test.mjs`
 * asserts that re-joining every token reproduces the original string for every
 * brief in the database. If that assertion ever fails, the formatter is wrong,
 * not the content.
 */

// Verbs that, at the head of a sentence or clause, name something the student
// must actually do. Deliberately conservative — a false emphasis is worse than
// a missed one, because it teaches her to distrust the emphasis.
const MOVE_VERBS = [
  'write', 'describe', 'tell', 'include', 'use', 'consider', 'state', 'support',
  'choose', 'open', 'explain', 'close', 'thank', 'answer', 'summarise', 'summarize',
  'list', 'ask', 'compare', 'contrast', 'evaluate', 'analyse', 'analyze', 'keep',
  'mention', 'add', 'give', 'begin', 'start', 'end', 'finish', 'suggest', 'propose',
  'confirm', 'apologise', 'apologize', 'invite', 'recommend', 'imagine', 'reply',
]

// Grammar the task is testing. Longest first so "simple present tense" wins over
// "present tense".
const GRAMMAR_TERMS = [
  'reported (indirect) questions', 'reported speech', 'indirect questions',
  'first conditional', 'second conditional', 'third conditional', 'zero conditional',
  'simple present tense', 'simple past tense', 'present perfect', 'past perfect',
  'present continuous', 'past continuous', 'future forms', 'future continuous',
  'passive voice', 'active voice', 'relative clauses', 'linking words',
  'comparative adjectives', 'superlative adjectives', 'modal verbs',
  'present tense', 'past tense', 'future tense', 'comparatives', 'superlatives',
  'modals', 'the passive', 'going to', 'used to',
]

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Split into sentences without breaking on abbreviations, decimals, or a period
 * that sits inside brackets.
 */
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
      const next = text[i + 1]
      const prev = text[i - 1]
      // "e.g." / "U.S." / a decimal → not a boundary.
      const isAbbrev = /[A-Za-z]/.test(prev || '') && /[A-Za-z]/.test(text[i - 2] || '') === false
      const isDecimal = /\d/.test(prev || '') && /\d/.test(next || '')
      if (!isDecimal && !isAbbrev && (next === undefined || next === ' ' || next === '\n')) {
        out.push(buf.trim())
        buf = ''
        i++ // swallow the separator
      }
    }
  }
  if (buf.trim()) out.push(buf.trim())
  return out
}

/**
 * Tokenise one sentence into runs: plain text, `spec` (word counts and the
 * grammar being tested) and `move` (the verb naming a required step).
 * Lossless — the `s` values concatenate back to the input.
 */
export function tokenizeSentence(sentence, { grammarTopic } = {}) {
  const marks = []

  const push = (start, end, kind) => {
    if (start < 0 || end <= start) return
    if (marks.some((m) => start < m.end && end > m.start)) return // no overlaps
    marks.push({ start, end, kind })
  }

  // Word counts: "(120-180 words)", "120-180 words", "150 words".
  for (const m of sentence.matchAll(/\(?\b\d{2,4}\s*[-–—]\s*\d{2,4}\s+words\b\)?|\b\d{2,4}\s+words\b/gi)) {
    push(m.index, m.index + m[0].length, 'spec')
  }

  // The grammar this task is testing, whether named by the row or by the prose.
  const terms = [...GRAMMAR_TERMS]
  if (grammarTopic && grammarTopic.trim().length > 2) terms.unshift(grammarTopic.trim())
  terms.sort((a, b) => b.length - a.length)
  for (const term of terms) {
    const re = new RegExp(`\\b${escapeRe(term)}\\b`, 'gi')
    for (const m of sentence.matchAll(re)) push(m.index, m.index + m[0].length, 'spec')
  }

  // A move verb, but only where it heads the sentence or a clause — "use" in
  // "the channel you use" is not an instruction.
  for (const verb of MOVE_VERBS) {
    const re = new RegExp(`(^|[,;:]\\s+|\\.\\s+|\\band\\s+|\\bthen\\s+|\\bor\\s+)(${escapeRe(verb)})\\b`, 'gi')
    for (const m of sentence.matchAll(re)) {
      const start = m.index + m[1].length
      push(start, start + m[2].length, 'move')
    }
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

/**
 * The whole brief: a lead sentence plus the steps under it.
 * `{ lead: Run[], steps: Run[][] }`
 */
export function segmentBrief(promptEn, opts = {}) {
  const sentences = splitSentences(promptEn || '')
  if (!sentences.length) return { lead: [], steps: [] }
  return {
    lead: tokenizeSentence(sentences[0], opts),
    steps: sentences.slice(1).map((s) => tokenizeSentence(s, opts)),
  }
}

/** Re-join a segmented brief. Used by the test to prove nothing is lost. */
export function joinSegments({ lead, steps }) {
  const sent = (runs) => runs.map((r) => r.s).join('')
  return [sent(lead), ...steps.map(sent)].filter(Boolean).join(' ')
}
