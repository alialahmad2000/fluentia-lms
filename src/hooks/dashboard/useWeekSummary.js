import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function useWeekSummary(studentId) {
  return useQuery({
    queryKey: ['weekSummary', studentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_student_week_summary', {
        p_student_id: studentId,
      })
      if (error) throw error
      return data?.[0] ?? null
    },
    enabled: !!studentId,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  })
}
