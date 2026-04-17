import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useSRSCounts(studentId) {
  return useQuery({
    queryKey: ['srs-counts', studentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('srs_get_counts', {
        p_student_id: studentId,
      })
      if (error) throw error
      return data?.[0] ?? { due_today: 0, learning: 0, mastered: 0, new_last_7d: 0, reviewed_today: 0 }
    },
    enabled: !!studentId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}

export function useSRSDue(studentId, { limit = 20, enabled = true } = {}) {
  return useQuery({
    queryKey: ['srs-due', studentId, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('srs_get_due', {
        p_student_id: studentId,
        p_limit: limit,
      })
      if (error) throw error
      return data ?? []
    },
    enabled: !!studentId && enabled,
    staleTime: 15_000,
  })
}
