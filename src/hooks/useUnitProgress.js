import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { calculateUnitProgress } from '../utils/calculateUnitProgress'

/**
 * Comprehensive unit progress hook.
 * Fetches content availability, student progress, and vocab mastery.
 */
export function useUnitProgress(studentId, unitId) {
  return useQuery({
    queryKey: ['unit-progress-comprehensive', studentId, unitId],
    queryFn: async () => {
      // 1. Get readings for this unit (to know A/B and for vocab lookup)
      const { data: readings } = await supabase
        .from('curriculum_readings')
        .select('id, reading_label')
        .eq('unit_id', unitId)
        .order('reading_label')

      const readingA = readings?.find(r => r.reading_label === 'A')
      const readingB = readings?.find(r => r.reading_label === 'B')
      const readingIds = (readings || []).map(r => r.id)

      // 2. Check content existence in parallel
      const [
        { data: grammar },
        { data: listening },
        { data: vocab },
        { data: writing },
        { data: speaking },
        { data: assessment },
        { data: pronunciation },
      ] = await Promise.all([
        supabase.from('curriculum_grammar').select('id').eq('unit_id', unitId).limit(1),
        supabase.from('curriculum_listening').select('id').eq('unit_id', unitId).limit(1),
        readingIds.length > 0
          ? supabase.from('curriculum_vocabulary').select('id').in('reading_id', readingIds)
          : { data: [] },
        supabase.from('curriculum_writing').select('id').eq('unit_id', unitId).limit(1),
        supabase.from('curriculum_speaking').select('id').eq('unit_id', unitId).limit(1),
        supabase.from('curriculum_assessments').select('id').eq('unit_id', unitId).limit(1),
        supabase.from('curriculum_pronunciation').select('id').eq('unit_id', unitId).limit(1),
      ])

      const vocabIds = (vocab || []).map(v => v.id)

      const unitContent = {
        readingA: readingA?.id || null,
        readingB: readingB?.id || null,
        hasGrammar: grammar?.length > 0,
        hasListening: listening?.length > 0,
        vocabTotal: vocabIds.length,
        hasWriting: writing?.length > 0,
        hasSpeaking: speaking?.length > 0,
        hasAssessment: assessment?.length > 0,
        hasPronunciation: pronunciation?.length > 0,
      }

      // 3. Get student progress records (filter is_best to avoid duplicate grammar rows)
      const { data: progressRecords } = await supabase
        .from('student_curriculum_progress')
        .select('section_type, status, reading_id, ai_feedback, answers, is_best')
        .eq('student_id', studentId)
        .eq('unit_id', unitId)
        .neq('is_best', false)

      // 4. Get vocabulary mastery if vocab exists
      let vocabularyMastery = null
      if (vocabIds.length > 0) {
        const { data: mastery } = await supabase
          .from('vocabulary_word_mastery')
          .select('mastery_level')
          .eq('student_id', studentId)
          .in('vocabulary_id', vocabIds)

        const masteryArr = mastery || []
        const masteredCount = masteryArr.filter(m => m.mastery_level === 'mastered').length
        const learningCount = masteryArr.filter(m => m.mastery_level === 'learning').length
        vocabularyMastery = {
          totalWords: vocabIds.length,
          masteredCount,
          learningCount,
          newCount: vocabIds.length - masteredCount - learningCount,
        }
      }

      // 5. Calculate
      return calculateUnitProgress({
        unitContent,
        studentProgress: progressRecords || [],
        vocabularyMastery,
      })
    },
    enabled: !!studentId && !!unitId,
    staleTime: 60000,
  })
}

/**
 * Batch progress for level browser — fetches progress for all units in a level.
 */
