import { useState } from 'react'
import { ChevronRight, ChevronLeft, Plus, MessageCircle } from 'lucide-react'
import { toast } from '../../components/ui/FluentiaToast'
import { buildWhatsAppUrl } from '../../lib/whatsapp'
import {
  useAvailability, useWeekBookings, useBookingMutations,
  riyadhMidnightUtc, riyadhDow, riyadhDayStr, riyadhTimeStr,
  WEEKDAYS, BOOKING_TYPES, BOOKING_STATUS, bookingErrorAr,
} from '../../lib/cs/scheduling'
import BookModal from './BookModal'

const HOUR = 3600 * 1000

export default function TeamSchedule() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [showBook, setShowBook] = useState(false)
  const [reschedule, setReschedule] = useState(null)
  const m = useBookingMutations()
  const { data: rules = [] } = useAvailability()

  const now = Date.now()
  const dow = riyadhDow(now)
  const weekStartMs = riyadhMidnightUtc(now, -dow + weekOffset * 7)
  const weekFromIso = new Date(weekStartMs).toISOString()
  const weekToIso = new Date(riyadhMidnightUtc(weekStartMs, 7)).toISOString()
  const { data: bookings = [], isLoading } = useWeekBookings(weekFromIso, weekToIso)

  const days = Array.from({ length: 7 }, (_, i) => {
    const startMs = riyadhMidnightUtc(weekStartMs, i)
    const d = riyadhDow(startMs + HOUR)
    const dayStr = riyadhDayStr(startMs + HOUR)
    const rule = rules.find((r) => r.day_of_week === d)
    const items = bookings.filter((b) => riyadhDayStr(new Date(b.start_at).getTime()) === dayStr)
    return { d, dayStr, rule, items }
  })

  const setStatus = async (id, status) => {
    try { await m.setStatus(id, status); toast({ type: 'success', title: 'تم التحديث' }) }
    catch (e) { toast({ type: 'error', title: 'تعذّر', description: bookingErrorAr(e?.message) }) }
  }
  const openWa = (b) => {
    if (!b.contact_whatsapp) return
    window.open(buildWhatsAppUrl(b.contact_whatsapp, `أهلاً ${b.contact_name || ''}! تذكير بموعدك مع أكاديمية طلاقة 🌿`), '_blank', 'noopener,noreferrer')
  }

  const weekLabel = `${days[0].dayStr} — ${days[6].dayStr}`

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <button onClick={() => setShowBook(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--ds-accent-primary)', color: '#06121f' }}>
          <Plus size={16} /> حجز جديد
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="p-1.5 rounded-lg" style={{ background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)' }}><ChevronRight size={16} /></button>
          <button onClick={() => setWeekOffset(0)} className="text-xs px-2" style={{ color: weekOffset === 0 ? 'var(--ds-accent-primary)' : 'var(--ds-text-tertiary)' }}>{weekLabel}</button>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="p-1.5 rounded-lg" style={{ background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)' }}><ChevronLeft size={16} /></button>
        </div>
      </div>

      {isLoading && <div className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>جارٍ التحميل…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {days.map((day) => (
          <div key={day.dayStr} className="rounded-xl p-3" style={{ background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary)' }}>{WEEKDAYS[day.d]}</span>
              <span className="text-[11px]" style={{ color: 'var(--ds-text-tertiary)' }}>{day.dayStr.slice(5)}</span>
            </div>
            <div className="text-[11px] mb-2" style={{ color: day.rule ? 'var(--ds-text-tertiary)' : 'var(--ds-text-muted)' }}>
              {day.rule ? `متاح ${day.rule.start_time.slice(0, 5)}–${day.rule.end_time.slice(0, 5)}` : 'إجازة'}
            </div>
            {day.items.length === 0 ? (
              <div className="text-[11px] text-center py-3" style={{ color: 'var(--ds-text-muted)' }}>—</div>
            ) : (
              <div className="space-y-2">
                {day.items.map((b) => {
                  const st = BOOKING_STATUS[b.status] || {}
                  const ty = BOOKING_TYPES.find((t) => t.key === b.type)
                  return (
                    <div key={b.id} className="rounded-lg p-2" style={{ background: 'var(--ds-surface-2)', borderInlineStart: `3px solid ${st.color}` }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--ds-text-primary)' }}>{b.contact_name || 'بدون اسم'}</span>
                        <span className="text-[11px]" style={{ color: 'var(--ds-text-tertiary)' }}>{riyadhTimeStr(new Date(b.start_at).getTime())}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--ds-surface-3)', color: 'var(--ds-text-tertiary)' }}>{ty?.label}</span>
                        <span className="text-[10px]" style={{ color: st.color }}>{st.label}</span>
                        {b.is_override && <span className="text-[10px]" style={{ color: 'var(--ds-accent-warning)' }}>تجاوز</span>}
                      </div>
                      {b.status === 'scheduled' && (
                        <div className="flex flex-wrap items-center gap-1 mt-2">
                          {b.contact_whatsapp && <button onClick={() => openWa(b)} className="p-1 rounded" style={{ color: 'var(--ds-accent-success)' }} aria-label="واتساب"><MessageCircle size={13} /></button>}
                          <button onClick={() => setReschedule(b)} className="text-[10px] px-2 py-1 rounded" style={{ background: 'var(--ds-surface-3)', color: 'var(--ds-text-secondary)' }}>تغيير</button>
                          <button onClick={() => setStatus(b.id, 'done')} className="text-[10px] px-2 py-1 rounded" style={{ background: 'var(--ds-surface-3)', color: 'var(--ds-accent-success)' }}>تم</button>
                          <button onClick={() => setStatus(b.id, 'no_show')} className="text-[10px] px-2 py-1 rounded" style={{ background: 'var(--ds-surface-3)', color: 'var(--ds-accent-danger)' }}>لم يحضر</button>
                          <button onClick={() => setStatus(b.id, 'cancelled')} className="text-[10px] px-2 py-1 rounded" style={{ background: 'var(--ds-surface-3)', color: 'var(--ds-text-muted)' }}>إلغاء</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {showBook && <BookModal mode="create" onClose={() => setShowBook(false)} />}
      {reschedule && <BookModal mode="reschedule" booking={reschedule} onClose={() => setReschedule(null)} />}
    </div>
  )
}
