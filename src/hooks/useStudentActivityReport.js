import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// Fetches the consolidated per-student activity & progress report from the
// student-activity-report edge function. The user's JWT is attached automatically
// by supabase-js, so the function authorises admin/trainer callers.
export function useStudentActivityReport({
  studentId, range = 'week', date, start, end,
  withAI = true, force = false, enabled = true,
}) {
  return useQuery({
    queryKey: ['student-activity-report', studentId, range, date, start, end, withAI, force],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('student-activity-report', {
        body: {
          student_id: studentId,
          range, date, start, end,
          locale: 'ar',
          with_ai: withAI,
          force_ai: force,
        },
      })
      if (error) throw new Error(error.message || 'تعذّر تحميل التقرير')
      if (data?.error) throw new Error(data.error)
      return data
    },
    enabled: enabled && !!studentId,
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
}
