import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

export function useInterventionPreview(limit = 3) {
  const profile = useAuthStore((s) => s.profile)
  const trainerId = profile?.id

  return useQuery({
    queryKey: ['intervention-preview', trainerId, limit],
    queryFn: async () => {
      if (!trainerId) return []
      const { data, error } = await supabase.rpc('get_intervention_queue', {
        p_trainer_id: trainerId,
        p_limit: limit,
      })
      if (error) throw error
      return data || []
    },
    enabled: !!trainerId,
    staleTime: 30000,
  })
}
