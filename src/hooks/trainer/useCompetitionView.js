import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useCompetitionView() {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['trainer', 'competition-view', profile?.id],
    queryFn: async () => {
      // Reuse existing get_active_competition RPC (returns jsonb with team_a, team_b, VP, etc.)
      const { data: comp, error: compErr } = await supabase.rpc('get_active_competition')
      if (compErr) throw compErr

      if (!comp || comp.status !== 'active') {
        return { active: false }
      }

      // Fetch top 5 per team from existing leaderboard RPC
      const [leaderA, leaderB] = await Promise.all([
        supabase.rpc('get_competition_leaderboard', {
          p_competition_id: comp.id,
          p_team: 'A',
          p_limit: 5,
        }),
        supabase.rpc('get_competition_leaderboard', {
          p_competition_id: comp.id,
          p_team: 'B',
          p_limit: 5,
        }),
      ])

      // Fetch weekly goals for current competition
      const { data: weeklyGoals } = await supabase
        .from('competition_weekly_goals')
        .select('team, week_num, target_unit_number, required_pct, final_pct, bonus_awarded_xp, week_start_date, week_end_date')
        .eq('competition_id', comp.id)
        .order('week_num')

      // Recent peer recognitions (display-only, no moderation since no status filter)
      const { data: recognitions } = await supabase
        .from('peer_recognitions')
        .select('id, from_student, to_student, message, xp_awarded, created_at')
        .order('created_at', { ascending: false })
        .limit(20)

      return {
        active: true,
        competition: comp,
        leaderboard_a: leaderA.data || [],
        leaderboard_b: leaderB.data || [],
        weekly_goals: weeklyGoals || [],
        recognitions: recognitions || [],
      }
    },
    enabled: !!profile?.id,
    staleTime: 60_000,
  })
}
