import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useClassPrep(groupId = null) {
  const profile = useAuthStore((s) => s.profile)

  return useQuery({
    queryKey: ['trainer', 'class-prep', profile?.id, groupId],
    queryFn: async () => {
      if (!profile?.id || !groupId) return null
      const { data, error } = await supabase.functions.invoke('class-prep-analysis', {
        body: { trainer_id: profile.id, group_id: groupId },
      })
      if (error) throw error
      return data
    },
    enabled: !!profile?.id && !!groupId,
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

export function useClassPrepRefresh() {
  const profile = useAuthStore((s) => s.profile)
  const qc = useQueryClient()

  return async (groupId) => {
    const { data, error } = await supabase.functions.invoke('class-prep-analysis', {
      body: { trainer_id: profile.id, group_id: groupId, force_refresh: true },
    })
    if (error) throw error
    qc.setQueryData(['trainer', 'class-prep', profile?.id, groupId], data)
    return data
  }
}
