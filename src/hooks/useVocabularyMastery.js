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

      const vocabIds = vocab.map(v => v.id)

      // PRIMARY source: legacy per-exercise mastery (still the write target for
      // unit-progress and the in-unit exercise modal). Keyed by vocabulary_id.
      const { data: mastery, error: masteryErr } = await supabase
        .from('vocabulary_word_mastery')
        .select('*')
        .eq('student_id', studentId)
        .in('vocabulary_id', vocabIds)
      if (masteryErr) throw masteryErr

      const map = (mastery || []).reduce((acc, m) => {
        acc[m.vocabulary_id] = m
        return acc
      }, {})

      // SECONDARY source: the unified vocab_cards store, which the sidebar
      // journey/SRS writes to (keyed by curriculum_vocabulary_id, NOT by the
      // legacy table). Fill-in / upgrade only — NEVER downgrade. Resilient:
      // if this read fails, fall back to the legacy data above.
      try {
        const { data: cards, error: cardsErr } = await supabase
          .from('vocab_cards')
          .select('curriculum_vocabulary_id, mastery_level, state')
          .eq('student_id', studentId)
          .in('curriculum_vocabulary_id', vocabIds)

        if (!cardsErr && cards?.length) {
          for (const card of cards) {
            const vocabId = card.curriculum_vocabulary_id
            if (!vocabId) continue

            // A card counts as "advanced" when the sidebar has either marked it
            // mastered, or moved it past the initial 'new' state into the SRS
            // review/relearning band (i.e. the student has actually learned it).
            const cardMastered =
              card.mastery_level === 'mastered' ||
              card.state === 'review' ||
              card.state === 'relearning'
            if (!cardMastered) continue

            const existing = map[vocabId]
            // Never downgrade: if the legacy table already says mastered, keep it.
            if (existing?.mastery_level === 'mastered') continue

            // Upgrade (or synthesize) the merged entry to 'mastered' and set the
            // three exercise booleans true so passedCount stays consistent with a
            // 'mastered' badge (no "mastered but 0 dots" inconsistency).
            map[vocabId] = {
              ...(existing || { student_id: studentId, vocabulary_id: vocabId }),
              mastery_level: 'mastered',
              meaning_exercise_passed: true,
              sentence_exercise_passed: true,
              listening_exercise_passed: true,
            }
          }
        }
      } catch {
        // vocab_cards merge is best-effort; legacy mastery is authoritative.
      }

      return map
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
