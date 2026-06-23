// إنجليزي يومي — data layer. Reads the scenario library + the student's own sessions
// (RLS-gated), and derives "today's pick" (deterministic per day/student) + a gentle streak.
// No writes here — the everyday-english-turn edge function owns all writes (service role).

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const DAY_MS = 86400000

// 'YYYY-MM-DD' for a given Date in Riyadh
function riyadhDateStr(d = new Date()) {
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' }) // en-CA → ISO-like YYYY-MM-DD
}
function addDays(ymd, delta) {
  const t = Date.parse(`${ymd}T12:00:00Z`) + delta * DAY_MS
  return new Date(t).toISOString().slice(0, 10)
}
function djb2(str = '') {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0
  return h
}

export function useEverydayEnglish() {
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const studentId = profile?.id
  const level = Math.min(5, Math.max(1, studentData?.academic_level || 1))

  const scenariosQ = useQuery({
    queryKey: ['everyday-scenarios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('everyday_english_scenarios')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data || []
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const sessionsQ = useQuery({
    queryKey: ['everyday-sessions', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('everyday_english_sessions')
        .select('id, scenario_id, session_date, status, your_best_line, completed_at, scenario:everyday_english_scenarios(title_ar, title_en, emoji)')
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(120)
      if (error) throw error
      return data || []
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const derived = useMemo(() => {
    const scenarios = scenariosQ.data || []
    const sessions = sessionsQ.data || []
    const completed = sessions.filter((s) => s.status === 'completed')

    // ── gentle streak (consecutive Riyadh days with a completed session) ──
    const doneDates = new Set(completed.map((s) => s.session_date))
    const today = riyadhDateStr()
    const completedToday = doneDates.has(today)
    let streak = 0
    let cursor = completedToday ? today : addDays(today, -1)
    while (doneDates.has(cursor)) { streak++; cursor = addDays(cursor, -1) }

    // ── today's featured pick: level-appropriate, not done in the last 7 days ──
    const suitable = scenarios.filter((s) => level >= s.level_min && level <= s.level_max)
    const recentCutoff = addDays(today, -7)
    const recentIds = new Set(sessions.filter((s) => s.session_date >= recentCutoff).map((s) => s.scenario_id))
    let pool = suitable.filter((s) => !recentIds.has(s.id))
    if (pool.length === 0) pool = suitable.length ? suitable : scenarios
    pool = [...pool].sort((a, b) => (a.sort_order - b.sort_order) || (a.id < b.id ? -1 : 1))
    let todayScenario = null
    if (pool.length) {
      const dayNum = Math.floor(Date.parse(`${today}T12:00:00Z`) / DAY_MS)
      const idx = (dayNum + djb2(studentId || '')) % pool.length
      todayScenario = pool[idx]
    }

    return { scenarios, sessions, completed, streak, completedToday, todayScenario }
  }, [scenariosQ.data, sessionsQ.data, level, studentId])

  return {
    ...derived,
    level,
    loading: scenariosQ.isLoading || sessionsQ.isLoading,
    error: scenariosQ.error || sessionsQ.error,
    refetch: () => { scenariosQ.refetch(); sessionsQ.refetch() },
  }
}
