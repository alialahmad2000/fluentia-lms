import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const STALE = 30 * 1000

export function useIELTSMeta(studentId) {
  return useQuery({
    queryKey: ['ielts-meta', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, package, custom_access, ielts_phase, track')
        .eq('id', studentId)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useAdaptivePlan(studentId) {
  return useQuery({
    queryKey: ['ielts-plan', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_adaptive_plans')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSkillProgress(studentId) {
  return useQuery({
    queryKey: ['ielts-progress', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_student_progress')
        .select('*')
        .eq('student_id', studentId)
      if (error) throw error

      const bySkill = { reading: null, listening: null, writing: null, speaking: null }
      for (const row of data || []) {
        if (!bySkill[row.skill_type]) {
          bySkill[row.skill_type] = { attempts: 0, correct: 0, bands: [], types: [] }
        }
        const s = bySkill[row.skill_type]
        s.attempts += row.attempts_count || 0
        s.correct += row.correct_count || 0
        if (row.estimated_band != null) s.bands.push(Number(row.estimated_band))
        if (row.question_type) s.types.push(row.question_type)
      }
      for (const k of Object.keys(bySkill)) {
        if (bySkill[k]) {
          bySkill[k].band = bySkill[k].bands.length
            ? bySkill[k].bands.reduce((a, b) => a + b, 0) / bySkill[k].bands.length
            : null
        }
      }
      return bySkill
    },
  })
}

export function useRecentSessions(studentId, limit = 5) {
  return useQuery({
    queryKey: ['ielts-recent-sessions', studentId, limit],
    enabled: !!studentId,
    staleTime: STALE,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_skill_sessions')
        .select('id, skill_type, question_type, band_score, correct_count, incorrect_count, duration_seconds, started_at, completed_at')
        .eq('student_id', studentId)
        .order('started_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
  })
}

export function useErrorBankCount(studentId) {
  return useQuery({
    queryKey: ['ielts-errors-count', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('ielts_error_bank')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('mastered', false)
      if (error) throw error
      return count || 0
    },
  })
}

export function useMockAttempts(studentId) {
  return useQuery({
    queryKey: ['ielts-mock-attempts', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_mock_attempts')
        .select('id, mock_test_id, status, started_at, completed_at')
        .eq('student_id', studentId)
        .order('started_at', { ascending: false })
      if (error) throw error
      return {
        inProgress: (data || []).find(a => a.status === 'in_progress') || null,
        completed: (data || []).filter(a => a.status === 'completed'),
        total: (data || []).length,
      }
    },
  })
}

export function useLatestResult(studentId) {
  return useQuery({
    queryKey: ['ielts-latest-result', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_student_results')
        .select('id, result_type, overall_band, reading_score, listening_score, writing_score, speaking_score, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}
