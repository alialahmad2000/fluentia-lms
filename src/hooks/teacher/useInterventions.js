import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/** The teacher's "needs attention" queue — AI-generated signals (inactive,
 *  stuck, milestone) for their students. Backed by get_intervention_queue. */
export function useInterventionQueue(limit = 40) {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['teacher-interventions', profile?.id, limit],
    enabled: !!profile?.id,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_intervention_queue', {
        p_trainer_id: profile.id,
        p_limit: limit,
      })
      if (error) throw error
      return Array.isArray(data) ? data : (data?.items || [])
    },
  })
}

/** Act on one intervention. action ∈ {acted, dismissed, snoozed}. */
export function useActOnIntervention() {
  const qc = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  return useMutation({
    mutationFn: async ({ id, action, notes, snoozeHours = 24 }) => {
      const { data, error } = await supabase.rpc('act_on_intervention', {
        p_intervention_id: id,
        p_action: action,
        p_trainer_id: profile.id,
        p_notes: notes || null,
        p_snooze_hours: snoozeHours,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher-interventions'] }),
  })
}
