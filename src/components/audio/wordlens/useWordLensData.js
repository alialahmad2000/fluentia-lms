import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

// Tier-fallback lookup.
//
// 1. `prefetched` — caller (ReadingTab) already has the curriculum_vocabulary row
//    (vocab-marked word). Use it directly.
// 2. `curriculum_vocabulary` — single DB query by lowered word. Returns definition_ar,
//    audio_url, example_sentence, word_family, etc.
// 3. `vocab-quick-meaning` edge fn — Haiku call; the function itself caches into
//    public.vocab_cache so repeat lookups across students are free.
async function tierFallbackLookup({ word, prefetched }) {
  if (prefetched && (prefetched.definition_ar || prefetched.audio_url)) {
    return {
      curriculum_vocabulary_id: prefetched.id || null,
      meaning_ar: prefetched.definition_ar || null,
      part_of_speech: prefetched.part_of_speech || null,
      example_sentence: prefetched.example_sentence || null,
      word_family: prefetched.word_family || null,
      pronunciation_ipa: prefetched.pronunciation_ipa || null,
      audio_url: prefetched.audio_url || null,
      source: 'prefetched',
    }
  }

  const lowerWord = word.toLowerCase()

  // Tier 1: curriculum_vocabulary (any reading)
  const { data: cv, error: cvErr } = await supabase
    .from('curriculum_vocabulary')
    .select('id, definition_ar, audio_url, example_sentence, part_of_speech, word_family, pronunciation_ipa')
    .ilike('word', lowerWord)
    .limit(1)
    .maybeSingle()

  if (!cvErr && cv && cv.definition_ar) {
    return {
      curriculum_vocabulary_id: cv.id || null,
      meaning_ar: cv.definition_ar,
      part_of_speech: cv.part_of_speech || null,
      example_sentence: cv.example_sentence || null,
      word_family: cv.word_family || null,
      pronunciation_ipa: cv.pronunciation_ipa || null,
      audio_url: cv.audio_url || null,
      source: 'curriculum',
    }
  }

  // Tier 2: vocab-quick-meaning edge fn (already hits vocab_cache internally)
  const { data: ai, error: aiErr } = await supabase.functions.invoke('vocab-quick-meaning', {
    body: { word: lowerWord },
  })
  if (aiErr || !ai?.meaning_ar) return null

  return {
    curriculum_vocabulary_id: null,
    meaning_ar: ai.meaning_ar,
    part_of_speech: ai.part_of_speech || null,
    example_sentence: null,
    word_family: null,
    pronunciation_ipa: null,
    audio_url: cv?.audio_url || null,
    source: 'ai',
  }
}

export function useWordLensData({ word, readingId, unitId, studentId, contextSentence, prefetched }) {
  const queryClient = useQueryClient()
  const lowerWord = (word || '').toLowerCase()

  const lookup = useQuery({
    queryKey: ['wordlens-lookup', lowerWord, readingId || null, prefetched?.id || null],
    queryFn: () => tierFallbackLookup({ word, prefetched }),
    enabled: !!word,
    staleTime: 5 * 60 * 1000,
  })

  const savedQuery = useQuery({
    queryKey: ['wordlens-saved', studentId, lowerWord],
    queryFn: async () => {
      if (!studentId || !lowerWord) return null
      const { data, error } = await supabase
        .from('student_saved_words')
        .select('id')
        .eq('student_id', studentId)
        .eq('word', lowerWord)
        .maybeSingle()
      if (error) return null
      return data?.id || null
    },
    enabled: !!studentId && !!lowerWord,
    staleTime: 30 * 1000,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!studentId || !lowerWord) throw new Error('missing studentId/word')
      const meaning = lookup.data?.meaning_ar || null
      const payload = {
        student_id: studentId,
        word: lowerWord,
        meaning,
        source: 'reading_passage',
        source_unit_id: unitId || null,
        source_reference: readingId || null,
        context_sentence: contextSentence || null,
        curriculum_vocabulary_id: lookup.data?.curriculum_vocabulary_id || null,
        next_review_at: new Date().toISOString(),
      }
      // MEGA-FIX V2 Phase E: .select() after upsert so RLS failures surface
      // instead of silently dropping ("save click did nothing").
      const { data, error } = await supabase
        .from('student_saved_words')
        .upsert(payload, { onConflict: 'student_id,word' })
        .select()
      if (error) throw error
      if (!data || data.length === 0) throw new Error('save_returned_no_rows')
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-words-set', studentId] })
      queryClient.invalidateQueries({ queryKey: ['saved-words', studentId] })
      queryClient.invalidateQueries({ queryKey: ['wordlens-saved', studentId, lowerWord] })
      window.dispatchEvent(new CustomEvent('fluentia:vocab-added', { detail: { word: lowerWord } }))
    },
  })

  const unsaveMutation = useMutation({
    mutationFn: async () => {
      if (!studentId || !lowerWord) throw new Error('missing studentId/word')
      const { error } = await supabase
        .from('student_saved_words')
        .delete()
        .eq('student_id', studentId)
        .eq('word', lowerWord)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-words-set', studentId] })
      queryClient.invalidateQueries({ queryKey: ['saved-words', studentId] })
      queryClient.invalidateQueries({ queryKey: ['wordlens-saved', studentId, lowerWord] })
    },
  })

  return {
    isLoading: lookup.isLoading,
    isError: lookup.isError,
    data: {
      word,
      meaning_ar: lookup.data?.meaning_ar || null,
      part_of_speech: lookup.data?.part_of_speech || null,
      example_sentence: lookup.data?.example_sentence || null,
      word_family: lookup.data?.word_family || null,
      pronunciation_ipa: lookup.data?.pronunciation_ipa || null,
      audio_url: lookup.data?.audio_url || null,
      curriculum_vocabulary_id: lookup.data?.curriculum_vocabulary_id || null,
      source: lookup.data?.source || null,
      isSaved: !!savedQuery.data,
    },
    save: () => saveMutation.mutateAsync(),
    unsave: () => unsaveMutation.mutateAsync(),
    isSaving: saveMutation.isPending,
    isUnsaving: unsaveMutation.isPending,
  }
}
