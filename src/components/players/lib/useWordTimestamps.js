import { useMemo } from 'react'

function normalize(w) {
  return w.toLowerCase().replace(/[^a-z']/g, '')
}

export function useWordTimestamps(wordTimestampsJson) {
  return useMemo(() => {
    if (!wordTimestampsJson) return { words: [], findByOccurrence: () => null }

    const words = []
    const source = wordTimestampsJson.paragraphs || [{ words: wordTimestampsJson.words || [] }]
    for (const p of source) {
      for (const w of (p.words || [])) {
        words.push({ ...w, normalized: normalize(w.word) })
      }
    }

    return {
      words,
      findByOccurrence: (wordText, occurrenceIndex) => {
        const target = normalize(wordText)
        let seen = 0
        for (const w of words) {
          if (w.normalized === target) {
            if (seen === occurrenceIndex) return w
            seen++
          }
        }
        return null
      }
    }
  }, [wordTimestampsJson])
}
