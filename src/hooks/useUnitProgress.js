import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { calculateUnitProgress } from '../utils/calculateUnitProgress'

// ─────────────────────────────────────────────────────────────
// useUnitProgress — single unit, individual page
//
// Strategy:
//   1. Try unit_progress table (DB-computed, triggers keep it fresh)
//   2. Subscribe to Realtime — UI updates without reload after any submission
//   3. Fall back to frontend calculation if no DB row yet
//   4. Invalidate queryKey ['unit-progress-comprehensive'] also so legacy
//      consumers (useUnitData) get fresh data
// ─────────────────────────────────────────────────────────────
export function useUnitProgress(studentId, unitId) {
  const queryClient = useQueryClient()

  // Realtime subscription — fires when any trigger writes a new unit_progress row
  useEffect(() => {
    if (!studentId || !unitId) return
    const channel = supabase
      .channel(`unit_progress:${studentId}:${unitId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unit_progress',
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unit-progress-comprehensive', studentId, unitId] })
        }
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [studentId, unitId, queryClient])

  return useQuery({
    queryKey: ['unit-progress-comprehensive', studentId, unitId],
    queryFn: async () => {
      // ── Try DB-computed row first ──
      const { data: dbRow } = await supabase
        .from('unit_progress')
        .select('numerator, denominator, percentage, breakdown, updated_at')
        .eq('student_id', studentId)
        .eq('unit_id', unitId)
        .maybeSingle()

      if (dbRow) {
        return mapDbRowToProgressShape(dbRow)
      }

      // ── Fallback: frontend calculation (for units not yet backfilled) ──
      return computeFrontendProgress(studentId, unitId)
    },
    enabled: !!studentId && !!unitId,
    staleTime: 30000,
  })
}

// ─────────────────────────────────────────────────────────────
// useLevelUnitsProgress — batch for the level browser
//
// Reads unit_progress for all units in a level at once.
// Realtime subscription: any row for this student → refetch.
// ─────────────────────────────────────────────────────────────
export function useLevelUnitsProgress(studentId, levelId) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!studentId) return
    const channel = supabase
      .channel(`level_progress:${studentId}:${levelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'unit_progress',
          filter: `student_id=eq.${studentId}`,
        },
        () => queryClient.invalidateQueries({ queryKey: ['level-progress', studentId, levelId] })
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [studentId, levelId, queryClient])

  return useQuery({
    queryKey: ['level-progress', studentId, levelId],
    queryFn: async () => {
      const { data: units } = await supabase
        .from('curriculum_units')
        .select('id')
        .eq('level_id', levelId)
      const unitIds = (units || []).map(u => u.id)
      if (!unitIds.length) return {}

      const { data } = await supabase
        .from('unit_progress')
        .select('unit_id, percentage')
        .eq('student_id', studentId)
        .in('unit_id', unitIds)

      return Object.fromEntries((data || []).map(r => [r.unit_id, r.percentage]))
    },
    enabled: !!studentId && !!levelId,
    staleTime: 30000,
  })
}

// ─────────────────────────────────────────────────────────────
// Legacy batch variant — used by UnitContent's V2 unit page
// (keeps the same interface as before)
// ─────────────────────────────────────────────────────────────
export function useLevelProgress(studentId, units) {
  const unitIds = units?.map(u => u.id) || []

  return useQuery({
    queryKey: ['level-progress-comprehensive', studentId, unitIds.join(',')],
    queryFn: async () => {
      if (!unitIds.length) return {}

      // Try DB rows first
      const { data: dbRows } = await supabase
        .from('unit_progress')
        .select('unit_id, numerator, denominator, percentage, breakdown')
        .eq('student_id', studentId)
        .in('unit_id', unitIds)

      const result = {}
      const needFrontend = []

      for (const uid of unitIds) {
        const row = (dbRows || []).find(r => r.unit_id === uid)
        if (row) {
          result[uid] = mapDbRowToProgressShape(row)
        } else {
          needFrontend.push(uid)
        }
      }

      // For units without a DB row yet, fall back to frontend calculation
      if (needFrontend.length > 0) {
        const frontendResults = await computeFrontendProgressBatch(studentId, needFrontend)
        Object.assign(result, frontendResults)
      }

      return result
    },
    enabled: !!studentId && unitIds.length > 0,
    staleTime: 60000,
  })
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Map DB unit_progress row → the shape useUnitData.js expects:
 * { overall, tabs, tabStatus, activeCount, completedCount }
 */
function mapDbRowToProgressShape(row) {
  const { percentage, numerator, denominator, breakdown } = row
  const completion = breakdown?.completion || {}
  const inventory  = breakdown?.inventory  || {}

  // Build tabStatus from inventory + completion data
  const tabStatus = {}
  const tabs = {}

  const sectionMap = {
    reading:      ['reading_done',      (v_inventory) => v_inventory.reading      ],
    grammar:      ['grammar_done',      () => 1],
    listening:    ['listening_done',    () => 1],
    speaking:     ['speaking_done',     () => 1],
    writing:      ['writing_done',      () => 1],
    vocabulary:   ['vocabulary_engaged',() => 1],
    pronunciation:['pronunciation_done',() => 1],
    assessment:   ['assessment_passed', () => 1],
  }

  let completedCount = 0
  let activeCount = 0

  for (const [section, [doneKey]] of Object.entries(sectionMap)) {
    const inInventory = inventory[section] != null ||
      (section === 'vocabulary' && inventory.vocabulary_total != null) ||
      (section === 'reading'    && inventory.reading         != null)
    if (!inInventory) continue

    activeCount++
    const done = completion[doneKey]
    const isComplete = done != null && done > 0

    if (section === 'vocabulary') {
      const engaged  = completion.vocabulary_engaged || 0
      const needed   = completion.vocabulary_needed  || 1
      const total    = inventory.vocabulary_total    || 1
      const pct      = Math.round((engaged / total) * 100)
      const complete = engaged >= needed
      tabStatus[section] = complete ? 'completed' : engaged > 0 ? 'in_progress' : 'not_started'
      tabs[section]      = { label: section, progress: pct, weight: 18 }
      if (complete) completedCount++
    } else if (section === 'reading') {
      const readingDone  = completion.reading_done || 0
      const readingTotal = inventory.reading        || 1
      const complete     = readingDone >= readingTotal
      tabStatus[section] = complete ? 'completed' : readingDone > 0 ? 'in_progress' : 'not_started'
      tabs[section]      = { label: section, progress: complete ? 100 : Math.round((readingDone / readingTotal) * 100), weight: 10 }
      if (complete) completedCount++
    } else {
      tabStatus[section] = isComplete ? 'completed' : 'not_started'
      tabs[section]      = { label: section, progress: isComplete ? 100 : 0, weight: 13 }
      if (isComplete) completedCount++
    }
  }

  return {
    overall: percentage,
    tabs,
    tabStatus,
    activeCount,
    completedCount,
    numerator,
    denominator,
  }
}

/**
 * Frontend fallback calculation for a single unit (used when DB row not yet populated).
 * Preserves the exact same logic as the old hook.
 */
async function computeFrontendProgress(studentId, unitId) {
  const { data: readings } = await supabase
    .from('curriculum_readings')
    .select('id, reading_label')
    .eq('unit_id', unitId)
    .order('reading_label')

  const readingA  = readings?.find(r => r.reading_label === 'A')
  const readingB  = readings?.find(r => r.reading_label === 'B')
  const readingIds = (readings || []).map(r => r.id)

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

  const { data: progressRecords } = await supabase
    .from('student_curriculum_progress')
    .select('section_type, status, reading_id, ai_feedback, answers, is_best')
    .eq('student_id', studentId)
    .eq('unit_id', unitId)
    .neq('is_best', false)

  let vocabularyMastery = null
  if (vocabIds.length > 0) {
    const { data: mastery } = await supabase
      .from('vocabulary_word_mastery')
      .select('mastery_level')
      .eq('student_id', studentId)
      .in('vocabulary_id', vocabIds)

    const arr = mastery || []
    vocabularyMastery = {
      totalWords: vocabIds.length,
      masteredCount: arr.filter(m => m.mastery_level === 'mastered').length,
      learningCount:  arr.filter(m => m.mastery_level === 'learning').length,
      newCount: vocabIds.length - arr.filter(m => m.mastery_level === 'mastered').length - arr.filter(m => m.mastery_level === 'learning').length,
    }
  }

  return calculateUnitProgress({ unitContent, studentProgress: progressRecords || [], vocabularyMastery })
}

/**
 * Frontend fallback for a batch of unit IDs.
 */
async function computeFrontendProgressBatch(studentId, unitIds) {
  if (!unitIds.length) return {}

  const [
    { data: allProgress },
    { data: allReadings },
    { data: allGrammar },
    { data: allListening },
    { data: allWriting },
    { data: allSpeaking },
    { data: allAssessments },
    { data: allPronunciation },
  ] = await Promise.all([
    supabase.from('student_curriculum_progress').select('unit_id, section_type, status, reading_id, ai_feedback, answers, is_best').eq('student_id', studentId).in('unit_id', unitIds).neq('is_best', false),
    supabase.from('curriculum_readings').select('id, unit_id, reading_label').in('unit_id', unitIds),
    supabase.from('curriculum_grammar').select('id, unit_id').in('unit_id', unitIds),
    supabase.from('curriculum_listening').select('id, unit_id').in('unit_id', unitIds),
    supabase.from('curriculum_writing').select('id, unit_id').in('unit_id', unitIds),
    supabase.from('curriculum_speaking').select('id, unit_id').in('unit_id', unitIds),
    supabase.from('curriculum_assessments').select('id, unit_id').in('unit_id', unitIds),
    supabase.from('curriculum_pronunciation').select('id, unit_id').in('unit_id', unitIds),
  ])

  const allReadingIds = (allReadings || []).map(r => r.id)
  const { data: allVocab } = allReadingIds.length > 0
    ? await supabase.from('curriculum_vocabulary').select('id, reading_id').in('reading_id', allReadingIds)
    : { data: [] }
  const allVocabIds = (allVocab || []).map(v => v.id)
  const { data: allMastery } = allVocabIds.length > 0
    ? await supabase.from('vocabulary_word_mastery').select('vocabulary_id, mastery_level').eq('student_id', studentId).in('vocabulary_id', allVocabIds)
    : { data: [] }

  const result = {}
  for (const uid of unitIds) {
    const unitReadings = (allReadings || []).filter(r => r.unit_id === uid)
    const readingA = unitReadings.find(r => r.reading_label === 'A')
    const readingB = unitReadings.find(r => r.reading_label === 'B')
    const unitReadingIds = unitReadings.map(r => r.id)
    const unitVocabIds = (allVocab || []).filter(v => unitReadingIds.includes(v.reading_id)).map(v => v.id)
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
    const mc = unitMastery.filter(m => m.mastery_level === 'mastered').length
    const lc = unitMastery.filter(m => m.mastery_level === 'learning').length
    const vocMastery = unitVocabIds.length > 0
      ? { totalWords: unitVocabIds.length, masteredCount: mc, learningCount: lc, newCount: unitVocabIds.length - mc - lc }
      : null

    result[uid] = calculateUnitProgress({ unitContent, studentProgress: unitProgress, vocabularyMastery: vocMastery })
  }
  return result
}
