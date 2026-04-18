import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

export function useTrainerCockpit() {
  const profile = useAuthStore((s) => s.profile)
  const trainerId = profile?.id

  return useQuery({
    queryKey: ['trainer-cockpit', trainerId],
    queryFn: async () => {
      if (!trainerId) return null

      const [groupsRes, totalsRes, ritualsRes, competitionRes] = await Promise.all([
        supabase
          .from('groups')
          .select('id, name, level')
          .eq('trainer_id', trainerId),

        supabase.rpc('get_trainer_totals', { p_trainer_id: trainerId }),

        supabase
          .from('trainer_daily_rituals')
          .select('*')
          .eq('trainer_id', trainerId)
          .eq('day_of', new Date().toISOString().split('T')[0])
          .maybeSingle(),

        supabase.rpc('get_active_competition').maybeSingle().catch(() => ({ data: null })),
      ])

      return {
        groups: groupsRes.data || [],
        totals: totalsRes.data || { total_xp: 0, today_xp: 0, streak: null },
        todayRitual: ritualsRes.data,
        competition: competitionRes.data,
      }
    },
    enabled: !!trainerId,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })
}
