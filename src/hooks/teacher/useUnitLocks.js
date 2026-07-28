import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/**
 * Locked unit_ids for one of the teacher's groups, as a plain ARRAY.
 * Must not be a Set: the query cache is persisted to localStorage as JSON, and a
 * Set rehydrates as `{}` — truthy but without `.has`, which crashes the consumer.
 * Callers build their own Set (see useGroupUnitLockSet).
 */
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
      return (data || []).map((r) => r.unit_id).filter(Boolean)
    },
  })
}

/** Same data as a Set, built client-side so nothing non-JSON enters the cache. */
export function useGroupUnitLockSet(groupId) {
  const { data } = useGroupUnitLocks(groupId)
  return useMemo(() => new Set(Array.isArray(data) ? data : []), [data])
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
