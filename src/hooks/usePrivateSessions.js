import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/* ------------------------------------------------------------------ *
 * usePrivateSessions — a custom/1:1 (Fardi) student's own scheduled
 * private sessions (from `private_sessions`), soonest first. RLS-safe:
 * the student reads only her own rows (student_id = auth.uid()).
 * Times are stored as Riyadh wall-clock (date + time, no tz), so they
 * render directly with no conversion.
 * ------------------------------------------------------------------ */

function riyadhTodayISO() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

export function useUpcomingPrivateSessions(studentId, enabled = true, limit = 6) {
  return useQuery({
    queryKey: ['private-sessions', 'upcoming', studentId],
    enabled: !!studentId && enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const today = riyadhTodayISO()
      const { data, error } = await supabase
        .from('private_sessions')
        .select('id, date, start_time, end_time, status, notes, google_meet_link')
        .eq('student_id', studentId)
        .eq('status', 'scheduled')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(limit)
      if (error) throw error
      return data || []
    },
  })
}

const AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const AR_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

/* "السبت · 4 يوليو · 11:00 مساءً" — from a 'YYYY-MM-DD' date + 'HH:MM[:SS]' time */
export function formatSessionWhen(dateStr, timeStr) {
  if (!dateStr) return ''
  const [y, m, d] = String(dateStr).split('-').map((n) => parseInt(n, 10))
  const dt = new Date(y, (m || 1) - 1, d || 1) // local construction → no tz shift for getDay()
  const dayName = AR_DAYS[dt.getDay()] || ''
  const monthName = AR_MONTHS[(m || 1) - 1] || ''
  let time = ''
  if (timeStr) {
    const [hhRaw, mm] = String(timeStr).split(':')
    const hh = parseInt(hhRaw, 10)
    const meridiem = hh >= 12 ? 'مساءً' : 'صباحاً'
    let h12 = hh % 12
    if (h12 === 0) h12 = 12
    time = `${h12}:${mm} ${meridiem}`
  }
  return `${dayName} · ${d} ${monthName}${time ? ` · ${time}` : ''}`
}

export default useUpcomingPrivateSessions
