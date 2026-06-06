import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Full detail for one student: row + name + group + skill state + per-unit progress. */
export function useStudentDetail(studentId) {
  return useQuery({
    queryKey: ['teacher-student-detail', studentId],
    enabled: !!studentId,
    staleTime: 30_000,
    queryFn: async () => {
      const [{ data: student, error: sErr }, { data: skill }, { data: progress }] = await Promise.all([
        supabase
          .from('students')
          .select('id, academic_level, package, track, status, group_id, xp_total, current_streak, longest_streak, gamification_level, last_active_at, enrollment_date, gender, paused_at, profiles(display_name, full_name, avatar_url, email, phone), groups(id, name, code)')
          .eq('id', studentId)
          .maybeSingle(),
        supabase
          .from('student_skill_state')
          .select('grammar, vocabulary, speaking, listening, reading, writing, updated_at')
          .eq('student_id', studentId)
          .maybeSingle()
          .then((r) => ({ data: r.data })),
        supabase
          .from('unit_progress')
          .select('unit_id, percentage, numerator, denominator, breakdown, updated_at, curriculum_units(unit_number, theme_ar, theme_en, level_id)')
          .eq('student_id', studentId)
          .order('updated_at', { ascending: false })
          .then((r) => ({ data: r.data || [] })),
      ])
      if (sErr) throw sErr
      return { student, skill: skill || null, progress: progress || [] }
    },
  })
}

/** Recent daily activity for one student (for the profile timeline strip). */
export function useStudentRecentActivity(studentId, days = 14) {
  return useQuery({
    queryKey: ['teacher-student-activity', studentId, days],
    enabled: !!studentId,
    staleTime: 30_000,
    queryFn: async () => {
      const since = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' })
        .format(new Date(Date.now() - days * 86_400_000))
      const { data, error } = await supabase
        .from('student_daily_activity')
        .select('activity_date, learning_seconds, sections_completed, words_mastered, xp_earned, avg_score, submissions_count, speaking_recordings, quizzes_taken')
        .eq('student_id', studentId)
        .gte('activity_date', since)
        .order('activity_date', { ascending: false })
      if (error) throw error
      return data || []
    },
  })
}
