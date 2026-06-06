import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { invokeWithRetry } from '../invokeWithRetry'

export const RIYADH_OFFSET_MS = 3 * 3600 * 1000 // UTC+3, no DST
export const WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'] // index = dow (0=Sun)

export const BOOKING_TYPES = [
  { key: 'initial_meeting', label: 'لقاء مبدئي', minutes: 30 },
  { key: 'private_class',   label: 'حصة فردية', minutes: 60 },
]

export const BOOKING_STATUS = {
  scheduled: { label: 'مجدول',   color: 'var(--ds-sky)' },
  done:      { label: 'تم',      color: 'var(--ds-accent-success)' },
  no_show:   { label: 'لم يحضر', color: 'var(--ds-accent-danger)' },
  cancelled: { label: 'ملغى',    color: 'var(--ds-text-muted)' },
}

// UTC instant of Riyadh-midnight for the Riyadh day containing `ms`, + dayOffset days.
export function riyadhMidnightUtc(ms, dayOffset = 0) {
  const d = new Date(ms + RIYADH_OFFSET_MS)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + dayOffset) - RIYADH_OFFSET_MS
}
export const riyadhDow = (ms) => new Date(ms + RIYADH_OFFSET_MS).getUTCDay()
export const riyadhDayStr = (ms) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms))
export const riyadhTimeStr = (ms) =>
  new Intl.DateTimeFormat('ar-SA-u-nu-latn', { timeZone: 'Asia/Riyadh', hour: 'numeric', minute: '2-digit' }).format(new Date(ms))

// Combine a Riyadh date (YYYY-MM-DD) + time (HH:MM) into a UTC ISO string.
export function riyadhToUtcIso(dateStr, timeStr) {
  const [y, mo, da] = dateStr.split('-').map(Number)
  const [hh, mm] = timeStr.split(':').map(Number)
  return new Date(Date.UTC(y, mo - 1, da, hh, mm) - RIYADH_OFFSET_MS).toISOString()
}
export const addMinutesIso = (iso, minutes) => new Date(new Date(iso).getTime() + minutes * 60000).toISOString()

export function useAvailability() {
  return useQuery({
    queryKey: ['cs-availability'], staleTime: 300_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('cs_availability_rules').select('*').eq('is_active', true)
      if (error) throw error
      return data || []
    },
  })
}

export function useWeekBookings(fromIso, toIso) {
  return useQuery({
    queryKey: ['cs-bookings', fromIso, toIso], enabled: !!fromIso && !!toIso, staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('cs_bookings').select('*').gte('start_at', fromIso).lt('start_at', toIso).neq('status', 'cancelled').order('start_at')
      if (error) throw error
      return data || []
    },
  })
}

export async function searchStudents(term) {
  const { data, error } = await supabase.rpc('cs_search_students', { p_term: term || '' })
  if (error) throw error
  return data || []
}

// Best-effort calendar sync — gcal-sync is built/gated in C3, so failures are ignored.
export async function syncBooking(bookingId) {
  try { await invokeWithRetry('gcal-sync', { body: { booking_id: bookingId } }, { timeoutMs: 8000, retries: 0 }) } catch { /* C3 not connected yet */ }
}

export function useBookingMutations() {
  const qc = useQueryClient()
  const inval = () => { qc.invalidateQueries({ queryKey: ['cs-bookings'] }); qc.invalidateQueries({ queryKey: ['cs-leads'] }) }
  return {
    book: async (args) => {
      const { data, error } = await supabase.rpc('cs_book', args)
      if (error) throw error
      inval(); syncBooking(data)
      return data
    },
    reschedule: async (args) => {
      const { error } = await supabase.rpc('cs_reschedule', args)
      if (error) throw error
      inval(); syncBooking(args.p_booking)
    },
    setStatus: async (bookingId, status) => {
      const { error } = await supabase.rpc('cs_set_booking_status', { p_booking: bookingId, p_status: status })
      if (error) throw error
      inval(); syncBooking(bookingId)
    },
  }
}

export function bookingErrorAr(msg) {
  if (!msg) return 'حدث خطأ'
  if (msg.includes('slot taken')) return 'الموعد محجوز بالفعل'
  if (msg.includes('outside availability')) return 'خارج أوقات التوفر'
  if (msg.includes('override requires a reason')) return 'سبب التجاوز مطلوب'
  if (msg.includes('not authorized')) return 'غير مصرّح'
  return msg
}
