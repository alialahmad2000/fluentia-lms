import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useUserInterests } from '@/hooks/useUserInterests'

/**
 * Returns the best personalized variant for the current canonical reading,
 * using the student's priority-ordered interest buckets.
 * Returns null when no interests are set or no matching variant exists.
 */
export function usePersonalizedReading(canonicalReadingId) {
  const { data: interestsRow } = useUserInterests()
  const interests = interestsRow?.interests ?? []

  return useQuery({
    queryKey: ['personalized-reading', canonicalReadingId, interests.join(',')],
    queryFn: async () => {
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
