import { useQuery } from '@tanstack/react-query'
import { getJourney } from '@/services/vocab'

/**
 * The "Path of Light" journey for a student: the trail of regions (themed units)
 * with per-region progress, the current stop, and headline stats (words known, due).
 */
export function useVocabJourney(profileId) {
  return useQuery({
    queryKey: ['vocab-journey', profileId],
    queryFn: () => getJourney(profileId),
    enabled: !!profileId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}
