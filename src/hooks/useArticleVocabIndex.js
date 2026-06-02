import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Reading editorial rebuild: prefetch the vocabulary rows for every word in the
// article in ONE query, so a word tap reads from an in-memory Map (instant) with
// no per-click DB round-trip. Real curriculum_vocabulary columns: word (lowercase),
// definition_ar, audio_url, example_sentence, pronunciation_ipa, curriculum id.
//
// `paragraphs` is curriculum_readings.passage_content.paragraphs (string[]).
export function useArticleVocabIndex(articleId, paragraphs) {
  const bodyText = Array.isArray(paragraphs) ? paragraphs.join(' ') : (paragraphs || '')
  return useQuery({
    // 'no-persist' opts this query out of the localStorage persister (main.jsx):
    // its value is a Map, which JSON-serializes to a lossy `{}` and rehydrates as a
    // plain object with no `.has`/`.get`. Keeping it memory-only means a real Map is
    // always (re)built from the network, never a broken rehydrated shape.
    queryKey: ['article-vocab-index', 'no-persist', articleId],
    enabled: !!articleId && bodyText.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const tokens = Array.from(
        new Set((bodyText.match(/[\p{L}\p{M}'-]+/gu) || []).map((t) => t.toLowerCase())),
      )
      const map = new Map()
      if (tokens.length === 0) return map
      // curriculum_vocabulary.word is stored lowercase, so an exact IN works.
      // Chunk the IN list to stay well under URL limits.
      const CHUNK = 200
      for (let i = 0; i < tokens.length; i += CHUNK) {
        const slice = tokens.slice(i, i + CHUNK)
        const { data, error } = await supabase
          .from('curriculum_vocabulary')
          .select('id, word, definition_ar, audio_url, example_sentence, pronunciation_ipa')
          .in('word', slice)
        if (error) throw error
        for (const row of data || []) {
          if (row.word) map.set(row.word.toLowerCase(), row)
        }
      }
      return map
    },
  })
}
