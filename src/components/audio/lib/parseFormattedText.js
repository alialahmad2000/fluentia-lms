/**
 * Parses passage text into structured paragraphs with inline markup.
 * Input: raw text with \n\n paragraph breaks and *emphasis* markers
 * Output: [{ children: [{ type: 'text'|'em'|'strong', text: string }] }]
 *
 * Does NOT modify word_timestamps — those are used separately for karaoke timing.
 */

export function parseFormattedText(rawText) {
  if (!rawText) return []
  const paras = rawText.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
  return paras.map(paraText => ({ children: parseInline(paraText) }))
}

function parseInline(text) {
  const tokens = []
  // Match **bold** then *italic* (bold first to avoid greedy single-star match)
  const regex = /(\*\*[^*]+\*\*)|(\*[^*\n]+\*)/g
  let lastIndex = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }
    if (match[1]) {
      tokens.push({ type: 'strong', text: match[1].slice(2, -2) })
    } else if (match[2]) {
      tokens.push({ type: 'em', text: match[2].slice(1, -1) })
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', text: text.slice(lastIndex) })
  }
  return tokens
}

/**
 * Splits a string into an array of [word, space/punct] tokens.
 * Words are sequences of word chars + apostrophes.
 * Used to align inline tokens with word_timestamps.
 */
export function tokenizeWords(text) {
  return text.split(/(\s+)/).filter(t => t.length > 0)
}

/**
 * Returns true if a token is a "word" (contains at least one letter/digit/apostrophe).
 */
export function isWordToken(token) {
  return /[a-zA-Z0-9']/.test(token)
}
