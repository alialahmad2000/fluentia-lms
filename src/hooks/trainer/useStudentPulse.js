import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

function buildDays() {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

export function useStudentPulse() {
  const profile = useAuthStore((s) => s.profile)
  const trainerId = profile?.id
  const days = buildDays()

  return useQuery({
    queryKey: ['student-pulse', trainerId],
    queryFn: async () => {
      if (!trainerId) return { students: [], matrix: {}, days }

      // Step 1: trainer's groups
      const { data: groups } = await supabase
        .from('groups')
        .select('id, name, level')
        .eq('trainer_id', trainerId)

      const groupIds = (groups || []).map(g => g.id)
      if (groupIds.length === 0) return { students: [], matrix: {}, days }

      // Step 2: students via students table + profile join
      let rows = null
      try {
        const res = await supabase
          .from('students')
          .select(`
            id, xp_total, current_streak, group_id, team_id,
            profile:profiles!inner(id, full_name, avatar_url, last_active_at)
          `)
          .in('group_id', groupIds)
          .eq('status', 'active')
          .is('deleted_at', null)
        if (res.error) throw res.error
        rows = res.data
      } catch {
        const res = await supabase
          .from('students')
          .select(`
            id, xp_total, current_streak, group_id, team_id,
            profile:profiles!inner(id, full_name, avatar_url, last_active_at)
          `)
          .in('group_id', groupIds)
        rows = res.data
      }

      const students = (rows || [])
        .map(r => ({
          id: r.profile.id,
          student_row_id: r.id,
          full_name: r.profile.full_name,
          avatar_url: r.profile.avatar_url,
          last_active_at: r.profile.last_active_at,
          xp_total: r.xp_total,
          current_streak: r.current_streak,
          group_id: r.group_id,
          team_id: r.team_id,
        }))
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'))

      // Step 3: activity feed last 7 days
      const profileIds = students.map(s => s.id)
      const since = new Date()
      since.setDate(since.getDate() - 6)
      since.setHours(0, 0, 0, 0)

      const { data: events } = profileIds.length
        ? await supabase
            .from('activity_feed')
            .select('user_id, created_at, xp_earned')
            .in('user_id', profileIds)
            .gte('created_at', since.toISOString())
        : { data: [] }

      // Build matrix: { profileId: { 'YYYY-MM-DD': totalXP } }
      const matrix = {}
      ;(events || []).forEach(e => {
        const day = e.created_at.split('T')[0]
        if (!matrix[e.user_id]) matrix[e.user_id] = {}
        matrix[e.user_id][day] = (matrix[e.user_id][day] || 0) + (e.xp_earned || 0)
      })

      return { students, matrix, days }
    },
    enabled: !!trainerId,
    staleTime: 60000,
  })
}
