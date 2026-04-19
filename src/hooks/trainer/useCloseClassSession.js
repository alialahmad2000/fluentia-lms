import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCloseClassSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, unitId, durationMinutes, attendedCount, totalCount, notes }) => {
      const { data, error } = await supabase.rpc('close_class_session', {
        p_group_id: groupId,
        p_unit_id: unitId,
        p_duration_minutes: durationMinutes,
        p_attended_count: attendedCount,
        p_total_count: totalCount,
        p_notes: notes ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainer', 'cockpit'] })
      qc.invalidateQueries({ queryKey: ['trainer', 'xp-totals'] })
      qc.invalidateQueries({ queryKey: ['trainer-xp'] })
    },
  })
}
