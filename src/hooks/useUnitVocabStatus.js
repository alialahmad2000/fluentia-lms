/**
 * useUnitVocabStatus
 * Aggregated data hook for the VocabularyTab Hero (Prompt 05).
 *
 * Returns the inputs for:
 *   - ProgressOrb       (totalWords, masteredWords, learningWords, newWords, masteryPct)
 *   - SmartStatusPill   (dueForReviewToday, newCardsAvailableToday)
 *   - ContinueArc       (continueAction decision tree — see below)
 *
 * Schema reality (Phase A discovery, do not refactor):
 *   - curriculum_vocabulary rows belong to a reading_id which belongs to a unit_id
 *     → resolve unit → readings → vocabulary ids in one chained query.
 *   - vocabulary_word_mastery uses text states 'new' | 'learning' | 'mastered'
 *     (NOT numeric 1/2/3 as some older prompts assumed).
 *   - vocabulary_word_mastery.student_id == profile.id == auth.uid() (verified
 *     in WordExerciseModal + useVocabularyMastery).
 *   - curriculum_vocabulary_srs.student_id == same value (Prompt 03 audit).
 *
 * Continue Arc decision tree (priority order):
 *   1. dueForReviewToday > 0      → 'srs_review'        (route /student/srs)
 *   2. learningWords > 0          → 'next_word' (oldest-touched learning word)
 *   3. newWords > 0               → 'next_word' (first never-touched word in unit order)
 *   4. masteryPct >= 100          → 'celebrate'
 *   5. otherwise                  → 'start_exploration'
 *
 * Caller passes profileId and unitId. We don't pull from auth here — keeps
 * the hook pure + testable.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  splitIntoChunks,
  computeChunkStatus,
  CHUNK_SIZE_OPTIONS,
  DEFAULT_CHUNK_SIZE,
} from '../utils/vocabularyChunks'

const EMPTY_STATUS = Object.freeze({
  totalWords: 0,
  masteredWords: 0,
  learningWords: 0,
  newWords: 0,
  masteryPct: 0,
  dueForReviewToday: 0,
  newCardsAvailableToday: 0,
  continueAction: {
    label: 'ابدأ استكشاف الوحدة',
    target: 'start_exploration',
    payload: null,
  },
})

export function useUnitVocabStatus(unitId, profileId) {
  const enabled = !!unitId && !!profileId

  const query = useQuery({
    queryKey: ['unit-vocab-status', unitId, profileId],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      // 1) Get all reading_ids for this unit, then all vocab_ids under those readings
      const { data: readings, error: readErr } = await supabase
        .from('curriculum_readings')
        .select('id')
        .eq('unit_id', unitId)
      if (readErr) throw readErr
      const readingIds = (readings || []).map((r) => r.id)
      if (readingIds.length === 0) return { ...EMPTY_STATUS }

      // Pull vocab id, word, sort_order so we can pick the "first" un-started word
      // in curriculum order for ContinueArc.
      const { data: vocab, error: vErr } = await supabase
        .from('curriculum_vocabulary')
        .select('id, word, sort_order, reading_id')
        .in('reading_id', readingIds)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('word', { ascending: true })
      if (vErr) throw vErr
      const totalWords = vocab?.length ?? 0
      if (totalWords === 0) return { ...EMPTY_STATUS }

      const vocabIds = vocab.map((v) => v.id)

      // 2) Run parallel: mastery rows + SRS due + today's intro count + autoplay/dailyLimit pref
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayIso = today.toISOString()
      const nowIso = new Date().toISOString()

      const [masteryRes, srsDueRes, todayIntroRes, prefsRes] = await Promise.all([
        supabase
          .from('vocabulary_word_mastery')
          .select('vocabulary_id, mastery_level, updated_at')
          .eq('student_id', profileId)
          .in('vocabulary_id', vocabIds),
        // SRS due for this unit's words right now (state in learning/review/relearning)
        supabase
          .from('curriculum_vocabulary_srs')
          .select('vocabulary_id', { count: 'exact', head: true })
          .eq('student_id', profileId)
          .in('vocabulary_id', vocabIds)
          .in('state', ['review', 'learning', 'relearning'])
          .lte('due', nowIso),
        // New cards (state='new') the student already introduced today
        // (we use srs_review_logs because that's where state_before='new' is captured)
        supabase
          .from('srs_review_logs')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', profileId)
          .eq('state_before', 'new')
          .in('vocabulary_id', vocabIds)
          .gte('reviewed_at', todayIso),
        // Daily new-cards limit + preferred chunk size from profile
        supabase
          .from('profiles')
          .select('srs_daily_new_cards, preferred_chunk_size')
          .eq('id', profileId)
          .maybeSingle(),
      ])

      if (masteryRes.error) throw masteryRes.error
      if (srsDueRes.error) throw srsDueRes.error
      if (todayIntroRes.error) throw todayIntroRes.error
      // prefs error is non-fatal — fall back to default

      const masteryRows = masteryRes.data || []
      const masteryByVocab = new Map(
        masteryRows.map((r) => [r.vocabulary_id, r])
      )

      let masteredWords = 0
      let learningWords = 0
      for (const row of masteryRows) {
        if (row.mastery_level === 'mastered') masteredWords++
        else if (row.mastery_level === 'learning') learningWords++
      }
      const touchedCount = masteryByVocab.size
      const newWords = Math.max(0, totalWords - touchedCount)
      const masteryPct = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0

      const dueForReviewToday = srsDueRes.count ?? 0
      const dailyNewLimit = Math.max(0, Number(prefsRes?.data?.srs_daily_new_cards ?? 20))
      const introducedToday = todayIntroRes.count ?? 0
      const newCardsAvailableToday = Math.max(0, Math.min(newWords, dailyNewLimit - introducedToday))

      // Determine the student's current chunk (Prompt 06 coordination).
      // The "current chunk" is the first non-completed unlocked chunk,
      // using the same slicing + 80% threshold as useUnitChunks.
      const rawChunkSize = Number(prefsRes?.data?.preferred_chunk_size)
      const chunkSize = CHUNK_SIZE_OPTIONS.includes(rawChunkSize)
        ? rawChunkSize
        : DEFAULT_CHUNK_SIZE
      const rawChunks = splitIntoChunks(vocab, chunkSize)
      const masteryMapById = Object.fromEntries(
        Array.from(masteryByVocab.entries()).map(([id, m]) => [id, m])
      )
      const chunksWithStatus = computeChunkStatus(rawChunks, masteryMapById)
      const currentChunk =
        chunksWithStatus.find((c) => c.unlocked && !c.complete) ??
        chunksWithStatus[0] ??
        null

      // 3) Compute Continue Arc action (chunk-aware)
      const continueAction = deriveContinueAction({
        dueForReviewToday,
        learningWords,
        newWords,
        masteryPct,
        vocab,
        masteryByVocab,
        currentChunk,
      })

      return {
        totalWords,
        masteredWords,
        learningWords,
        newWords,
        masteryPct,
        dueForReviewToday,
        newCardsAvailableToday,
        continueAction,
      }
    },
  })

  return {
    ...(query.data || EMPTY_STATUS),
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Pure decision tree — exported for test/preview. Receives derived
 * counts + the vocab list (with sort_order) and the mastery map
 * keyed by vocabulary_id so it can pick a concrete next-word.
 */
