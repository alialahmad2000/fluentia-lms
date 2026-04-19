import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useGradingQueue(limit = 50) {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['trainer', 'grading-queue', profile?.id, limit],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase.rpc('get_trainer_grading_queue', {
        p_trainer_id: profile.id,
        p_limit: limit,
      })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}
