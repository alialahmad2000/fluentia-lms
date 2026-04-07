import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useCurriculumMap() {
  return useQuery({
    queryKey: ['curriculumMap'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: levels, error: levelsError } = await supabase
        .from('curriculum_levels')
        .select('*')
        .order('level_number')
      if (levelsError) throw levelsError

      const { data: units, error: unitsError } = await supabase
        .from('curriculum_units')
        .select(`
          id, unit_number, theme_en, theme_ar, level_id,
          curriculum_readings (
            id, reading_label, passage_word_count
          ),
          curriculum_grammar (
            id, topic_name_en, topic_name_ar
          ),
          curriculum_writing (
            id, task_type, prompt_en, word_count_min, word_count_max
          ),
          curriculum_speaking (
            id, topic_type, prompt_en, min_duration_seconds, max_duration_seconds
          ),
          curriculum_listening (
            id, audio_url
          ),
          curriculum_pronunciation (
            id, focus_type, title_en, title_ar
          ),
          curriculum_assessments (
            id, questions
          )
        `)
        .order('unit_number')
      if (unitsError) throw unitsError

      const { data: vocabCounts, error: vocabError } = await supabase
        .rpc('get_vocab_counts_per_unit')
      if (vocabError) console.warn('RPC error:', vocabError)

      // Build vocab count map
      const vocabMap = {}
      ;(vocabCounts || []).forEach(v => {
        vocabMap[v.unit_id] = { count: Number(v.vocab_count), unique: Number(v.unique_vocab_count) }
      })

      return { levels, units, vocabMap }
    },
  })
}

export function useUnitVocab(unitId, enabled) {
  return useQuery({
    queryKey: ['unit-vocab-detail', unitId],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_vocab_for_unit', { p_unit_id: unitId })
      if (error) throw error
      return data || []
    },
    enabled: !!unitId && enabled,
  })
}
