import { useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import {
  splitIntoChunks,
  computeChunkStatus,
  annotateChunksWithFilter,
  DEFAULT_CHUNK_SIZE,
  CHUNK_SIZE_OPTIONS,
} from '../utils/vocabularyChunks'

/**
 * Combines a sorted word list + mastery map into chunked state.
 *
 * @param {Array} unitWords  — words already filtered to a single unit, sorted by sort_order
 * @param {Object} masteryMap — { [vocab_id]: mastery_record }
 * @param {number} chunkSize  — chunk size selected by student
 * @param {'all'|'new'|'difficult'} filter
 */
export function useVocabularyChunks(unitWords, masteryMap, chunkSize, filter = 'all') {
  return useMemo(() => {
    const size = CHUNK_SIZE_OPTIONS.includes(chunkSize) ? chunkSize : DEFAULT_CHUNK_SIZE
    const raw = splitIntoChunks(unitWords || [], size)
    const withStatus = computeChunkStatus(raw, masteryMap || {})
    const annotated = annotateChunksWithFilter(withStatus, masteryMap || {}, filter)
    return annotated
  }, [unitWords, masteryMap, chunkSize, filter])
}

/**
 * Reads and updates the student's preferred chunk size preference on
 * profiles.preferred_chunk_size. Falls back to the default on failure.
 */
export function useChunkSizePreference() {
  const queryClient = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  const setAuthState = useAuthStore.setState

  const chunkSize = CHUNK_SIZE_OPTIONS.includes(profile?.preferred_chunk_size)
    ? profile.preferred_chunk_size
    : DEFAULT_CHUNK_SIZE

  const mutation = useMutation({
    mutationFn: async (newSize) => {
      if (!profile?.id) throw new Error('No profile loaded')
      if (!CHUNK_SIZE_OPTIONS.includes(newSize)) {
        throw new Error(`Invalid chunk size ${newSize}`)
      }
      const { data, error } = await supabase
        .from('profiles')
        .update({ preferred_chunk_size: newSize })
        .eq('id', profile.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      // Optimistically update authStore so UI reflects immediately
      setAuthState((s) => ({ profile: { ...s.profile, ...data } }))
      queryClient.invalidateQueries({ queryKey: ['profile', profile?.id] })
    },
  })

  const setChunkSize = useCallback(
    (newSize) => {
      // Optimistic local update so UI feels instant even if network is slow
      setAuthState((s) => ({
        profile: { ...s.profile, preferred_chunk_size: newSize },
      }))
      return mutation.mutateAsync(newSize).catch((err) => {
        console.error('Failed to save chunk size preference:', err)
        // Roll back to default on failure (toast handled by caller)
        setAuthState((s) => ({
          profile: { ...s.profile, preferred_chunk_size: DEFAULT_CHUNK_SIZE },
        }))
        throw err
      })
    },
    [mutation, setAuthState],
  )

  return { chunkSize, setChunkSize, isSaving: mutation.isPending }
}
