import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Reading editorial rebuild: prefetch a meaning for EVERY word in the article in
// ONE pass, so a word tap reads from an in-memory Map (instant) with no per-click
// DB round-trip AND no runtime AI.
//
// Two static sources are merged into a single lookup Map<word, row>:
//   1. curriculum_vocabulary — the rich rows (audio_url, pronunciation_ipa,
//      example_sentence). These words also get the gold dotted underline.
//      Columns: word (lowercase), definition_ar, audio_url, example_sentence,
//      pronunciation_ipa, id.
//   2. reading_glossary — the offline EN→AR fallback dictionary that covers every
//      remaining passage token (inflections, common words, names) with an Arabic
//      meaning. These are NOT underlined but still tappable → meaning.
//
// Each row carries `is_vocab` so the body can underline only curriculum words
// while still resolving a meaning for any tapped token.
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
      // Normalize identically to ArticleBody.normWord + the seed pipeline, so the
      // tokens we fetch are the exact keys a tap will look up.
      const norm = (w) => w.toLowerCase().replace(/^[^\p{L}]+/u, '').replace(/[^\p{L}]+$/u, '')
      const tokens = Array.from(
        new Set((bodyText.match(/[\p{L}\p{M}'-]+/gu) || []).map(norm).filter((t) => t.length > 1)),
      )
      const map = new Map()
      if (tokens.length === 0) return map

      const CHUNK = 200
      const chunks = []
      for (let i = 0; i < tokens.length; i += CHUNK) chunks.push(tokens.slice(i, i + CHUNK))

      // 1) Rich curriculum vocabulary (also drives the underline).
      for (const slice of chunks) {
        const { data, error } = await supabase
          .from('curriculum_vocabulary')
          .select('id, word, definition_ar, audio_url, example_sentence, pronunciation_ipa')
          .in('word', slice)
        if (error) throw error
        for (const row of data || []) {
          if (row.word) map.set(row.word.toLowerCase(), { ...row, is_vocab: true })
        }
      }

      // 2) Offline glossary fallback — fill any token not already covered above.
      //    A missing glossary table (older env) must NEVER break reading: swallow
      //    the error and keep whatever curriculum coverage we have.
      for (const slice of chunks) {
        const missing = slice.filter((t) => !map.has(t))
        if (missing.length === 0) continue
        const { data, error } = await supabase
          .from('reading_glossary')
          .select('word, meaning_ar, part_of_speech')
          .in('word', missing)
        if (error) break
        for (const row of data || []) {
          const w = (row.word || '').toLowerCase()
          if (w && row.meaning_ar && !map.has(w)) {
            map.set(w, {
              word: w,
              definition_ar: row.meaning_ar,
              part_of_speech: row.part_of_speech || null,
              is_vocab: false,
            })
          }
        }
      }

      return map
    },
  })
}
