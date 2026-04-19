import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useApproveSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ submissionType, submissionId, finalScore, trainerFeedback }) => {
      const { data, error } = await supabase.rpc('approve_submission', {
        p_submission_type: submissionType,
        p_submission_id: submissionId,
        p_final_score: finalScore,
        p_trainer_feedback: trainerFeedback ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', 'grading-queue'] })
      qc.invalidateQueries({ queryKey: ['trainer', 'cockpit'] })
      qc.invalidateQueries({ queryKey: ['trainer-grading-count'] })
    },
  })
}
