import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, ChevronLeft, Plus, MessageCircle, Link2, CalendarX2, Clock, X } from 'lucide-react'
import { toast } from '../../components/ui/FluentiaToast'
import {
  useCoordWeekSessions, useCoordMutations, classErrorAr,
  riyadhMidnightUtc, riyadhDow, riyadhDayStr, riyadhTimeStr, riyadhToUtcIso, riyadhDateAr, riyadhDayShortAr,
  WEEKDAYS, CLASS_TYPES, SESSION_STATUS, buildClassShareText,
} from '../../lib/coordinator/scheduling'
import ClassModal from './ClassModal'
import ConfirmModal from './ConfirmModal'

const HOUR = 3600 * 1000

function RescheduleModal({ session, onClose, onDone }) {
  const m = useCoordMutations()
  const [date, setDate] = useState(riyadhDayStr(new Date(session.start_at).getTime()))
  const [time, setTime] = useState(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', hour12: false })
      .format(new Date(session.start_at)))
  const [saving, setSaving] = useState(false)

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      await m.rescheduleSession(session.id, riyadhToUtcIso(date, time))
      toast({ type: 'success', title: 'تم تغيير الموعد', description: 'وصل الإشعار للجميع' })
      onDone()
    } catch (e) {
      toast({ type: 'error', title: 'تعذّر التغيير', description: classErrorAr(e?.message) })
    } finally { setSaving(false) }
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-[80] flex items-center justify-center p-6"
      style={{ background: 'rgba(2, 8, 18, 0.72)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-sm rounded-2xl p-5"
        style={{ background: 'var(--ds-bg-elevated, var(--ds-surface-1))', border: '1px solid var(--ds-border-subtle)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold" style={{ color: 'var(--ds-text-primary)' }}>تغيير موعد الحصة</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--ds-text-tertiary)' }} aria-label="إغلاق"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-tertiary)' }}>التاريخ</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl py-2.5 px-3 text-sm"
              style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ds-text-tertiary)' }}>الوقت (الرياض)</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl py-2.5 px-3 text-sm"
              style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-primary)' }} />
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-bold min-h-[44px]"
          style={{ background: 'var(--ds-accent-primary)', color: '#06121f' }}>
          {saving ? 'جارٍ الحفظ…' : 'تأكيد الموعد الجديد'}
        </button>
      </motion.div>
    </div>
  )
}


function SessionCard({ s, onCancel, onReschedule }) {
  const ty = CLASS_TYPES[s.type] || CLASS_TYPES.individual
  const st = SESSION_STATUS[s.status] || SESSION_STATUS.scheduled
  const who = s.type === 'individual' ? s.student_name : s.group_name
  const live = s.status === 'scheduled'

  const shareUrl = buildClassShareText({
    type: s.type, weekly: false,
    dateStr: riyadhDateAr(new Date(s.start_at).getTime()),
    timeLabel: riyadhTimeStr(new Date(s.start_at).getTime()),
    withName: who, trainerName: s.trainer_name, meetingLink: s.meeting_link,
  })

  return (
    <div className="rounded-xl p-3 transition-all duration-200"
      style={{
        background: 'var(--ds-surface-2)',
        borderInlineStart: `3px solid ${live ? ty.color : st.color}`,
        opacity: live ? 1 : 0.6,
      }}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold truncate" style={{ color: 'var(--ds-text-primary)' }}>{who || '—'}</span>
        <span className="text-xs shrink-0 tabular-nums" style={{ color: 'var(--ds-text-tertiary)' }}>
          {riyadhTimeStr(new Date(s.start_at).getTime())}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'var(--ds-surface-3)', color: ty.color }}>{ty.label}</span>
        {s.trainer_name && <span className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>{s.trainer_name}</span>}
        {s.status !== 'scheduled' && <span className="text-xs font-semibold" style={{ color: st.color }}>{st.label}</span>}
        {s.schedule_id == null && live && <span className="text-xs" style={{ color: 'var(--ds-accent-warning, #f59e0b)' }}>مرة واحدة</span>}
      </div>
      {live && (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {s.meeting_link && (
            <button onClick={() => { navigator.clipboard?.writeText(s.meeting_link); toast({ type: 'success', title: 'تم نسخ الرابط' }) }}
              className="min-h-[40px] min-w-[40px] grid place-items-center rounded-lg" style={{ color: 'var(--ds-sky, #38bdf8)' }} aria-label="نسخ الرابط" title="نسخ رابط الحصة">
              <Link2 size={15} />
            </button>
          )}
          <a href={shareUrl} target="_blank" rel="noopener noreferrer"
            className="min-h-[40px] min-w-[40px] grid place-items-center rounded-lg" style={{ color: 'var(--ds-accent-success)' }} aria-label="مشاركة واتساب" title="مشاركة عبر واتساب">
            <MessageCircle size={15} />
          </a>
          <button onClick={() => onReschedule(s)}
            className="text-xs px-2.5 rounded-lg inline-flex items-center gap-1 min-h-[40px]"
            style={{ background: 'var(--ds-surface-3)', color: 'var(--ds-text-secondary)' }}>
            <Clock size={12} /> تغيير
          </button>
          <button onClick={() => onCancel(s)}
            className="text-xs px-2.5 rounded-lg inline-flex items-center gap-1 min-h-[40px]"
            style={{ background: 'var(--ds-surface-3)', color: 'var(--ds-text-secondary)' }}>
            <CalendarX2 size={12} /> إلغاء
          </button>
        </div>
      )}
    </div>
  )
}

