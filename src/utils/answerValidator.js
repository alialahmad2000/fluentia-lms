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
  }

  // 3. Partial answer matching (for error_correction / transform)
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
