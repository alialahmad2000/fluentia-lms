// Data layer for «تحليل الطالب العميق» — one staff-gated RPC round-trip.
// The nightly rollup only covers through yesterday, so we materialise TODAY's
// partial first (same helper contract the reports hub uses) and let failures
// fall through: an analysis built on yesterday's rollup is still correct.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

let _lastTodayRefresh = 0

async function ensureTodayRollup() {
  if (Date.now() - _lastTodayRefresh < 5 * 60_000) return
  _lastTodayRefresh = Date.now()
  const { error } = await supabase.rpc('admin_report_refresh_today')
  if (error) console.warn('[analysis] today rollup skipped:', error.message)
}

export function useStudentDeepAnalysis(studentId) {
  return useQuery({
    queryKey: ['admin', 'student-deep-analysis', studentId],
    queryFn: async () => {
      await ensureTodayRollup()
      const { data, error } = await supabase.rpc('admin_student_deep_analysis', { p_student: studentId })
      if (error) throw error
      return data
    },
    enabled: Boolean(studentId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}
