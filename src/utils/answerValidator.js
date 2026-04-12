/**
 * Answer validation utilities for grammar exercises, weekly tasks, etc.
 * Handles: multiple valid answers, partial answers, flexible matching.
 */

/**
 * Normalize a string for comparison.
 */
function normalize(str) {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/\s*,\s*/g, ', ')     // normalize comma spacing
    .replace(/[''`]/g, "'")        // normalize apostrophes
    .replace(/\s+/g, ' ')          // collapse whitespace
}

/**
 * Strip punctuation for looser comparison.
 */
function stripPunctuation(str) {
  return str.replace(/[.!?;,'"()]/g, '').trim()
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
  }

  // 4. Full-sentence detection for fill-blank:
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

  // 5. Partial answer matching (for error_correction / transform)
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
