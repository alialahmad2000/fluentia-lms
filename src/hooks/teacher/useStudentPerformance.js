import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { riyadhDate } from './useTeacherRoster'

/**
 * Performance over time for one student — today, this week, this month, and the
 * whole stretch — built from student_daily_activity (one row per active day).
 *
 * Everything is bucketed in Asia/Riyadh so "today" means the student's today,
 * not the browser's.
 */

const DAY_MS = 86_400_000

function emptyBucket() {
  return { days: 0, learningSec: 0, sections: 0, xp: 0, words: 0, submissions: 0, recordings: 0, scoreSum: 0, scoreDays: 0 }
}

function addRow(b, r) {
  b.days += 1
  b.learningSec += r.learning_seconds || 0
  b.sections += r.sections_completed || 0
  b.xp += r.xp_earned || 0
  b.words += r.words_mastered || 0
  b.submissions += r.submissions_count || 0
  b.recordings += r.speaking_recordings || 0
  if (r.avg_score != null) { b.scoreSum += Number(r.avg_score); b.scoreDays += 1 }
  return b
}

function finish(b) {
  return { ...b, avgScore: b.scoreDays ? Math.round(b.scoreSum / b.scoreDays) : null }
}

export function useStudentPerformance(studentId, windowDays = 90) {
  return useQuery({
    queryKey: ['teacher-student-performance', studentId, windowDays],
    enabled: !!studentId,
    staleTime: 60_000,
    queryFn: async () => {
      const since = riyadhDate(new Date(Date.now() - windowDays * DAY_MS))
      const { data, error } = await supabase
        .from('student_daily_activity')
        .select('activity_date, learning_seconds, sections_completed, words_mastered, xp_earned, avg_score, submissions_count, speaking_recordings')
        .eq('student_id', studentId)
        .gte('activity_date', since)
        .order('activity_date', { ascending: true })
      if (error) throw error

      const rows = data || []
      const today = riyadhDate()
      const d7 = riyadhDate(new Date(Date.now() - 7 * DAY_MS))
      const d30 = riyadhDate(new Date(Date.now() - 30 * DAY_MS))

      const buckets = { today: emptyBucket(), week: emptyBucket(), month: emptyBucket(), all: emptyBucket() }
      const byDate = {}

      for (const r of rows) {
        byDate[r.activity_date] = r
        addRow(buckets.all, r)
        if (r.activity_date >= d30) addRow(buckets.month, r)
        if (r.activity_date >= d7) addRow(buckets.week, r)
        if (r.activity_date === today) addRow(buckets.today, r)
      }

      // A dense day-by-day series so gaps read as gaps, not as missing bars.
      const series = []
      for (let i = windowDays - 1; i >= 0; i--) {
        const date = riyadhDate(new Date(Date.now() - i * DAY_MS))
        const r = byDate[date]
        series.push({
          date,
          learningSec: r?.learning_seconds || 0,
          sections: r?.sections_completed || 0,
          xp: r?.xp_earned || 0,
          avgScore: r?.avg_score != null ? Number(r.avg_score) : null,
          active: !!r,
        })
      }

      // Consecutive active days ending today (or yesterday — today may be early).
      let streak = 0
      for (let i = series.length - 1; i >= 0; i--) {
        if (series[i].active) streak++
        else if (i < series.length - 1) break
      }

      const activeDays = buckets.all.days
      const lastActive = rows.length ? rows[rows.length - 1].activity_date : null

      return {
        today: finish(buckets.today),
        week: finish(buckets.week),
        month: finish(buckets.month),
        all: finish(buckets.all),
        series,
        streak,
        activeDays,
        lastActive,
        consistency: windowDays ? Math.round((activeDays / windowDays) * 100) : 0,
      }
    },
  })
}
