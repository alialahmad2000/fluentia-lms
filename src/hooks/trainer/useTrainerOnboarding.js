import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useTrainerOnboarding() {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['trainer', 'onboarding', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('trainer_onboarding')
        .select('*')
        .eq('trainer_id', profile.id)
        .maybeSingle()
      return data
    },
    enabled: !!profile?.id,
    staleTime: Infinity,
  })
}

export function shouldShowTour(onboarding) {
  if (onboarding === undefined) return false
  if (onboarding === null) return true
  if (onboarding.tour_completed_at) return false
  if (onboarding.tour_skipped_at) return false
  return true
}
