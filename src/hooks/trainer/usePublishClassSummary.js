import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function usePublishClassSummary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ summaryId, aiSummaryText, qualityRatings, perStudentAttended, perStudentMoments }) => {
      const { data, error } = await supabase.rpc('publish_class_summary', {
        p_summary_id: summaryId,
        p_ai_summary_text: aiSummaryText,
        p_quality_ratings: qualityRatings,
        p_per_student_attended: perStudentAttended,
        p_per_student_moments: perStudentMoments || {},
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer'] })
      qc.invalidateQueries({ queryKey: ['class-summary'] })
    },
  })
}
