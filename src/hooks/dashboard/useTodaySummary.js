import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function useTodaySummary(studentId) {
  return useQuery({
    queryKey: ['todaySummary', studentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_student_today_summary', {
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
