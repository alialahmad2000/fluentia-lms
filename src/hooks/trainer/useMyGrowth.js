import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useGrowthDashboard() {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['trainer', 'growth-dashboard', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trainer_growth_dashboard', {
        p_trainer_id: profile.id,
      })
      if (error) throw error
      return data
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60_000,
  })
}

export function useXPTimeline(days = 30) {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['trainer', 'xp-timeline', profile?.id, days],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_trainer_xp_timeline', {
        p_trainer_id: profile.id,
        p_days: days,
      })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60_000,
  })
}

export function useTrainerPerSessionRate() {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['trainer', 'per-session-rate', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trainers')
        .select('per_session_rate')
        .eq('id', profile.id)
        .maybeSingle()
      if (error) throw error
      return data?.per_session_rate ?? 75
    },
    enabled: !!profile?.id,
    staleTime: 60 * 60_000,
  })
}
