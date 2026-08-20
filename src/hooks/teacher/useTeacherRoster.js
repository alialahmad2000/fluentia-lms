import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/**
 * The teacher roster is INDIVIDUAL-FIRST.
 *
 * It used to resolve students only through `groups.trainer_id`, which meant a
 * teacher who takes one-to-one classes — no group row — saw an empty home, an
 * empty roster and an empty class page. The real link for private students is
 * `students.assigned_trainer_id`, so that is the spine here; groups are folded
 * in as a secondary case for whoever also teaches a cohort.
 */

const STUDENT_COLS = [
  'id', 'academic_level', 'group_id', 'status', 'xp_total', 'current_streak',
  'gamification_level', 'last_active_at', 'paused_at', 'assigned_trainer_id',
  'uses_custom_curriculum', 'uses_standard_curriculum', 'track',
  'profiles(display_name, full_name, avatar_url)',
].join(', ')

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

/** The teacher's own active groups — empty for a purely one-to-one teacher. */
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

/** Every student this teacher owns: personally assigned, plus any group members. */
export function useTeacherRoster() {
  const profile = useAuthStore((s) => s.profile)
  const groupsQ = useTeacherGroups()
  const groups = groupsQ.data || []
  const groupIds = groups.map((g) => g.id)

  const studentsQ = useQuery({
    queryKey: ['teacher-roster', profile?.id, groupIds.join(',')],
    // Enabled with no groups — that is the normal case for a private teacher.
    enabled: !!profile?.id,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase.from('students').select(STUDENT_COLS).is('deleted_at', null)
      q = groupIds.length
        ? q.or(`assigned_trainer_id.eq.${profile.id},group_id.in.(${groupIds.join(',')})`)
        : q.eq('assigned_trainer_id', profile.id)
      const { data, error } = await q
      if (error) throw error
      // Personally-assigned students lead the list; then most recently active.
      return (data || []).sort((a, b) => {
        const mine = (b.assigned_trainer_id === profile.id) - (a.assigned_trainer_id === profile.id)
        if (mine) return mine
        return new Date(b.last_active_at || 0) - new Date(a.last_active_at || 0)
      })
    },
  })

  const students = studentsQ.data || []
  return {
    groups,
    students,
    studentIds: students.map((s) => s.id),
    /** True when this teacher has no cohorts at all — drives the one-to-one layout. */
    isPrivateOnly: groupIds.length === 0,
    isLoading: groupsQ.isLoading || studentsQ.isLoading,
    error: groupsQ.error || studentsQ.error,
  }
}

/**
 * Whether this account is actually switched on.
 *
 * is_active_trainer() is fail-closed: a profile with role='trainer' but no
 * trainers row (or is_active=false) resolves to no students at all. Without this
 * check an un-provisioned teacher would be told "no students assigned yet",
 * which sends them chasing the wrong problem. Only queried when the roster is
 * empty, so it costs nothing in the normal case.
 */
export function useTeacherActivation(enabled = false) {
  const profile = useAuthStore((s) => s.profile)
  return useQuery({
    queryKey: ['teacher-activation', profile?.id],
    enabled: !!profile?.id && enabled,
    staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('is_active_trainer')
      if (error) throw error
      return data === true
    },
  })
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
