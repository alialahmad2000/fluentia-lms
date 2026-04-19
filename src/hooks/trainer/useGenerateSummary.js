import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useGenerateSummary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (summaryId) => {
      const { data, error } = await supabase.functions.invoke('class-summary-ai', {
        body: { summary_id: summaryId },
      })
      if (error) throw error
      return data
    },
    onSuccess: (_data, summaryId) => {
      qc.invalidateQueries({ queryKey: ['class-summary', summaryId] })
    },
  })
}