export function deriveContinueAction({
  dueForReviewToday,
  learningWords,
  newWords,
  masteryPct,
  vocab,
  masteryByVocab,
  currentChunk = null,
}) {
  if (dueForReviewToday > 0) {
    const label =
      dueForReviewToday === 1
        ? 'راجع كلمة من هذي الوحدة'
        : `راجع ${dueForReviewToday} كلمة من هذي الوحدة`
    return {
      label,
      target: 'srs_review',
      payload: { route: '/student/srs' },
    }
  }

  // The pool of words we'll search for next-word picks: prefer the current
  // chunk's words if a chunk is provided AND unlocked AND not complete;
  // fall back to the full unit vocab otherwise.
  const chunkPool =
    currentChunk?.words && currentChunk.unlocked && !currentChunk.complete
      ? currentChunk.words
      : null
  const primaryPool = chunkPool || vocab

  if (learningWords > 0) {
    // Pick the oldest-touched learning word within the primary pool.
    let pick = null
    let pickTs = Infinity
    for (const v of primaryPool) {
      const m = masteryByVocab.get(v.id)
      if (!m || m.mastery_level !== 'learning') continue
      const ts = m.updated_at ? new Date(m.updated_at).getTime() : 0
      if (ts < pickTs) {
        pickTs = ts
        pick = v
      }
    }
    // If the chunk had no learning word, fall back to the whole vocab.
    if (!pick && chunkPool) {
      for (const v of vocab) {
        const m = masteryByVocab.get(v.id)
        if (!m || m.mastery_level !== 'learning') continue
        const ts = m.updated_at ? new Date(m.updated_at).getTime() : 0
        if (ts < pickTs) {
          pickTs = ts
          pick = v
        }
      }
    }
    return {
      label: 'تابع التقدم',
      target: 'next_word',
      payload: { vocabularyId: pick?.id ?? null, word: pick?.word ?? null },
    }
  }

  if (newWords > 0) {
    // First never-touched word in current-chunk order (or unit order as fallback).
    let pick = primaryPool.find((v) => !masteryByVocab.has(v.id))
    if (!pick && chunkPool) {
      pick = vocab.find((v) => !masteryByVocab.has(v.id))
    }
    return {
      label: 'ابدأ كلمة جديدة',
      target: 'next_word',
      payload: { vocabularyId: pick?.id ?? null, word: pick?.word ?? null },
    }
  }

  if (masteryPct >= 100) {
    return {
      label: 'كل كلمات الوحدة أتقنتها! 🎉',
      target: 'celebrate',
      payload: null,
    }
  }

  return {
    label: 'ابدأ استكشاف الوحدة',
    target: 'start_exploration',
    payload: null,
  }
}
