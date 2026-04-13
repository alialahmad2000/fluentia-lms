import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function useHistoryBounds(studentId) {
  return useQuery({
    queryKey: ['historyBounds', studentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_student_history_bounds', {
        p_student_id: studentId,
      })
      if (error) throw error
      return data?.[0] ?? null
    },
    enabled: !!studentId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}
