/**
 * useUnitChunks
 * Data wrapper for the VocabularyTab Journey Lane (Prompt 06).
 *
 * Fetches the unit's vocabulary, the student's mastery map, and the
 * preferred chunk size, then applies the existing pure helpers from
 * src/utils/vocabularyChunks.js to produce a chunk array with locked /
 * ready / complete state per the 80% mastery unlock rule.
 *
 * Reuses Prompt 30 infrastructure:
 *   - splitIntoChunks, computeChunkStatus, isWordPassing (utils)
 *   - useChunkSizePreference (hook) — already writes profiles.preferred_chunk_size
 *
 * Schema reality (Phase A discovery):
 *   - Unit→vocab via curriculum_readings (no direct unit_id on vocab)
 *   - curriculum_readings.sort_order is the reading order column
 *   - curriculum_vocabulary.sort_order is the in-reading order column
 *   - vocabulary_word_mastery.mastery_level is TEXT 'new'|'learning'|'mastered'
 *   - All student data keyed on student_id == profile.id == auth.uid()
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  splitIntoChunks,
  computeChunkStatus,
  CHUNK_SIZE_OPTIONS,
  DEFAULT_CHUNK_SIZE,
  MASTERY_THRESHOLD,
} from '../utils/vocabularyChunks'
import { useChunkSizePreference } from './useVocabularyChunks'

const CHUNK_ORDINAL_AR = {
  1: 'الأولى',
  2: 'الثانية',
  3: 'الثالثة',
  4: 'الرابعة',
  5: 'الخامسة',
  6: 'السادسة',
  7: 'السابعة',
  8: 'الثامنة',
  9: 'التاسعة',
  10: 'العاشرة',
}

const toArabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

function chunkTitle(number) {
  return CHUNK_ORDINAL_AR[number]
    ? `المجموعة ${CHUNK_ORDINAL_AR[number]}`
    : `المجموعة ${toArabicNum(number)}`
}

function chunkRangeLabel(startIdx, endIdx) {
  // Convert 0-based indices to 1-based for display
  const from = toArabicNum(startIdx + 1)
  const to = toArabicNum(endIdx + 1)
  return `الكلمات ${from}–${to}`
}

/**
 * @returns {{
 *   chunks: Array<{
 *     index: number,
 *     number: number,
 *     title: string,
 *     rangeLabel: string,
 *     words: Array,
 *     total: number,
 *     mastered: number,
 *     learning: number,
 *     newCount: number,
 *     passingCount: number,
 *     masteryPct: number,
 *     isUnlocked: boolean,
 *     isCompleted: boolean,
 *     status: 'locked'|'ready'|'complete'
 *   }>,
 *   chunkSize: number,
 *   setChunkSize: (size: 5|10|15|20|25) => Promise<void>,
 *   currentChunk: Object|null,
 *   isLoading: boolean,
 *   refetch: () => void,
 * }}
 */
export function useUnitChunks(unitId, profileId) {
  const { chunkSize, setChunkSize, isSaving } = useChunkSizePreference()

  const enabled = !!unitId && !!profileId

  const query = useQuery({
    queryKey: ['unit-chunks', unitId, profileId, chunkSize],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      // 1. Resolve readings for this unit (ordered)
      const { data: readings, error: rErr } = await supabase
        .from('curriculum_readings')
        .select('id, sort_order')
        .eq('unit_id', unitId)
        .order('sort_order', { ascending: true, nullsFirst: false })
      if (rErr) throw rErr
      const readingIds = (readings || []).map((r) => r.id)
      if (readingIds.length === 0) return { rawWords: [], masteryMap: {} }

      // Build reading->order map so we can stably sort words across readings
      const readingOrder = new Map(
        (readings || []).map((r, i) => [r.id, r.sort_order ?? i])
      )

      // 2. All vocab under those readings
      const { data: vocab, error: vErr } = await supabase
        .from('curriculum_vocabulary')
        .select(
          'id, word, definition_en, definition_ar, example_sentence, part_of_speech, pronunciation_ipa, audio_url, image_url, reading_id, sort_order, tier, cefr_level'
        )
        .in('reading_id', readingIds)
      if (vErr) throw vErr

      // 3. Mastery rows for this student × these vocab ids
      const vocabIds = (vocab || []).map((v) => v.id)
      let masteryMap = {}
      if (vocabIds.length > 0) {
        const { data: mastery, error: mErr } = await supabase
          .from('vocabulary_word_mastery')
          .select('vocabulary_id, mastery_level, updated_at')
          .eq('student_id', profileId)
          .in('vocabulary_id', vocabIds)
        if (mErr) throw mErr
        for (const row of mastery || []) {
          masteryMap[row.vocabulary_id] = row
        }
      }

      // 4. Sort vocab globally: by reading order, then by in-reading sort_order, then by word
      const sorted = (vocab || []).slice().sort((a, b) => {
        const ra = readingOrder.get(a.reading_id) ?? Infinity
        const rb = readingOrder.get(b.reading_id) ?? Infinity
        if (ra !== rb) return ra - rb
        const sa = a.sort_order ?? Infinity
        const sb = b.sort_order ?? Infinity
        if (sa !== sb) return sa - sb
        return String(a.word).localeCompare(String(b.word))
      })

      return { rawWords: sorted, masteryMap }
    },
  })

  // 5. Derive chunks (memoized) — pure computation atop the fetched data
  const chunks = useMemo(() => {
    const data = query.data
    if (!data || !Array.isArray(data.rawWords) || data.rawWords.length === 0) return []
    const sizeValid = CHUNK_SIZE_OPTIONS.includes(chunkSize) ? chunkSize : DEFAULT_CHUNK_SIZE
    const raw = splitIntoChunks(data.rawWords, sizeValid)
    const withStatus = computeChunkStatus(raw, data.masteryMap || {})

    return withStatus.map((c) => {
      // Recompute fine-grained mastery counts (the util only exposes passingCount)
      let mastered = 0
      let learning = 0
      let newCount = 0
      for (const w of c.words) {
        const m = data.masteryMap[w.id]
        if (!m || m.mastery_level === 'new') newCount++
        else if (m.mastery_level === 'learning') learning++
        else if (m.mastery_level === 'mastered') mastered++
      }
      // Display % from passingCount (matches the util's threshold logic)
      const masteryPct = c.words.length > 0
        ? Math.round((c.passingCount / c.words.length) * 100)
        : 0
      const number = c.index + 1
      return {
        index: c.index,
        number,
        title: chunkTitle(number),
        rangeLabel: chunkRangeLabel(c.startIdx, c.endIdx),
        words: c.words,
        total: c.words.length,
        mastered,
        learning,
        newCount,
        passingCount: c.passingCount,
        masteryPct,
        isUnlocked: c.unlocked,
        isCompleted: c.complete,
        status: c.status,
      }
    })
  }, [query.data, chunkSize])

  // 6. currentChunk = first non-completed unlocked chunk (in-progress)
  const currentChunk = useMemo(() => {
    if (!chunks.length) return null
    return (
      chunks.find((c) => c.isUnlocked && !c.isCompleted) ??
      chunks[0] /* fall back to first */
    )
  }, [chunks])

  return {
    chunks,
    chunkSize,
    setChunkSize,
    currentChunk,
    isLoading: query.isLoading || isSaving,
    refetch: query.refetch,
    threshold: MASTERY_THRESHOLD, // 0.8 — handy for the UI to format toasts
  }
}
