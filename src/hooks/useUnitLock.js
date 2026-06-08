import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/**
 * Is this unit locked by the teacher for the current student's group?
 * FAIL-OPEN by design: returns true ONLY when an explicit lock row exists.
 * Any error / no group / loading → false (unit stays accessible), so this can
 * never break student access to the curriculum.
 */
export function useUnitLockedForMe(unitId, enabled = true) {
  const studentData = useAuthStore((s) => s.studentData)
  const groupId = studentData?.group_id
  const { data } = useQuery({
    queryKey: ['unit-lock', groupId, unitId],
    enabled: !!enabled && !!groupId && !!unitId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_unit_locks')
        .select('id')
        .eq('group_id', groupId)
        .eq('unit_id', unitId)
        .limit(1)
      if (error) return false // fail-open
      return (data?.length || 0) > 0
    },
  })
  return data === true
}
