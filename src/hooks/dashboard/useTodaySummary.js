import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function useDaySummary(studentId, date = null) {
  const dateStr = date ? date.toISOString().slice(0, 10) : null

  return useQuery({
    queryKey: ['daySummary', studentId, dateStr],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_student_day_summary', {
        p_student_id: studentId,
        p_date: dateStr,
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

export const useTodaySummary = (studentId) => useDaySummary(studentId, null)
