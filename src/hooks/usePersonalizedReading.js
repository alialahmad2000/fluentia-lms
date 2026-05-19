import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useUserInterests } from '@/hooks/useUserInterests'
import { isPersonalizationEnabled } from '@/lib/featureFlags'

/**
 * Returns the best personalized variant for the current canonical reading,
 * using the student's priority-ordered interest buckets.
 * Returns null when no interests are set, no matching variant exists, or
 * the global personalization kill-switch is OFF (app_config.personalization_enabled).
 *
 * PERSONALIZATION-KILL-SWITCH 2026-05-19: kept short-circuited even when callers
 * pass valid ids/interests, until app_config.personalization_enabled = true.
 */
export function usePersonalizedReading(canonicalReadingId) {
  const { data: interestsRow } = useUserInterests()
  const interests = interestsRow?.interests ?? []

  return useQuery({
    queryKey: ['personalized-reading', canonicalReadingId, interests.join(',')],
    queryFn: async () => {
      const flagOn = await isPersonalizationEnabled()
      if (!flagOn) return null
      if (!canonicalReadingId || interests.length === 0) return null

      const { data, error } = await supabase
        .from('personalized_readings')
        .select('id, interest_bucket, title, body, word_count, cefr_level')
        .eq('canonical_reading_id', canonicalReadingId)
        .eq('is_published', true)
        .in('interest_bucket', interests)

      if (error) throw error
      if (!data || data.length === 0) return null

      for (const key of interests) {
        const match = data.find(d => d.interest_bucket === key)
        if (match) return match
      }
      return data[0]
    },
    enabled: Boolean(canonicalReadingId) && interests.length > 0,
    staleTime: 1000 * 60 * 60,
  })
}
