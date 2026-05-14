import { useMemo } from 'react'

const isMatchable = (s) => /[A-Za-z]/.test(s)
const normalize = (s) => s.toLowerCase().replace(/[^a-z']/g, '')

/**
 * Builds a position-indexed timestamp table from word_timestamps JSON.
 *
 * Position is the 0-indexed count of matchable English-letter words from
 * the start of the passage — counted the SAME WAY in both the DOM tokenizer
 * (InteractivePassage) and here. This avoids the drift bug where occurrence
 * counting broke when DOM tokenization and timestamp tokenization disagreed
 * on punctuation.
 */
export function useWordTimestamps(wordTimestampsJson) {
  return useMemo(() => {
    if (!wordTimestampsJson) return { byPosition: [], lookup: () => null }

    const source = wordTimestampsJson.paragraphs
      ? wordTimestampsJson.paragraphs.flatMap(p => p.words || [])
      : (wordTimestampsJson.words || [])

    const byPosition = source
      .filter(w => w.word && isMatchable(w.word))
      .map(w => ({ ...w, normalized: normalize(w.word) }))

    /**
     * Look up timestamps by passage position.
     * Falls back ±3 positions for minor drift recovery.
     */
    const lookup = (passagePosition, fallbackWord) => {
      const exact = byPosition[passagePosition]
      if (exact && exact.normalized === normalize(fallbackWord)) return exact

      const target = normalize(fallbackWord)
      for (let delta = -3; delta <= 3; delta++) {
        const cand = byPosition[passagePosition + delta]
        if (cand && cand.normalized === target) return cand
      }
      return null
    }

    return { byPosition, lookup }
  }, [wordTimestampsJson])
}
