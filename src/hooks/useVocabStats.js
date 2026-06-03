import { useQuery } from '@tanstack/react-query'
import { useAuthProfile } from '../stores/authStore'
import { getDashboardCounts } from '../services/vocab'

/**
 * Unified vocabulary stats for any surface header: { dueCount, newAvailable,
 * streak, wordsKnown, total, learning }. One source of truth (vocab_cards via
 * services/vocab), so every surface + the sidebar badge agree.
 */
export function useVocabStats(dailyNewLimit = 20) {
  const profile = useAuthProfile()
  const profileId = profile?.id
  return useQuery({
    queryKey: ['vocab-stats', profileId, dailyNewLimit],
    queryFn: () => getDashboardCounts(profileId, dailyNewLimit),
    enabled: !!profileId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}
