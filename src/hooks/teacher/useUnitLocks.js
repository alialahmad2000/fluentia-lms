import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/** Set of locked unit_ids for one of the teacher's groups. */
export function useGroupUnitLocks(groupId) {
  return useQuery({
    queryKey: ['teacher-unit-locks', groupId],
    enabled: !!groupId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_unit_locks')
        .select('unit_id')
        .eq('group_id', groupId)
      if (error) throw error
      return new Set((data || []).map((r) => r.unit_id))
    },
  })
}

/** Lock (insert) or unlock (delete) a unit for a group. */
export function useToggleUnitLock() {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  return useMutation({
    mutationFn: async ({ groupId, unitId, locked }) => {
      if (locked) {
        const { error } = await supabase.from('teacher_unit_locks').insert({ trainer_id: profile?.id, group_id: groupId, unit_id: unitId })
        if (error && error.code !== '23505') throw error // ignore duplicate
      } else {
        const { error } = await supabase.from('teacher_unit_locks').delete().eq('group_id', groupId).eq('unit_id', unitId)
        if (error) throw error
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['teacher-unit-locks', vars.groupId] })
      qc.invalidateQueries({ queryKey: ['unit-lock'] })
    },
  })
}
