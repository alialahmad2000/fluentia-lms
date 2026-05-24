// Hooks for Module 4 (Streak Activation) UI surfaces.
//
// useStreakSnapshot — current/longest streak for the calling student. Reads
//   the freshly-synced value from `students.current_streak` (kept in sync by
//   the nightly retention_daily_run() cron). Falls back to calling
//   get_student_streak() if the stored value looks stale (last_active_at
//   older than 24h but computed streak might still be 1).
//
// useStreakHeatMap — last 30 days of activity from unified_activity_log
//   (the source `get_student_streak()` itself reads). Returns an array of
//   { date: 'YYYY-MM-DD', activity_count: int } in Riyadh time.
//
// useCurrentWeeklyChallenge — the student's current-week challenge assignment
//   joined with the challenge definition. null if Module 4 disabled or not
//   yet assigned this week.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useAuthUserId } from '../../stores/authStore'

export function useStreakSnapshot() {
  const userId = useAuthUserId()

  return useQuery({
    queryKey: ['retention-streak-snapshot', userId],
    queryFn: async () => {
      if (!userId) return null
      // Pull the computed truth directly so the UI never depends on the
      // cron having run today. This is cheap (single RPC call) and gives
      // us current + longest in one shot.
      const { data, error } = await supabase.rpc('get_student_streak', {
        p_student_id: userId,
      })
      if (error) throw error
      // RPC returns TABLE — supabase-js gives us an array
      const row = Array.isArray(data) && data.length > 0 ? data[0] : null
      return {
        current: row?.current_streak ?? 0,
        longest: row?.longest_streak ?? 0,
        last_active_date: row?.last_active_date ?? null,
      }
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useStreakHeatMap({ days = 30 } = {}) {
  const userId = useAuthUserId()

  return useQuery({
    queryKey: ['retention-streak-heatmap', userId, days],
    queryFn: async () => {
      if (!userId) return []
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const { data, error } = await supabase
        .from('unified_activity_log')
        .select('occurred_at')
        .eq('student_id', userId)
        .gte('occurred_at', cutoff)
      if (error) throw error

      // Bucket into Riyadh-time YYYY-MM-DD strings
      const buckets = new Map()
      for (const row of data || []) {
        const d = new Date(row.occurred_at)
        const riyadh = new Date(d.getTime() + 3 * 60 * 60 * 1000) // UTC+3 (Riyadh, no DST)
        const key = riyadh.toISOString().slice(0, 10)
        buckets.set(key, (buckets.get(key) || 0) + 1)
      }

      // Emit dense array for the last `days` days, oldest → newest
      const out = []
      const todayRiyadh = new Date(Date.now() + 3 * 60 * 60 * 1000)
      todayRiyadh.setUTCHours(0, 0, 0, 0)
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(todayRiyadh)
        d.setUTCDate(d.getUTCDate() - i)
        const key = d.toISOString().slice(0, 10)
        out.push({ date: key, activity_count: buckets.get(key) || 0 })
      }
      return out
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useCurrentWeeklyChallenge() {
  const userId = useAuthUserId()

  return useQuery({
    queryKey: ['retention-current-challenge', userId],
    queryFn: async () => {
      if (!userId) return null
      // Compute current week_start in Riyadh time (week starts Sunday)
      const todayRiyadh = new Date(Date.now() + 3 * 60 * 60 * 1000)
      todayRiyadh.setUTCHours(0, 0, 0, 0)
      const dow = todayRiyadh.getUTCDay() // 0 = Sun
      const weekStart = new Date(todayRiyadh)
      weekStart.setUTCDate(weekStart.getUTCDate() - dow)
      const weekStartKey = weekStart.toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('retention_weekly_challenge_assignments')
        .select(
          `id, week_start, current_progress, target_value, completed, completed_at, reward_xp, reward_granted,
           challenge:retention_weekly_challenges (id, title_ar, description_ar, target_metric, difficulty, icon_key)`
        )
        .eq('student_id', userId)
        .eq('week_start', weekStartKey)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}
