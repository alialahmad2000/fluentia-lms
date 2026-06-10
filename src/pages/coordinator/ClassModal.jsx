import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Search, AlertTriangle, Check, MessageCircle, Plus, Link2 } from 'lucide-react'
import { toast } from '../../components/ui/FluentiaToast'
import {
  useCoordStudents, useCoordTrainers, useCoordGroups, useCoordMutations,
  checkConflicts, classErrorAr, buildClassShareText, timeLabelAr,
  WEEKDAYS, riyadhToUtcIso, DURATIONS,
} from '../../lib/coordinator/scheduling'

const field = {
  background: 'var(--ds-surface-2)',
  border: '1px solid var(--ds-border-subtle)',
  color: 'var(--ds-text-primary)',
}

function Label({ children }) {
  return <label className="block text-[12px] font-semibold mb-1.5" style={{ color: 'var(--ds-text-tertiary)' }}>{children}</label>
}

function Seg({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl p-1 gap-1" style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)' }}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all"
          style={value === o.value
            ? { background: 'var(--ds-accent-primary)', color: '#06121f' }
            : { color: 'var(--ds-text-tertiary)' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

// mode: 'create' (weekly or one-off) | 'edit' (existing weekly template)
// initialDayOfWeek / initialDate prefill the slot when opened from a day card.
export default function ClassModal({ mode = 'create', schedule = null, initialDayOfWeek = null, initialDate = '', onClose }) {
  const { data: students = [] } = useCoordStudents()
  const { data: trainers = [] } = useCoordTrainers()
  const { data: groups = [] } = useCoordGroups()
  const m = useCoordMutations()

  const [type, setType] = useState(schedule?.type || 'individual')
  const [recurrence, setRecurrence] = useState(mode === 'edit' ? 'weekly' : 'weekly') // weekly | once
  const [studentId, setStudentId] = useState(schedule?.student_id || '')
  const [groupId, setGroupId] = useState(schedule?.group_id || '')
  const [trainerId, setTrainerId] = useState(schedule?.trainer_id || '')
  const [dayOfWeek, setDayOfWeek] = useState(schedule?.day_of_week ?? initialDayOfWeek ?? 0)
  const [time, setTime] = useState(schedule?.start_time?.slice(0, 5) || '20:00')
  const [date, setDate] = useState(initialDate || '') // one-off only (Riyadh date)
  const [duration, setDuration] = useState(schedule?.duration_minutes || 60)
  const [link, setLink] = useState(schedule?.meeting_link || '')
  const [notes, setNotes] = useState(schedule?.notes || '')
  const [studentQuery, setStudentQuery] = useState('')
  const [conflicts, setConflicts] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(null) // share payload after success

  // picking a group pre-fills its assigned teacher
  useEffect(() => {
    if (type === 'group' && groupId) {
      const g = groups.find((x) => x.id === groupId)
      if (g?.trainer_id) setTrainerId(g.trainer_id)
    }
  }, [type, groupId, groups])

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim()
    if (!q) return students
    return students.filter((s) => (s.full_name || '').includes(q) || (s.group_name || '').includes(q))
  }, [students, studentQuery])

  const ready =
    trainerId &&
    (type === 'individual' ? studentId : groupId) &&
    (recurrence === 'weekly' ? time : (date && time))

  // best-effort conflict preview for one-off sessions (weekly templates are
  // checked per-occurrence by the DB on save)
  useEffect(() => {
    let alive = true
    async function run() {
      if (recurrence !== 'once' || !ready) { setConflicts([]); return }
      try {
        const startIso = riyadhToUtcIso(date, time)
        const endIso = new Date(new Date(startIso).getTime() + duration * 60000).toISOString()
        const c = await checkConflicts({
          trainerId, studentId: type === 'individual' ? studentId : null, startIso, endIso,
        })
        if (alive) setConflicts(Array.isArray(c) ? c : [])
      } catch { if (alive) setConflicts([]) }
    }
    run()
    return () => { alive = false }
  }, [recurrence, ready, date, time, duration, trainerId, studentId, type])

  async function save() {
    if (!ready || saving) return
    setSaving(true)
    try {
      const trainerName = trainers.find((t) => t.id === trainerId)?.full_name
      const withName = type === 'individual'
        ? students.find((s) => s.id === studentId)?.full_name
        : groups.find((g) => g.id === groupId)?.name

      if (mode === 'edit') {
        await m.updateSchedule(schedule.id, {
          dayOfWeek, startTime: time, duration, meetingLink: link, notes,
        })
        toast({ type: 'success', title: 'تم تحديث الموعد', description: 'وصل الإشعار للجميع' })
        onClose()
        return
      }

      if (recurrence === 'weekly') {
        await m.createSchedule({
          type, studentId: type === 'individual' ? studentId : null,
          groupId: type === 'group' ? groupId : null,
          trainerId, dayOfWeek, startTime: time, duration, meetingLink: link, notes,
        })
        setSaved({
          shareUrl: buildClassShareText({
            type, weekly: true, dayOfWeek, timeLabel: timeLabelAr(time),
            withName, trainerName, meetingLink: link,
          }),
        })
      } else {
        await m.createSession({
          type, studentId: type === 'individual' ? studentId : null,
          groupId: type === 'group' ? groupId : null,
          trainerId, startIso: riyadhToUtcIso(date, time), duration, meetingLink: link, notes,
        })
        setSaved({
          shareUrl: buildClassShareText({
            type, weekly: false, dateStr: date, timeLabel: timeLabelAr(time),
            withName, trainerName, meetingLink: link,
          }),
        })
      }
      toast({ type: 'success', title: 'تم حفظ الحصة ✓', description: 'وصل الإشعار للجميع' })
    } catch (e) {
      toast({ type: 'error', title: 'تعذّر الحفظ', description: classErrorAr(e?.message) })
    } finally {
      setSaving(false)
    }
  }

  function resetForAnother() {
    setSaved(null); setStudentId(''); setGroupId(''); setLink(''); setNotes(''); setStudentQuery('')
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: 'rgba(2, 8, 18, 0.72)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 sm:p-6"
        style={{
          background: 'var(--ds-bg-elevated, var(--ds-surface-1))',
          border: '1px solid var(--ds-border-subtle)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }}>
            {mode === 'edit' ? 'تعديل الموعد الأسبوعي' : 'حصة جديدة'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ color: 'var(--ds-text-tertiary)' }} aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>

        {saved ? (
          // success state — share or add another
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(74, 222, 128, 0.12)', border: '1px solid rgba(74, 222, 128, 0.35)' }}>
              <Check size={26} style={{ color: 'var(--ds-accent-success)' }} />
            </div>
            <p className="font-bold mb-1" style={{ color: 'var(--ds-text-primary)' }}>تم حفظ الحصة</p>
            <p className="text-sm mb-6" style={{ color: 'var(--ds-text-tertiary)' }}>
              الموعد ظاهر الآن في حسابات الجميع، ووصلهم الإشعار.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <a href={saved.shareUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#25D366', color: '#06121f' }}>
                <MessageCircle size={16} /> مشاركة عبر واتساب
              </a>
              <button onClick={resetForAnother}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--ds-surface-2)', border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)' }}>
                <Plus size={16} /> حصة أخرى
              </button>
              <button onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ color: 'var(--ds-text-tertiary)' }}>
                إغلاق
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {mode !== 'edit' && (
              <>
                <div>
                  <Label>نوع الحصة</Label>
                  <Seg value={type} onChange={(v) => { setType(v); setStudentId(''); setGroupId('') }}
                    options={[{ value: 'individual', label: 'فردية (طالب واحد)' }, { value: 'group', label: 'جماعية (مجموعة)' }]} />
                </div>

                {type === 'individual' ? (
                  <div>
                    <Label>الطالب</Label>
                    <div className="relative mb-2">
                      <Search size={14} className="absolute top-1/2 -translate-y-1/2 right-3" style={{ color: 'var(--ds-text-muted)' }} />
                      <input value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)}
                        placeholder="البحث بالاسم أو المجموعة…"
                        className="w-full rounded-xl py-2.5 pr-9 pl-3 text-sm" style={field} />
                    </div>
                    <div className="max-h-44 overflow-y-auto rounded-xl" style={{ border: '1px solid var(--ds-border-subtle)' }}>
                      {filteredStudents.map((s) => (
                        <button key={s.id} type="button" onClick={() => setStudentId(s.id)}
                          className="w-full flex items-center gap-2.5 px-3 text-sm text-start min-h-[44px]"
                          style={{
                            background: studentId === s.id ? 'var(--ds-surface-3)' : 'transparent',
                            color: studentId === s.id ? 'var(--ds-text-primary)' : 'var(--ds-text-secondary)',
                          }}>
                          <span className="w-7 h-7 rounded-full grid place-items-center text-xs font-bold shrink-0"
                            style={{
                              background: 'linear-gradient(135deg, var(--ds-accent-primary), var(--ds-accent-secondary, #a78bfa))',
                              color: '#06121f',
                            }}>
                            {(s.full_name || '؟').charAt(0)}
                          </span>
                          <span className="flex-1 truncate">{s.full_name}</span>
                          <span className="text-xs shrink-0" style={{ color: 'var(--ds-text-muted)' }}>{s.group_name || '—'}</span>
                          {studentId === s.id && <Check size={15} className="shrink-0" style={{ color: 'var(--ds-accent-primary)' }} />}
                        </button>
                      ))}
                      {filteredStudents.length === 0 && (
                        <div className="px-3 py-3 text-sm text-center" style={{ color: 'var(--ds-text-muted)' }}>لا نتائج</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label>المجموعة</Label>
                    <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
                      className="w-full rounded-xl py-2.5 px-3 text-sm" style={field}>
                      <option value="">المجموعة…</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name} ({g.member_count} {g.member_count >= 3 && g.member_count <= 10 ? 'طلاب' : 'طالب'})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <Label>المدرب</Label>
                  <select value={trainerId} onChange={(e) => setTrainerId(e.target.value)}
                    className="w-full rounded-xl py-2.5 px-3 text-sm" style={field}>
                    <option value="">المدرب…</option>
                    {trainers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>

                <div>
                  <Label>التكرار</Label>
                  <Seg value={recurrence} onChange={setRecurrence}
                    options={[{ value: 'weekly', label: 'أسبوعية ثابتة' }, { value: 'once', label: 'مرة واحدة' }]} />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              {recurrence === 'weekly' ? (
                <div>
                  <Label>اليوم</Label>
                  <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full rounded-xl py-2.5 px-3 text-sm" style={field}>
                    {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <Label>التاريخ</Label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl py-2.5 px-3 text-sm" style={field} />
                </div>
              )}
              <div>
                <Label>الوقت (بتوقيت الرياض)</Label>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl py-2.5 px-3 text-sm" style={field} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المدة</Label>
                <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full rounded-xl py-2.5 px-3 text-sm" style={field}>
                  {DURATIONS.map((d) => <option key={d} value={d}>{d} دقيقة</option>)}
                </select>
              </div>
              <div>
                <Label>رابط الحصة</Label>
                <div className="relative">
                  <Link2 size={14} className="absolute top-1/2 -translate-y-1/2 right-3" style={{ color: 'var(--ds-text-muted)' }} />
                  <input value={link} onChange={(e) => setLink(e.target.value)} dir="ltr"
                    placeholder="https://meet.google.com/…"
                    className="w-full rounded-xl py-2.5 pr-9 pl-3 text-sm text-left" style={field} />
                </div>
              </div>
            </div>

            <div>
              <Label>ملاحظات (اختياري)</Label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: تركيز على المحادثة"
                className="w-full rounded-xl py-2.5 px-3 text-sm" style={field} />
            </div>

            {conflicts.length > 0 && (
              <div className="rounded-xl p-3 flex items-start gap-2"
                style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--ds-accent-warning, #f59e0b)' }} />
                <div className="text-[12px]" style={{ color: 'var(--ds-text-secondary)' }}>
                  يوجد تعارض في هذا الوقت — {conflicts.some((c) => c.with === 'trainer') ? 'المدرب' : 'الطالب'} لديه حصة أخرى.
                  يلزم اختيار وقت مختلف.
                </div>
              </div>
            )}

            <button onClick={save} disabled={!ready || saving || conflicts.length > 0}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all"
              style={{
                background: (!ready || conflicts.length > 0) ? 'var(--ds-surface-3)' : 'var(--ds-accent-primary)',
                color: (!ready || conflicts.length > 0) ? 'var(--ds-text-muted)' : '#06121f',
                cursor: (!ready || saving || conflicts.length > 0) ? 'not-allowed' : 'pointer',
              }}>
              {saving ? 'جارٍ الحفظ…' : (mode === 'edit' ? 'حفظ التعديلات' : 'حفظ الحصة وإشعار الجميع')}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
