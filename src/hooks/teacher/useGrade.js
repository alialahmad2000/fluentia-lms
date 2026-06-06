import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Approve/grade a submission. type ∈ {writing, speaking}. Reuses the existing
 *  approve_submission SECURITY DEFINER RPC (trainer-scoped). */
export function useGradeSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ type, id, score, feedback }) => {
      const { data, error } = await supabase.rpc('approve_submission', {
        p_submission_type: type,
        p_submission_id: id,
        p_final_score: score,
        p_trainer_feedback: feedback || null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-student-answers'] })
      qc.invalidateQueries({ queryKey: ['teacher-grading-queue'] })
      qc.invalidateQueries({ queryKey: ['teacher-grading-badge'] })
      qc.invalidateQueries({ queryKey: ['trainer', 'grading-queue'] })
    },
  })
}

/** Ask a student to redo a submission. type ∈ {writing, speaking}. */
export function useRequestRedo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ type, id, note }) => {
      const { data, error } = await supabase.rpc('request_submission_redo', {
        p_submission_type: type,
        p_submission_id: id,
        p_redo_note: note || '',
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-student-answers'] })
      qc.invalidateQueries({ queryKey: ['teacher-grading-queue'] })
      qc.invalidateQueries({ queryKey: ['teacher-grading-badge'] })
      qc.invalidateQueries({ queryKey: ['trainer', 'grading-queue'] })
    },
  })
}
