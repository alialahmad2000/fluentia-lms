import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export function useLevelTopMovers(studentId) {
  return useQuery({
    queryKey: ['levelTopMovers', studentId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_level_top_movers', {
        p_student_id: studentId,
      })
      if (error) throw error
      // Split into today and week
      const today = (data ?? []).filter(r => r.period === 'today')
      const week = (data ?? []).filter(r => r.period === 'week')
      return { today, week }
    },
    enabled: !!studentId,
    staleTime: 10_000,
    placeholderData: (prev) => prev,
    refetchOnWindowFocus: false,
  })
}
