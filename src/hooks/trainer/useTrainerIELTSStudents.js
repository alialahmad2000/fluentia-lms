import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const STALE = 60_000

export function useIELTSRoster() {
  const trainerId = useAuthStore((s) => s.profile?.id)
  const isTrainer = useAuthStore((s) => s.profile?.role === 'trainer')

  return useQuery({
    queryKey: ['trainer-ielts-roster', trainerId],
    enabled: !!trainerId && isTrainer,
    staleTime: STALE,
    queryFn: async () => {
      const { data: groups, error: gErr } = await supabase
        .from('groups')
        .select('id')
        .eq('trainer_id', trainerId)
      if (gErr) throw gErr

      const groupIds = (groups || []).map(g => g.id)
      if (groupIds.length === 0) return []

      const { data: rows, error: sErr } = await supabase
        .from('students')
        .select('id, package, custom_access, group_id, profile:profiles!inner(id, full_name, last_active_at)')
        .in('group_id', groupIds)
      if (sErr) throw sErr

      const ieltsStudents = (rows || []).filter(s =>
        s.package === 'ielts' ||
        (Array.isArray(s.custom_access) && s.custom_access.includes('ielts'))
      )
      if (ieltsStudents.length === 0) return []

      const studentIds = ieltsStudents.map(s => s.id)

      const [resultsRes, plansRes, errorsRes] = await Promise.all([
        supabase
          .from('ielts_student_results')
          .select('student_id, overall_band, completed_at, result_type')
          .in('student_id', studentIds)
          .order('completed_at', { ascending: false }),
        supabase
          .from('ielts_adaptive_plans')
          .select('student_id, target_band, target_exam_date, last_regenerated_at, current_band_estimate')
          .in('student_id', studentIds),
        supabase
          .from('ielts_error_bank')
          .select('student_id, mastered, next_review_at')
          .in('student_id', studentIds),
      ])

      if (resultsRes.error) throw resultsRes.error
      if (plansRes.error) throw plansRes.error
      if (errorsRes.error) throw errorsRes.error

      return ieltsStudents.map(s => {
        const allResults = (resultsRes.data || []).filter(r => r.student_id === s.id)
        const lastMock = allResults.find(r => r.result_type === 'mock')
        const plan = (plansRes.data || []).find(p => p.student_id === s.id)
        const errors = (errorsRes.data || []).filter(e => e.student_id === s.id)
        const now = Date.now()

        const dueErrors = errors.filter(e =>
          !e.mastered && (!e.next_review_at || new Date(e.next_review_at).getTime() <= now)
        ).length

        const planAgeDays = plan?.last_regenerated_at
          ? Math.floor((now - new Date(plan.last_regenerated_at).getTime()) / 86_400_000)
          : null

        const daysSinceLastMock = lastMock
          ? Math.floor((now - new Date(lastMock.completed_at).getTime()) / 86_400_000)
          : null

        return {
          id: s.id,
          full_name: s.profile?.full_name || 'طالب',
          last_active_at: s.profile?.last_active_at || null,
          target_band: plan?.target_band || null,
          last_mock_band: lastMock?.overall_band || null,
          gap: (plan?.target_band && lastMock?.overall_band)
            ? +(plan.target_band - lastMock.overall_band).toFixed(1)
            : null,
          days_since_last_mock: daysSinceLastMock,
          due_errors: dueErrors,
          plan_age_days: planAgeDays,
          needs_attention: daysSinceLastMock === null || daysSinceLastMock > 30 || (planAgeDays !== null && planAgeDays > 14),
        }
      })
    },
  })
}

export function useStudentIELTSDetail(studentId) {
  return useQuery({
    queryKey: ['trainer-ielts-detail', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const [resultsRes, planRes, errorsRes, sessionsRes, progressRes] = await Promise.all([
        supabase
          .from('ielts_student_results')
          .select('*')
          .eq('student_id', studentId)
          .order('completed_at', { ascending: false })
          .limit(10),
        supabase
          .from('ielts_adaptive_plans')
          .select('*')
          .eq('student_id', studentId)
          .maybeSingle(),
        supabase
          .from('ielts_error_bank')
          .select('skill_type, question_type, mastered, next_review_at')
          .eq('student_id', studentId),
        supabase
          .from('ielts_skill_sessions')
          .select('*')
          .eq('student_id', studentId)
          .order('started_at', { ascending: false })
          .limit(10),
        supabase
          .from('ielts_student_progress')
          .select('*')
          .eq('student_id', studentId),
      ])

      if (resultsRes.error) throw resultsRes.error
      if (planRes.error) throw planRes.error
      if (errorsRes.error) throw errorsRes.error
      if (sessionsRes.error) throw sessionsRes.error
      if (progressRes.error) throw progressRes.error

      return {
        results: resultsRes.data || [],
        plan: planRes.data || null,
        errors: errorsRes.data || [],
        sessions: sessionsRes.data || [],
        progress: progressRes.data || [],
      }
    },
  })
}

export function useIELTSGradingQueueExtension() {
  const trainerId = useAuthStore((s) => s.profile?.id)

  return useQuery({
    queryKey: ['trainer-ielts-grading-queue', trainerId],
    enabled: !!trainerId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_submissions')
        .select(`
          id,
          student_id,
          submission_type,
          text_content,
          audio_url,
          transcript,
          word_count,
          band_score,
          ai_feedback,
          submitted_at,
          trainer_reviewed_at,
          students:student_id (full_name)
        `)
        .is('trainer_reviewed_at', null)
        .order('submitted_at', { ascending: true })
        .limit(50)
      if (error) throw error
      return (data || []).map(s => ({
        ...s,
        student_name: s.students?.full_name || 'طالب',
        is_ielts: true,
      }))
    },
  })
}

export function useGradeIELTSSubmission() {
  const qc = useQueryClient()
  const trainerId = useAuthStore.getState().profile?.id

  return useMutation({
    mutationFn: async ({ submissionId, band, feedback }) => {
      const { data, error } = await supabase
        .from('ielts_submissions')
        .update({
          trainer_overridden_band: band,
          trainer_feedback: feedback || null,
          trainer_reviewed_at: new Date().toISOString(),
          trainer_id: trainerId,
        })
        .eq('id', submissionId)
        .select('id')
        .single()
      if (error) throw error
      if (!data) throw new Error('Grading update failed — no rows returned')
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer-ielts-grading-queue'] })
    },
  })
}