export default function CoordinatorWeek() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [newClass, setNewClass] = useState(null) // { dayOfWeek?, date? } | null
  const [reschedule, setReschedule] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const m = useCoordMutations()

  const now = Date.now()
  const dow = riyadhDow(now)
  const weekStartMs = riyadhMidnightUtc(now, -dow + weekOffset * 7)
  const fromIso = new Date(weekStartMs).toISOString()
  const toIso = new Date(riyadhMidnightUtc(weekStartMs, 7)).toISOString()
  const { data: sessions = [], isLoading } = useCoordWeekSessions(fromIso, toIso)

  const days = Array.from({ length: 7 }, (_, i) => {
    const startMs = riyadhMidnightUtc(weekStartMs, i)
    const d = riyadhDow(startMs + HOUR)
    const dayStr = riyadhDayStr(startMs + HOUR)
    const items = sessions.filter((s) => riyadhDayStr(new Date(s.start_at).getTime()) === dayStr)
    const isToday = dayStr === riyadhDayStr(now)
    return { d, dayStr, startMs, items, isToday }
  })

  async function confirmCancel() {
    if (!cancelTarget || cancelBusy) return
    setCancelBusy(true)
    try {
      await m.cancelSession(cancelTarget.id)
      toast({ type: 'success', title: 'تم إلغاء الحصة', description: 'وصل إشعار الإلغاء' })
      setCancelTarget(null)
    } catch (e) {
      toast({ type: 'error', title: 'تعذّر الإلغاء', description: classErrorAr(e?.message) })
    } finally { setCancelBusy(false) }
  }

  const weekLabel = `${riyadhDayShortAr(weekStartMs + HOUR)} — ${riyadhDayShortAr(riyadhMidnightUtc(weekStartMs, 6) + HOUR)}`

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <button onClick={() => setNewClass({})}
          className="flex items-center gap-2 px-4 rounded-xl text-sm font-bold min-h-[44px] transition-transform hover:-translate-y-0.5"
          style={{ background: 'var(--ds-accent-primary)', color: '#06121f' }}>
          <Plus size={16} /> حصة جديدة
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="min-h-[40px] min-w-[40px] grid place-items-center rounded-lg" aria-label="الأسبوع السابق"
            style={{ background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)' }}>
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setWeekOffset(0)} className="text-xs px-2 tabular-nums min-h-[40px]"
            style={{ color: weekOffset === 0 ? 'var(--ds-accent-primary)' : 'var(--ds-text-tertiary)' }}>
            {weekLabel}
          </button>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="min-h-[40px] min-w-[40px] grid place-items-center rounded-lg" aria-label="الأسبوع التالي"
            style={{ background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)' }}>
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {isLoading && <div className="text-sm py-4" style={{ color: 'var(--ds-text-tertiary)' }}>جارٍ التحميل…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {days.map((day) => (
          <div key={day.dayStr}
            className="rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: 'var(--ds-surface-1)',
              border: `1px solid ${day.isToday ? 'var(--ds-accent-primary)' : 'var(--ds-border-subtle)'}`,
            }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold" style={{ color: day.isToday ? 'var(--ds-accent-primary)' : 'var(--ds-text-primary)' }}>
                {WEEKDAYS[day.d]}{day.isToday ? ' · اليوم' : ''}
              </span>
              <span className="text-xs tabular-nums" style={{ color: 'var(--ds-text-tertiary)' }}>{riyadhDayShortAr(day.startMs + HOUR)}</span>
            </div>
            <div className="space-y-2">
              {day.items.map((s) => (
                <SessionCard key={s.id} s={s} onCancel={setCancelTarget} onReschedule={setReschedule} />
              ))}
              <button onClick={() => setNewClass({ dayOfWeek: day.d, date: day.dayStr })}
                className="w-full rounded-xl py-2.5 text-xs font-semibold transition-colors min-h-[40px]"
                style={{ border: '1px dashed var(--ds-border-subtle)', color: 'var(--ds-text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ds-accent-primary)'; e.currentTarget.style.borderColor = 'var(--ds-accent-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ds-text-muted)'; e.currentTarget.style.borderColor = 'var(--ds-border-subtle)' }}>
                + إضافة حصة
              </button>
            </div>
          </div>
        ))}
      </div>

      {newClass && (
        <ClassModal mode="create"
          initialDayOfWeek={newClass.dayOfWeek}
          initialDate={newClass.date}
          onClose={() => setNewClass(null)} />
      )}
      {reschedule && (
        <RescheduleModal session={reschedule}
          onClose={() => setReschedule(null)}
          onDone={() => setReschedule(null)} />
      )}
      {cancelTarget && (
        <ConfirmModal
          danger
          title="إلغاء الحصة؟"
          body={`${cancelTarget.type === 'individual' ? (cancelTarget.student_name ? `حصة ${cancelTarget.student_name}` : 'الحصة الفردية') : `حصة ${cancelTarget.group_name || 'المجموعة'}`} يوم ${WEEKDAYS[riyadhDow(new Date(cancelTarget.start_at).getTime())]} ${riyadhTimeStr(new Date(cancelTarget.start_at).getTime())} — سيصل إشعار الإلغاء للجميع.`}
          confirmLabel="نعم، إلغاء الحصة"
          busy={cancelBusy}
          onConfirm={confirmCancel}
          onClose={() => setCancelTarget(null)} />
      )}
    </div>
  )
}
