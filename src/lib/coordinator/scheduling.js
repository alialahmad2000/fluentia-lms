// Class-coordinator data layer — weekly templates (class_schedules) + dated
// occurrences (class_sessions). All writes go through coord_* SECURITY DEFINER
// RPCs; reads come back flattened with names resolved server-side.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'

export {
  RIYADH_OFFSET_MS, WEEKDAYS,
  riyadhMidnightUtc, riyadhDow, riyadhDayStr, riyadhTimeStr, riyadhToUtcIso, addMinutesIso,
} from '../cs/scheduling'

export const CLASS_TYPES = {
  individual: { label: 'فردية',  color: 'var(--ds-accent-primary)' },
  group:      { label: 'جماعية', color: 'var(--ds-accent-secondary, #a78bfa)' },
}

export const SESSION_STATUS = {
  scheduled: { label: 'مجدولة',  color: 'var(--ds-sky, #38bdf8)' },
  done:      { label: 'تمت',     color: 'var(--ds-accent-success)' },
  cancelled: { label: 'ملغاة',   color: 'var(--ds-text-muted)' },
  no_show:   { label: 'غياب', color: 'var(--ds-accent-danger)' },
}

export const SCHEDULE_STATUS = {
  active: { label: 'فعّال',        color: 'var(--ds-accent-success)' },
  paused: { label: 'موقوف مؤقتًا', color: 'var(--ds-accent-warning, #f59e0b)' },
  ended:  { label: 'منتهٍ',        color: 'var(--ds-text-muted)' },
}

export const DURATIONS = [30, 45, 60, 90, 120]

export function classErrorAr(message) {
  const m = String(message || '')
  if (m.includes('conflict') || m.includes('23P01') || m.includes('exclusion'))
    return 'يوجد تعارض: المدرب أو الطالب لديه حصة أخرى في نفس الوقت'
  if (m.includes('not_allowed') || m.includes('42501'))
    return 'هذا الإجراء متاح لمنسّقة الأكاديمية فقط'
  if (m.includes('session_not_found')) return 'لم يتم العثور على الحصة — ربما تغيّرت حالتها'
  if (m.includes('schedule_not_found')) return 'لم يتم العثور على الموعد الأسبوعي'
  return 'تعذّر إتمام العملية، يرجى المحاولة مرة أخرى'
}

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw error
  return data
}

// ── pickers ───────────────────────────────────────────────────────────────────
export function useCoordStudents() {
  return useQuery({
    queryKey: ['coord-students'], staleTime: 300_000,
    queryFn: () => rpc('coord_list_students'),
  })
}

export function useCoordTrainers() {
  return useQuery({
    queryKey: ['coord-trainers'], staleTime: 300_000,
    queryFn: () => rpc('coord_list_trainers'),
  })
}

export function useCoordGroups() {
  return useQuery({
    queryKey: ['coord-groups'], staleTime: 300_000,
    queryFn: () => rpc('coord_list_groups'),
  })
}

// ── reads ─────────────────────────────────────────────────────────────────────
export function useCoordWeekSessions(fromIso, toIso) {
  return useQuery({
    queryKey: ['coord-week-sessions', fromIso, toIso],
    enabled: !!fromIso && !!toIso, staleTime: 15_000,
    queryFn: () => rpc('coord_week_sessions', { p_from: fromIso, p_to: toIso }),
  })
}

export function useCoordSchedules() {
  return useQuery({
    queryKey: ['coord-schedules'], staleTime: 30_000,
    queryFn: () => rpc('coord_list_schedules'),
  })
}

export async function checkConflicts({ trainerId, studentId, startIso, endIso, excludeSessionId }) {
  return rpc('coord_check_conflicts', {
    p_trainer: trainerId, p_student: studentId || null,
    p_start: startIso, p_end: endIso,
    p_exclude_session: excludeSessionId || null,
  })
}

// ── mutations ─────────────────────────────────────────────────────────────────
export function useCoordMutations() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['coord-week-sessions'] })
    qc.invalidateQueries({ queryKey: ['coord-schedules'] })
  }

  return {
    invalidate,
    createSchedule: async (p) => {
      const r = await rpc('coord_create_schedule', {
        p_type: p.type, p_student: p.studentId || null, p_group: p.groupId || null,
        p_trainer: p.trainerId, p_day_of_week: p.dayOfWeek, p_start_time: p.startTime,
        p_duration: p.duration, p_meeting_link: p.meetingLink || null, p_notes: p.notes || null,
      })
      invalidate(); return r
    },
    updateSchedule: async (id, p = {}) => {
      const r = await rpc('coord_update_schedule', {
        p_id: id,
        p_day_of_week: p.dayOfWeek ?? null, p_start_time: p.startTime ?? null,
        p_duration: p.duration ?? null, p_meeting_link: p.meetingLink ?? null,
        p_notes: p.notes ?? null, p_status: p.status ?? null,
      })
      invalidate(); return r
    },
    createSession: async (p) => {
      const r = await rpc('coord_create_session', {
        p_type: p.type, p_student: p.studentId || null, p_group: p.groupId || null,
        p_trainer: p.trainerId, p_start: p.startIso, p_duration: p.duration,
        p_meeting_link: p.meetingLink || null, p_notes: p.notes || null,
      })
      invalidate(); return r
    },
    cancelSession: async (id) => { const r = await rpc('coord_cancel_session', { p_id: id }); invalidate(); return r },
    rescheduleSession: async (id, newStartIso, duration) => {
      const r = await rpc('coord_reschedule_session', { p_id: id, p_new_start: newStartIso, p_duration: duration ?? null })
      invalidate(); return r
    },
    updateSession: async (id, p = {}) => {
      const r = await rpc('coord_update_session', {
        p_id: id, p_meeting_link: p.meetingLink ?? null, p_notes: p.notes ?? null, p_status: p.status ?? null,
      })
      invalidate(); return r
    },
    materialize: async () => { const r = await rpc('materialize_class_sessions', { p_days: 14 }); invalidate(); return r },
  }
}

// ── WhatsApp share (text-only wa.me — opens the chat picker, zero typing) ────
const AR_DOW = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export function buildClassShareText({ type, weekly, dayOfWeek, dateStr, timeLabel, withName, trainerName, meetingLink }) {
  const lines = [
    '📚 أكاديمية طلاقة — موعد الحصة',
    `النوع: حصة ${type === 'group' ? 'جماعية' : 'فردية'}${withName ? ` — ${withName}` : ''}`,
    weekly ? `الموعد: كل ${AR_DOW[dayOfWeek]} الساعة ${timeLabel}` : `الموعد: ${dateStr} الساعة ${timeLabel}`,
  ]
  if (trainerName) lines.push(`المدرب: ${trainerName}`)
  if (meetingLink) lines.push(`رابط الحصة: ${meetingLink}`)
  lines.push('', 'الموعد والرابط متوفران دائمًا داخل المنصة 🌿')
  return `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
}

// Arabic date labels (Riyadh) — never show raw ISO dates in the UI.
const AR_DATE = new Intl.DateTimeFormat('ar-u-nu-latn', { timeZone: 'Asia/Riyadh', day: 'numeric', month: 'long' })
export const riyadhDateAr = (ms) => AR_DATE.format(new Date(ms))
export const riyadhDayShortAr = (ms) =>
  new Intl.DateTimeFormat('ar-u-nu-latn', { timeZone: 'Asia/Riyadh', day: 'numeric', month: 'short' }).format(new Date(ms))

// 24h "HH:MM" → Arabic 12h label
export function timeLabelAr(hhmm) {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'صباحًا' : 'مساءً'}`
}
