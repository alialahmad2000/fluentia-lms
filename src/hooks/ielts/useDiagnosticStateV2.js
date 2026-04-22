import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const DIAG_TEST_NUMBER = 0

// Returns the student's current diagnostic state for the Welcome page branch logic.
// state: 'none' | 'in_progress' | 'completed'
export function useDiagnosticStateV2() {
  const profile = useAuthStore((s) => s.profile)
  const profileId = profile?.id

  const { data: mockTestId, isLoading: mockLoading } = useQuery({
    queryKey: ['diag-mock-test-id'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_mock_tests')
        .select('id')
        .eq('test_number', DIAG_TEST_NUMBER)
        .single()
      if (error) throw error
      return data?.id ?? null
    },
  })

  const { data: attempt, isLoading: attemptLoading, error } = useQuery({
    queryKey: ['diag-state-v2', profileId, mockTestId],
    enabled: !!profileId && !!mockTestId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('ielts_mock_attempts')
        .select('id, status, result_id, completed_at')
        .eq('student_id', profileId)
        .eq('mock_test_id', mockTestId)
        .in('status', ['in_progress', 'completed'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (qErr) throw qErr
      return data
    },
  })

  const { data: resultBand } = useQuery({
    queryKey: ['diag-band-v2', attempt?.result_id],
    enabled: attempt?.status === 'completed' && !!attempt?.result_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from('ielts_student_results')
        .select('overall_band')
        .eq('id', attempt.result_id)
        .single()
      if (qErr) throw qErr
      return data?.overall_band ?? null
    },
  })

  let state = 'none'
  if (attempt?.status === 'in_progress') state = 'in_progress'
  else if (attempt?.status === 'completed') state = 'completed'

  return {
    loading: mockLoading || attemptLoading,
    error,
    state,
    latestOverallBand: resultBand ?? null,
  }
}
