import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Returns vocab rows for a unit with a lemma-friendly lookup function.
 * Uses curriculum_vocabulary.word (not word_en) — that is the actual DB column name.
 */
export function useUnitVocab(unitId) {
  const q = useQuery({
    queryKey: ['unit-vocab-rich', unitId],
    queryFn: async () => {
      if (!unitId) return []
      const { data, error } = await supabase
        .from('curriculum_vocabulary')
        .select('id, word, meaning_ar, part_of_speech')
        .eq('unit_id', unitId)
        .order('word')
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
    staleTime: 5 * 60 * 1000,
  })

  // Lemma-friendly lookup: handles plurals, -ed, -ing, doubled consonants
  const lookup = (rawWord) => {
    if (!q.data?.length) return null
    const norm = rawWord.toLowerCase().replace(/[^a-z']/g, '')
    if (!norm) return null

    const exact = q.data.find(v => v.word.toLowerCase() === norm)
    if (exact) return exact

    const candidates = [
      norm.replace(/s$/, ''),
      norm.replace(/es$/, ''),
      norm.replace(/ed$/, ''),
      norm.replace(/ied$/, 'y'),
      norm.replace(/ing$/, ''),
      norm.replace(/ing$/, 'e'),
      norm.replace(/(.)\1ing$/, '$1'), // running → run
    ]
    for (const c of candidates) {
      if (!c) continue
      const m = q.data.find(v => v.word.toLowerCase() === c)
      if (m) return m
    }
    return null
  }

  return { vocab: q.data || [], lookup, isLoading: q.isLoading }
}