export function useLevelProgress(studentId, units) {
  const unitIds = units?.map(u => u.id) || []

  return useQuery({
    queryKey: ['level-progress-comprehensive', studentId, unitIds.join(',')],
    queryFn: async () => {
      if (!unitIds.length) return {}

      // Batch: all progress records for all units (filter is_best to avoid duplicate grammar rows)
      const { data: allProgress } = await supabase
        .from('student_curriculum_progress')
        .select('unit_id, section_type, status, reading_id, ai_feedback, answers, is_best')
        .eq('student_id', studentId)
        .in('unit_id', unitIds)
        .neq('is_best', false)

      // Batch: all readings for all units (to know A/B and vocab)
      const { data: allReadings } = await supabase
        .from('curriculum_readings')
        .select('id, unit_id, reading_label')
        .in('unit_id', unitIds)

      const allReadingIds = (allReadings || []).map(r => r.id)

      // Batch: all vocabulary for all readings
      const { data: allVocab } = allReadingIds.length > 0
        ? await supabase
            .from('curriculum_vocabulary')
            .select('id, reading_id')
            .in('reading_id', allReadingIds)
        : { data: [] }

      const allVocabIds = (allVocab || []).map(v => v.id)

      // Batch: all mastery
      const { data: allMastery } = allVocabIds.length > 0
        ? await supabase
            .from('vocabulary_word_mastery')
            .select('vocabulary_id, mastery_level')
            .eq('student_id', studentId)
            .in('vocabulary_id', allVocabIds)
        : { data: [] }

      // Batch: check content existence per unit
      const [
        { data: allGrammar },
        { data: allListening },
        { data: allWriting },
        { data: allSpeaking },
        { data: allAssessments },
        { data: allPronunciation },
      ] = await Promise.all([
        supabase.from('curriculum_grammar').select('id, unit_id').in('unit_id', unitIds),
        supabase.from('curriculum_listening').select('id, unit_id').in('unit_id', unitIds),
        supabase.from('curriculum_writing').select('id, unit_id').in('unit_id', unitIds),
        supabase.from('curriculum_speaking').select('id, unit_id').in('unit_id', unitIds),
        supabase.from('curriculum_assessments').select('id, unit_id').in('unit_id', unitIds),
        supabase.from('curriculum_pronunciation').select('id, unit_id').in('unit_id', unitIds),
      ])

      // Calculate per unit
      const result = {}

      for (const uid of unitIds) {
        const unitReadings = (allReadings || []).filter(r => r.unit_id === uid)
        const readingA = unitReadings.find(r => r.reading_label === 'A')
        const readingB = unitReadings.find(r => r.reading_label === 'B')
        const unitReadingIds = unitReadings.map(r => r.id)

        const unitVocab = (allVocab || []).filter(v => unitReadingIds.includes(v.reading_id))
        const unitVocabIds = unitVocab.map(v => v.id)
        const unitMastery = (allMastery || []).filter(m => unitVocabIds.includes(m.vocabulary_id))

        const unitContent = {
          readingA: readingA?.id || null,
          readingB: readingB?.id || null,
          hasGrammar: (allGrammar || []).some(g => g.unit_id === uid),
          hasListening: (allListening || []).some(l => l.unit_id === uid),
          vocabTotal: unitVocabIds.length,
          hasWriting: (allWriting || []).some(w => w.unit_id === uid),
          hasSpeaking: (allSpeaking || []).some(s => s.unit_id === uid),
          hasAssessment: (allAssessments || []).some(a => a.unit_id === uid),
          hasPronunciation: (allPronunciation || []).some(p => p.unit_id === uid),
        }

        const unitProgress = (allProgress || []).filter(p => p.unit_id === uid)

        let vocMastery = null
        if (unitVocabIds.length > 0) {
          const mc = unitMastery.filter(m => m.mastery_level === 'mastered').length
          const lc = unitMastery.filter(m => m.mastery_level === 'learning').length
          vocMastery = {
            totalWords: unitVocabIds.length,
            masteredCount: mc,
            learningCount: lc,
            newCount: unitVocabIds.length - mc - lc,
          }
        }

        result[uid] = calculateUnitProgress({
          unitContent,
          studentProgress: unitProgress,
          vocabularyMastery: vocMastery,
        })
      }

      return result
    },
    enabled: !!studentId && unitIds.length > 0,
    staleTime: 120000,
  })
}
