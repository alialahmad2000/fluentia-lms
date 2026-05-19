// LISTENING-AUDIO-PLAYER-DRIFT-PROTECTION 2026-05-19
// Mirror of scripts/lib/text-hash.cjs for frontend use.
// Keep the two implementations byte-for-byte equivalent — the drift-check
// guarantee depends on producer + consumer agreeing on normalization.
//
// Uses the SubtleCrypto API (available in modern browsers + Node 19+).
// Returns a Promise because SubtleCrypto.digest is async.

/**
 * Compute the canonical SHA-256 hex of a transcript / passage text.
 *
 * @param {string|null|undefined} text
 * @returns {Promise<string|null>}  64-char hex SHA-256, or null if input is empty/non-string
 */
export async function sourceTextHash(text) {
  if (!text || typeof text !== 'string') return null
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .normalize('NFC')
  if (!normalized) return null
  const enc = new TextEncoder()
  const data = enc.encode(normalized)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
