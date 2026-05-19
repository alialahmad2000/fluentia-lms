// LISTENING-AUDIO-PLAYER-DRIFT-PROTECTION 2026-05-19
// Canonical source-text hash used by the drift-check pipeline.
//
// The same normalization rules MUST be used by every producer (audio
// generator) and every consumer (drift-check script, admin UI chip),
// otherwise trivial whitespace or encoding differences would produce
// false-positive drift.
//
// Mirror this function in src/lib/textHash.js for frontend use — keep the
// two implementations byte-for-byte equivalent.

const crypto = require('crypto')

/**
 * Compute the canonical SHA-256 hex of a transcript / passage text.
 *
 * Normalization:
 *   - CRLF → LF
 *   - Collapse runs of spaces/tabs to a single space
 *   - Collapse 3+ blank lines to 2
 *   - Trim outer whitespace
 *   - Unicode NFC (so combining marks vs precomposed don't differ)
 *
 * @param {string|null|undefined} text
 * @returns {string|null}  64-char hex SHA-256, or null if input is empty/non-string
 */
function sourceTextHash(text) {
  if (!text || typeof text !== 'string') return null
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .normalize('NFC')
  if (!normalized) return null
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex')
}

module.exports = { sourceTextHash }
