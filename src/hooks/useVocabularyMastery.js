import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { safeCelebrate } from '../lib/celebrations'

export function useVocabularyMastery(studentId, unitId) {
  const queryClient = useQueryClient()

  const { data: masteryMap = {}, isLoading } = useQuery({
    queryKey: ['vocabulary-mastery', studentId, unitId],
    queryFn: async () => {
      // Get reading IDs for this unit
      const { data: readings } = await supabase
        .from('curriculum_readings')
        .select('id')
        .eq('unit_id', unitId)
      if (!readings?.length) return {}

      // Get vocabulary IDs for those readings
      const { data: vocab } = await supabase
        .from('curriculum_vocabulary')
        .select('id')
        .in('reading_id', readings.map(r => r.id))
      if (!vocab?.length) return {}

      // Get mastery records
      const { data: mastery } = await supabase
        .from('vocabulary_word_mastery')
        .select('*')
        .eq('student_id', studentId)
        .in('vocabulary_id', vocab.map(v => v.id))

      return (mastery || []).reduce((acc, m) => {
        acc[m.vocabulary_id] = m
        return acc
      }, {})
    },
    enabled: !!studentId && !!unitId,
  })

  const updateMastery = useMutation({
    mutationFn: async (updates) => {
      const { data, error } = await supabase
        .from('vocabulary_word_mastery')
        .upsert(updates, { onConflict: 'student_id,vocabulary_id' })
        .select()
      if (error) throw error
      return data?.[0]
    },
    onSuccess: (data) => {
      // Optimistic update the map
      if (data) {
        queryClient.setQueryData(['vocabulary-mastery', studentId, unitId], (prev) => ({
          ...prev,
          [data.vocabulary_id]: data,
        }))
      }
    },
  })

  const masteredCount = Object.values(masteryMap).filter(m => m.mastery_level === 'mastered').length
  const learningCount = Object.values(masteryMap).filter(m => m.mastery_level === 'learning').length

  return {
    masteryMap,
    isLoading,
    updateMastery,
    masteredCount,
    learningCount,
    getMastery: (vocabId) => masteryMap[vocabId] || null,
  }
}
