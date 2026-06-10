import { useMemo, useState } from 'react'
import { Pencil, PauseCircle, PlayCircle, XCircle, MessageCircle, Link2 } from 'lucide-react'
import { toast } from '../../components/ui/FluentiaToast'
import {
  useCoordSchedules, useCoordMutations, classErrorAr,
  WEEKDAYS, CLASS_TYPES, SCHEDULE_STATUS, buildClassShareText, timeLabelAr,
} from '../../lib/coordinator/scheduling'
import ClassModal from './ClassModal'
import ConfirmModal from './ConfirmModal'

const ACTION_LABELS = {
  paused: { title: 'إيقاف الموعد مؤقتًا؟', confirm: 'نعم، إيقاف مؤقت', danger: false },
  active: { title: 'استئناف الموعد؟',      confirm: 'نعم، استئناف',     danger: false },
  ended:  { title: 'إنهاء الموعد نهائيًا؟', confirm: 'نعم، إنهاء',       danger: true },
}

function ScheduleRow({ c, onEdit, onAskStatus }) {
  const ty = CLASS_TYPES[c.type] || CLASS_TYPES.individual
  const st = SCHEDULE_STATUS[c.status] || SCHEDULE_STATUS.active
  const who = c.type === 'individual' ? c.student_name : c.group_name
  const timeLabel = timeLabelAr(c.start_time?.slice(0, 5))

  const shareUrl = buildClassShareText({
    type: c.type, weekly: true, dayOfWeek: c.day_of_week, timeLabel,
    withName: who, trainerName: c.trainer_name, meetingLink: c.meeting_link,
  })

  const ghost = {
    background: 'var(--ds-surface-3)',
    color: 'var(--ds-text-secondary)',
  }

  return (
    <div className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: 'var(--ds-surface-1)',
        border: '1px solid var(--ds-border-subtle)',
        borderInlineStart: `3px solid ${c.status === 'active' ? ty.color : st.color}`,
        opacity: c.status === 'ended' ? 0.55 : 1,
      }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm" style={{ color: 'var(--ds-text-primary)' }}>{who || '—'}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'var(--ds-surface-3)', color: ty.color }}>{ty.label}</span>
          <span className="text-xs font-semibold" style={{ color: st.color }}>{st.label}</span>
        </div>
        <div className="text-[13px] mt-1" style={{ color: 'var(--ds-text-secondary)' }}>
          كل <span className="font-semibold">{WEEKDAYS[c.day_of_week]}</span> الساعة <span className="font-semibold tabular-nums">{timeLabel}</span>
          <span style={{ color: 'var(--ds-text-muted)' }}> · {c.duration_minutes} دقيقة{c.trainer_name ? ` · ${c.trainer_name}` : ''}</span>
        </div>
        {c.notes && <div className="text-xs mt-1 truncate" style={{ color: 'var(--ds-text-muted)' }}>{c.notes}</div>}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
        {c.meeting_link && (
          <button onClick={() => { navigator.clipboard?.writeText(c.meeting_link); toast({ type: 'success', title: 'تم نسخ الرابط' }) }}
            className="min-h-[40px] min-w-[40px] grid place-items-center rounded-lg" style={{ color: 'var(--ds-text-secondary)' }} aria-label="نسخ الرابط" title="نسخ رابط الحصة">
            <Link2 size={15} />
          </button>
        )}
        <a href={shareUrl} target="_blank" rel="noopener noreferrer"
          className="min-h-[40px] min-w-[40px] grid place-items-center rounded-lg" style={{ color: 'var(--ds-accent-success)' }} aria-label="مشاركة واتساب" title="مشاركة عبر واتساب">
          <MessageCircle size={15} />
        </a>
        {c.status !== 'ended' && (
          <>
            <button onClick={() => onEdit(c)}
              className="text-xs px-2.5 rounded-lg inline-flex items-center gap-1 min-h-[40px]" style={ghost}>
              <Pencil size={12} /> تعديل
            </button>
            {c.status === 'active' ? (
              <button onClick={() => onAskStatus(c, 'paused')}
                className="text-xs px-2.5 rounded-lg inline-flex items-center gap-1 min-h-[40px]" style={ghost}>
                <PauseCircle size={12} /> إيقاف مؤقت
              </button>
            ) : (
              <button onClick={() => onAskStatus(c, 'active')}
                className="text-xs px-2.5 rounded-lg inline-flex items-center gap-1 min-h-[40px]" style={ghost}>
                <PlayCircle size={12} /> استئناف
              </button>
            )}
            <button onClick={() => onAskStatus(c, 'ended')}
              className="text-xs px-2.5 rounded-lg inline-flex items-center gap-1 min-h-[40px]" style={ghost}>
              <XCircle size={12} /> إنهاء
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function SchedulesList() {
  const { data: schedules = [], isLoading } = useCoordSchedules()
  const m = useCoordMutations()
  const [edit, setEdit] = useState(null)
  const [ask, setAsk] = useState(null) // { c, status }
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('active') // active | all

  const visible = useMemo(
    () => (filter === 'active' ? schedules.filter((c) => c.status !== 'ended') : schedules),
    [schedules, filter])

  async function confirmStatus() {
    if (!ask || busy) return
    setBusy(true)
    try {
      await m.updateSchedule(ask.c.id, { status: ask.status })
      toast({ type: 'success', title: 'تم التحديث' })
      setAsk(null)
    } catch (e) {
      toast({ type: 'error', title: 'تعذّر التحديث', description: classErrorAr(e?.message) })
    } finally { setBusy(false) }
  }

  return (
    <div dir="rtl">
      <div className="flex items-center gap-2 mb-4">
        {[['active', 'الفعّالة'], ['all', 'الكل']].map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)}
            className="text-xs px-3 rounded-lg font-semibold min-h-[40px]"
            style={filter === v
              ? { background: 'var(--ds-accent-primary)', color: '#06121f' }
              : { background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-tertiary)' }}>
            {label}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-sm py-4" style={{ color: 'var(--ds-text-tertiary)' }}>جارٍ التحميل…</div>}

      {!isLoading && visible.length === 0 && (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--ds-surface-1)', border: '1px dashed var(--ds-border-subtle)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ds-text-secondary)' }}>لا مواعيد أسبوعية بعد</p>
          <p className="text-xs" style={{ color: 'var(--ds-text-muted)' }}>يمكن إنشاء أول موعد من زر «حصة جديدة» في تبويب الجدول</p>
        </div>
      )}

      <div className="space-y-3">
        {visible.map((c) => (
          <ScheduleRow key={c.id} c={c} onEdit={setEdit} onAskStatus={(c2, status) => setAsk({ c: c2, status })} />
        ))}
      </div>

      {edit && <ClassModal mode="edit" schedule={edit} onClose={() => setEdit(null)} />}
      {ask && (
        <ConfirmModal
          danger={ACTION_LABELS[ask.status].danger}
          title={ACTION_LABELS[ask.status].title}
          body={`${ask.c.type === 'individual' ? (ask.c.student_name || 'الحصة الفردية') : (ask.c.group_name || 'حصة المجموعة')} — كل ${WEEKDAYS[ask.c.day_of_week]} ${timeLabelAr(ask.c.start_time?.slice(0, 5))}.${ask.status !== 'active' ? ' ستُلغى الحصص القادمة ويصل إشعار للجميع.' : ' ستعود الحصص للجدول ويصل إشعار للجميع.'}`}
          confirmLabel={ACTION_LABELS[ask.status].confirm}
          busy={busy}
          onConfirm={confirmStatus}
          onClose={() => setAsk(null)} />
      )}
    </div>
  )
}
