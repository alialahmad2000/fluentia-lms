/**
 * Answer validation utilities for grammar exercises, weekly tasks, etc.
 * Handles: multiple valid answers, partial answers, flexible matching,
 * multi-blank separator tolerance (comma, dash, slash, etc.).
 */

/**
 * Normalize a string for comparison.
 */
function normalize(str) {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u2032`]/g, "'")  // smart quotes → straight
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s*,\s*/g, ', ')     // normalize comma spacing
    .replace(/\s+/g, ' ')          // collapse whitespace
}

/**
 * Strip punctuation for looser comparison.
 */
function stripPunctuation(str) {
  return str.replace(/[.!?;,'"()[\]{}]/g, '').trim()
}

/**
 * Split a multi-blank answer string into ordered tokens.
 * Splits on: comma, dash, slash, semicolon, " and ", " & ", newlines.
 */
function splitMultiBlank(s) {
  return (s || '')
    .split(/[,;/\\\n]|\s*-\s*|\s*–\s*|\s*—\s*|\s+&\s+|\s+and\s+/i)
    .map(t => t.trim())
    .filter(Boolean)
}

/**
 * Normalize a single token for comparison: lowercase, strip punctuation, collapse whitespace.
 */
function normalizeToken(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u2032`]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[.!?;,:"()\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Compare two answers considering multi-blank separator differences.
 * Returns true if the ordered tokens match after normalization.
 */
function compareMultiBlank(student, correct) {
  const studentTokens = splitMultiBlank(student).map(normalizeToken).filter(Boolean)
  const correctTokens = splitMultiBlank(correct).map(normalizeToken).filter(Boolean)

  if (studentTokens.length === 0 || correctTokens.length === 0) return false

  // Same number of tokens — compare token by token
  if (studentTokens.length === correctTokens.length) {
    return studentTokens.every((tok, i) => tok === correctTokens[i])
  }

  // Different token count — try joining and comparing as single normalized strings
  // This handles cases like "would detect" being one token vs two
  const studentJoined = studentTokens.join(' ')
  const correctJoined = correctTokens.join(' ')
  return studentJoined === correctJoined
}

/**
 * Validate a student's answer against one or more accepted answers.
 *
 * @param {string} studentAnswer
 * @param {string|string[]} acceptedAnswers — single string or array of valid answers
 * @param {object} [options]
 * @param {string} [options.originalSentence] — for error_correction: the original wrong sentence
 * @param {boolean} [options.allowPartial] — accept partial (key-word-only) answers
 * @param {string} [options.fullSentence] — for fill_blank: the sentence containing the blank
 * @returns {boolean}
 */
export function validateAnswer(studentAnswer, acceptedAnswers, options = {}) {
  const accepted = Array.isArray(acceptedAnswers) ? acceptedAnswers : [acceptedAnswers]
  const normStudent = normalize(studentAnswer)

  if (!normStudent) return false

  for (const ans of accepted) {
    const normAccepted = normalize(ans)

    // 1. Exact match (case-insensitive, normalized)
    if (normStudent === normAccepted) return true

    // 2. Punctuation-stripped match
    if (stripPunctuation(normStudent) === stripPunctuation(normAccepted)) return true

    // 3. Contraction equivalence: "don't" = "do not", "it's" = "it is", etc.
    if (stripPunctuation(expandContractions(normStudent)) === stripPunctuation(expandContractions(normAccepted))) return true

    // 4. Multi-blank separator-tolerant match (handles comma vs dash vs slash etc.)
    if (compareMultiBlank(studentAnswer, ans)) return true
  }

  // 5. Full-sentence detection for fill-blank:
  //    Student typed the whole sentence but blank expected just the word
  if (options.fullSentence) {
    const normInput = stripPunctuation(normStudent)
    for (const ans of accepted) {
      const normAccepted = stripPunctuation(normalize(ans))
      // Student input is longer than accepted and contains it as a whole word
      if (normInput.length > normAccepted.length && normInput.includes(normAccepted)) {
        const pattern = new RegExp(`\\b${escapeRegex(normAccepted)}\\b`)
        if (pattern.test(normInput)) return true
      }
    }
  }

  // 6. Partial answer matching (for error_correction / transform)
  if (options.allowPartial && options.originalSentence) {
    const normOriginal = normalize(options.originalSentence)
    for (const ans of accepted) {
      const normAccepted = normalize(ans)
      // Student typed just the changed word(s) — at least 2 chars
      if (
        normStudent.length >= 2 &&
        normAccepted.includes(normStudent) &&
        !normOriginal.includes(normStudent)
      ) {
        return true
      }
    }
  }

  return false
}

/**
 * Expand common English contractions for comparison.
 */
function expandContractions(str) {
  return str
    .replace(/\bdon't\b/g, 'do not')
    .replace(/\bdoesn't\b/g, 'does not')
    .replace(/\bdidn't\b/g, 'did not')
    .replace(/\bwon't\b/g, 'will not')
    .replace(/\bcan't\b/g, 'cannot')
    .replace(/\bcouldn't\b/g, 'could not')
    .replace(/\bshouldn't\b/g, 'should not')
    .replace(/\bwouldn't\b/g, 'would not')
    .replace(/\bisn't\b/g, 'is not')
    .replace(/\baren't\b/g, 'are not')
    .replace(/\bwasn't\b/g, 'was not')
    .replace(/\bweren't\b/g, 'were not')
    .replace(/\bhasn't\b/g, 'has not')
    .replace(/\bhaven't\b/g, 'have not')
    .replace(/\bit's\b/g, 'it is')
    .replace(/\bhe's\b/g, 'he is')
    .replace(/\bshe's\b/g, 'she is')
    .replace(/\bthat's\b/g, 'that is')
    .replace(/\bthey're\b/g, 'they are')
    .replace(/\bwe're\b/g, 'we are')
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\bi've\b/g, 'i have')
    .replace(/\bi'll\b/g, 'i will')
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * For fill-blank with multiple blanks: generate valid permutations.
 * e.g. ["can", "can't"] → ["can, can't", "can't, can"]
 *
 * @param {string[]} parts — the individual blank answers in order
 * @returns {string[]} all valid combined answer strings
 */
export function generatePermutations(parts) {
  if (!parts || parts.length <= 1) return [parts?.join(', ') || '']
  if (parts.length === 2) {
    return [
      parts.join(', '),
      [parts[1], parts[0]].join(', '),
    ]
  }
  // For 3+, just return original order (permutations explode)
  return [parts.join(', ')]
}
