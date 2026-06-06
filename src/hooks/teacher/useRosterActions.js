import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Move a student between the teacher's own groups (gated SECURITY DEFINER RPC). */
export function useMoveStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, toGroup }) => {
      const { error } = await supabase.rpc('trainer_move_student', { p_student: studentId, p_to_group: toGroup })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-roster'] })
      qc.invalidateQueries({ queryKey: ['teacher-groups'] })
      qc.invalidateQueries({ queryKey: ['teacher-student-detail'] })
    },
  })
}

/** Set the "current focus" unit for one of the teacher's groups (groups_update RLS). */
export function useSetGroupFocus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupId, unitId }) => {
      const { error } = await supabase.from('groups').update({ current_unit_id: unitId }).eq('id', groupId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher-groups'] }),
  })
}
