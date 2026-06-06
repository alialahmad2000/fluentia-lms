import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/** Display name for a student row that embeds profiles(...) */
export function studentName(row) {
  const p = row?.profiles || row
  return p?.display_name || p?.full_name || 'طالب'
}

/** Today's date in Asia/Riyadh as YYYY-MM-DD (matches student_daily_activity keys). */
export function riyadhDate(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
}

/** The teacher's own active groups (via groups.trainer_id). */
export function useTeacherGroups() {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['teacher-groups', profile?.id],
    enabled: !!profile?.id,
    staleTime: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, code, level, current_unit_id, google_meet_link, schedule')
        .eq('trainer_id', profile.id)
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data || []
    },
  })
}

/** All active students across the teacher's groups, with name embedded. */
export function useTeacherRoster() {
  const profile = useAuthStore((s) => s.profile)
  const groupsQ = useTeacherGroups()
  const groups = groupsQ.data || []
  const groupIds = groups.map((g) => g.id)

  const studentsQ = useQuery({
    queryKey: ['teacher-roster', profile?.id, groupIds.join(',')],
    enabled: !!profile?.id && groupIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, academic_level, group_id, status, xp_total, current_streak, gamification_level, last_active_at, paused_at, profiles(display_name, full_name, avatar_url)')
        .in('group_id', groupIds)
        .is('deleted_at', null)
      if (error) throw error
      return data || []
    },
  })

  return {
    groups,
    students: studentsQ.data || [],
    studentIds: (studentsQ.data || []).map((s) => s.id),
    isLoading: groupsQ.isLoading || studentsQ.isLoading,
    error: groupsQ.error || studentsQ.error,
  }
}

/** Per-student daily-activity rollup over the last `days`, keyed by student_id. */
export function useRosterActivity(studentIds = [], days = 7) {
  const key = [...studentIds].sort().join(',')
  return useQuery({
    queryKey: ['teacher-roster-activity', key, days],
    enabled: studentIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const since = riyadhDate(new Date(Date.now() - days * 86_400_000))
      const today = riyadhDate()
      const { data, error } = await supabase
        .from('student_daily_activity')
        .select('student_id, activity_date, learning_seconds, sections_completed, words_mastered, xp_earned, avg_score, submissions_count, speaking_recordings')
        .in('student_id', studentIds)
        .gte('activity_date', since)
        .order('activity_date', { ascending: false })
      if (error) throw error
      const map = {}
      for (const id of studentIds) {
        map[id] = { today: null, weekLearningSec: 0, weekSections: 0, weekXp: 0, lastActiveDate: null, days: [] }
      }
      for (const row of data || []) {
        const m = map[row.student_id]
        if (!m) continue
        m.days.push(row)
        m.weekLearningSec += row.learning_seconds || 0
        m.weekSections += row.sections_completed || 0
        m.weekXp += row.xp_earned || 0
        if (!m.lastActiveDate) m.lastActiveDate = row.activity_date
        if (row.activity_date === today) m.today = row
      }
      return map
    },
  })
}

export function fmtMinutes(seconds = 0) {
  const m = Math.round((seconds || 0) / 60)
  if (m < 60) return `${m} د`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h}س ${rem}د` : `${h} س`
}
