import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useClassPrepContext(groupId = null) {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['trainer', 'prep-context', profile?.id, groupId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_class_prep_context', {
        p_trainer_id: profile.id,
        p_group_id: groupId,
      })
      if (error) throw error
      return data
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}
