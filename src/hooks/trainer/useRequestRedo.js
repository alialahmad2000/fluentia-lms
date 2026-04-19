import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useRequestRedo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ submissionType, submissionId, redoNote }) => {
      const { data, error } = await supabase.rpc('request_submission_redo', {
        p_submission_type: submissionType,
        p_submission_id: submissionId,
        p_redo_note: redoNote,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', 'grading-queue'] })
      qc.invalidateQueries({ queryKey: ['trainer-grading-count'] })
    },
  })
}
