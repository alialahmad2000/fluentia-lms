// Reads the Desk student's specialization + its authored scenarios (specialization_modules,
// which no other surface renders) and merges each with the student's desk_module_progress.
// One shared source for the cockpit + the scenarios library + the player.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useDeskModules() {
  const studentData = useAuthStore((s) => s.studentData)
  const profileId = useAuthStore((s) => s.profile?.id)
  const specId = studentData?.specialization_id || null

  return useQuery({
    queryKey: ['desk-modules', specId, profileId],
    enabled: !!specId && !!profileId,
    staleTime: 60_000,
    queryFn: async () => {
      const [specRes, modRes, progRes] = await Promise.all([
        supabase.from('specializations').select('*').eq('id', specId).maybeSingle(),
        supabase.from('specialization_modules').select('*').eq('specialization_id', specId).order('module_number'),
        supabase.from('desk_module_progress').select('*').eq('student_id', profileId).is('deleted_at', null),
      ])
      const byModule = new Map((progRes.data || []).map((p) => [p.module_id, p]))
      const modules = (modRes.data || []).map((m) => ({ ...m, progress: byModule.get(m.id) || null }))
      const done = modules.filter((m) => m.progress?.status === 'completed').length
      return { spec: specRes.data || null, modules, done, total: modules.length }
    },
  })
}
