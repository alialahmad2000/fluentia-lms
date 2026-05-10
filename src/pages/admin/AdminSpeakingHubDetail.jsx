import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Search, X, CheckCircle2, Minus, Users, UserCheck, Bell, BellRing, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ar as arLocale } from 'date-fns/locale'
import SubTabs from '@/components/common/SubTabs'
import AdminSpeakingHubForm from './AdminSpeakingHubForm'
import { toast } from '@/components/ui/FluentiaToast'
import {
  useAdminSpeakingHub,
  useUpdateSpeakingHub,
  useAssignHub,
  useUnassign,
  useAllGroups,
  useAllActiveStudents,
  useSendHubNotification,
} from '@/hooks/useSpeakingHub'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ar-SA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Tab 1 — Edit ──────────────────────────────────────────────────────────────

function EditTab({ hub, hubId }) {
  const { t } = useTranslation()
  const updateHub = useUpdateSpeakingHub(hubId)

  return (
    <AdminSpeakingHubForm
      hub={hub}
      mode="edit"
      onSave={async (data) => {
        await updateHub.mutateAsync(data)
        toast({ type: 'success', title: t('admin.speakingHub.form.saved', 'تم حفظ التغييرات') })
      }}
    />
  )
}

// ── Tab 2 — Assign ────────────────────────────────────────────────────────────

function AssignTab({ hub, hubId }) {
  const { t } = useTranslation()
  const { data: allGroups = [] } = useAllGroups()
  const { data: allStudents = [] } = useAllActiveStudents()
  const assignHub = useAssignHub(hubId)
  const unassign = useUnassign(hubId)

  const [selectedGroups, setSelectedGroups] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [searchQuery, setSearchQuery] = useState('')

  const assignedGroupIds = useMemo(
    () => (hub.assignments || []).filter(a => a.group_id).map(a => a.group_id),
    [hub.assignments]
  )

  const assignedStudentIds = useMemo(
    () => (hub.assignments || []).filter(a => a.student_id).map(a => a.student_id),
    [hub.assignments]
  )

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return allStudents
    return allStudents.filter(s => {
      const name = s.profile?.full_name?.toLowerCase() || ''
      const email = s.profile?.email?.toLowerCase() || ''
      return name.includes(q) || email.includes(q)
    })
  }, [allStudents, searchQuery])

  function toggleGroup(gid) {
    setSelectedGroups(prev =>
      prev.includes(gid) ? prev.filter(x => x !== gid) : [...prev, gid]
    )
  }

  function toggleStudent(sid) {
    setSelectedStudents(prev =>
      prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]
    )
  }

  async function handleAssignGroups() {
    if (!selectedGroups.length) return
    try {
      await assignHub.mutateAsync({ groupIds: selectedGroups, studentIds: [] })
      toast({ type: 'success', title: t('admin.speakingHub.assign.groupsAssigned', 'تم تعيين المجموعات') })
      setSelectedGroups([])
    } catch (err) {
      toast({ type: 'error', title: err.message })
    }
  }

  async function handleAssignStudents() {
    if (!selectedStudents.length) return
    try {
      await assignHub.mutateAsync({ studentIds: selectedStudents, groupIds: [] })
      toast({ type: 'success', title: t('admin.speakingHub.assign.studentsAssigned', 'تم تعيين الطلاب') })
      setSelectedStudents([])
    } catch (err) {
      toast({ type: 'error', title: err.message })
    }
  }

  async function handleUnassign(assignmentId) {
    if (!window.confirm(t('admin.speakingHub.assign.confirmRemove', 'هل تريد إزالة هذا التعيين؟'))) return
    try {
      await unassign.mutateAsync(assignmentId)
      toast({ type: 'success', title: t('admin.speakingHub.assign.removed', 'تم الإزالة') })
    } catch (err) {
      toast({ type: 'error', title: err.message })
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Groups ── */}
      <div className="fl-card-static p-5 space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] flex items-center gap-2">
          <Users size={15} />
          {t('admin.speakingHub.assign.groups', 'المجموعات')}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allGroups.map(group => {
            const isAssigned = assignedGroupIds.includes(group.id)
            const isSelected = selectedGroups.includes(group.id)
            return (
              <button
                key={group.id}
                type="button"
                disabled={isAssigned}
                onClick={() => !isAssigned && toggleGroup(group.id)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-['Tajawal'] text-right transition-all border ${
                  isAssigned
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default'
                    : isSelected
                      ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                      : 'bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                {isAssigned
                  ? <CheckCircle2 size={12} className="shrink-0" />
                  : <div className={`w-3 h-3 rounded-sm border shrink-0 ${isSelected ? 'bg-sky-400 border-sky-400' : 'border-[var(--border-subtle)]'}`} />}
                <span className="truncate">{group.code} — {group.name}</span>
                {isAssigned && (
                  <span className="absolute top-1 left-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1 rounded">
                    {t('admin.speakingHub.assign.alreadyAssigned', 'مُعيّن')}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {selectedGroups.length > 0 && (
          <button
            type="button"
            onClick={handleAssignGroups}
            disabled={assignHub.isPending}
            className="btn-primary text-sm px-4 flex items-center gap-2 font-['Tajawal']"
          >
            {assignHub.isPending ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
            {t('admin.speakingHub.assign.assignBtn', 'تعيين')} ({selectedGroups.length})
          </button>
        )}
      </div>

      {/* ── Individual Students ── */}
      <div className="fl-card-static p-5 space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] flex items-center gap-2">
          <UserCheck size={15} />
          {t('admin.speakingHub.assign.students', 'طلاب أفراد')}
        </h3>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            className="input-field text-sm w-full pr-8 font-['Tajawal']"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('admin.speakingHub.assign.searchPlaceholder', 'ابحث بالاسم أو البريد...')}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Student list */}
        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
          {filteredStudents.map(student => {
            const isAssigned = assignedStudentIds.includes(student.id)
            const isSelected = selectedStudents.includes(student.id)
            const name = student.profile?.full_name || student.profile?.email || student.id
            return (
              <button
                key={student.id}
                type="button"
                disabled={isAssigned}
                onClick={() => !isAssigned && toggleStudent(student.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-right transition-all ${
                  isAssigned
                    ? 'bg-emerald-500/5 text-emerald-400 cursor-default'
                    : isSelected
                      ? 'bg-sky-500/10 text-sky-400'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded border shrink-0 ${
                  isAssigned ? 'bg-emerald-400 border-emerald-400' : isSelected ? 'bg-sky-400 border-sky-400' : 'border-[var(--border-subtle)]'
                }`}>
                  {(isAssigned || isSelected) && <CheckCircle2 size={10} className="text-white m-auto mt-[-1px]" />}
                </div>
                <span className="font-['Tajawal'] truncate flex-1">{name}</span>
                {isAssigned && (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full shrink-0 font-['Tajawal']">
                    {t('admin.speakingHub.assign.alreadyAssigned', 'مُعيّن')}
                  </span>
                )}
              </button>
            )
          })}
          {filteredStudents.length === 0 && (
            <p className="text-center text-[var(--text-muted)] text-xs py-4 font-['Tajawal']">
              {t('admin.speakingHub.assign.noStudents', 'لا توجد نتائج')}
            </p>
          )}
        </div>

        {selectedStudents.length > 0 && (
          <button
            type="button"
            onClick={handleAssignStudents}
            disabled={assignHub.isPending}
            className="btn-primary text-sm px-4 flex items-center gap-2 font-['Tajawal']"
          >
            {assignHub.isPending ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
            {t('admin.speakingHub.assign.assignBtn', 'تعيين')} ({selectedStudents.length})
          </button>
        )}
      </div>

      {/* ── Current assignments ── */}
      {(hub.assignments || []).length > 0 && (
        <div className="fl-card-static p-5 space-y-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
            {t('admin.speakingHub.assign.currentAssignments', 'المعيّنون حالياً')} ({hub.assignments.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" dir="rtl">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-right py-2 px-3 text-[var(--text-muted)] font-['Tajawal'] font-medium">
                    {t('admin.speakingHub.assign.colName', 'الاسم')}
                  </th>
                  <th className="text-right py-2 px-3 text-[var(--text-muted)] font-['Tajawal'] font-medium">
                    {t('admin.speakingHub.assign.colType', 'النوع')}
                  </th>
                  <th className="text-right py-2 px-3 text-[var(--text-muted)] font-['Tajawal'] font-medium">
                    {t('admin.speakingHub.assign.colDate', 'التاريخ')}
                  </th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {hub.assignments.map(a => (
                  <tr key={a.id} className="border-b border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="py-2 px-3 text-[var(--text-primary)] font-['Tajawal']">
                      {a.group
                        ? `${a.group.code} — ${a.group.name}`
                        : a.student?.profile?.full_name || '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-['Tajawal'] ${
                        a.group_id
                          ? 'bg-purple-500/15 text-purple-400'
                          : 'bg-sky-500/15 text-sky-400'
                      }`}>
                        {a.group_id
                          ? t('admin.speakingHub.assign.typeGroup', 'مجموعة')
                          : t('admin.speakingHub.assign.typeStudent', 'طالب')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[var(--text-muted)]">{fmtDate(a.created_at)}</td>
                    <td className="py-2 px-3 text-left">
                      <button
                        onClick={() => handleUnassign(a.id)}
                        className="btn-icon"
                        title={t('admin.speakingHub.assign.removeBtn', 'إزالة')}
                      >
                        <X size={13} className="text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab 3 — Progress ──────────────────────────────────────────────────────────

function ProgressTab({ hub }) {
  const { t } = useTranslation()
  const { data: allStudents = [] } = useAllActiveStudents()

  // Resolve all assigned students
  const assignedStudents = useMemo(() => {
    const result = new Map()

    for (const a of (hub.assignments || [])) {
      if (a.student_id) {
        // individual assignment — student data attached
        const s = allStudents.find(s => s.id === a.student_id)
        if (s) result.set(s.id, s)
      } else if (a.group_id) {
        // group assignment — find all students in that group
        const groupStudents = allStudents.filter(s => s.group_id === a.group_id)
        for (const s of groupStudents) result.set(s.id, s)
      }
    }

    return Array.from(result.values())
  }, [hub.assignments, allStudents])

  const totalStudents = assignedStudents.length

  const watchedCount = useMemo(() => {
    return (hub.progress || []).filter(p => p.video_completed_at).length
  }, [hub.progress])

  const goodNotesCount = useMemo(() => {
    return (hub.progress || []).filter(p => (p.notes_word_count || 0) > 20).length
  }, [hub.progress])

  const progressByStudent = useMemo(() => {
    const map = {}
    for (const p of (hub.progress || [])) {
      map[p.student_id] = p
    }
    return map
  }, [hub.progress])

  return (
    <div className="space-y-5">
      {/* Stats header */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="fl-card-static p-4 text-center">
          <p className="text-2xl font-bold text-[var(--text-primary)] font-['Inter']">{totalStudents}</p>
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] mt-1">
            {t('admin.speakingHub.progress.totalAssigned', 'إجمالي المعيّنين')}
          </p>
        </div>
        <div className="fl-card-static p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400 font-['Inter']">{watchedCount}</p>
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] mt-1">
            {t('admin.speakingHub.progress.watched', 'أنهوا المشاهدة')}
            {totalStudents > 0 && ` (${Math.round((watchedCount / totalStudents) * 100)}%)`}
          </p>
        </div>
        <div className="fl-card-static p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-sky-400 font-['Inter']">{goodNotesCount}</p>
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] mt-1">
            {t('admin.speakingHub.progress.goodNotes', 'كتبوا ملاحظات +20 كلمة')}
            {totalStudents > 0 && ` (${Math.round((goodNotesCount / totalStudents) * 100)}%)`}
          </p>
        </div>
      </div>

      {/* Progress table */}
      {totalStudents === 0 ? (
        <div className="fl-card-static p-10 text-center">
          <Users size={32} className="text-muted mx-auto mb-2" />
          <p className="text-[var(--text-muted)] text-sm font-['Tajawal']">
            {t('admin.speakingHub.progress.noStudents', 'لا يوجد طلاب معيّنون بعد')}
          </p>
        </div>
      ) : (
        <div className="fl-card-static overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" dir="rtl">
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-right py-3 px-4 text-[var(--text-muted)] font-['Tajawal'] font-medium">
                    {t('admin.speakingHub.progress.colName', 'الاسم')}
                  </th>
                  <th className="text-center py-3 px-3 text-[var(--text-muted)] font-['Tajawal'] font-medium">
                    {t('admin.speakingHub.progress.colStarted', 'بدأ المشاهدة')}
                  </th>
                  <th className="text-center py-3 px-3 text-[var(--text-muted)] font-['Tajawal'] font-medium">
                    {t('admin.speakingHub.progress.colWords', 'عدد الكلمات')}
                  </th>
                  <th className="text-center py-3 px-3 text-[var(--text-muted)] font-['Tajawal'] font-medium">
                    {t('admin.speakingHub.progress.colLastUpdate', 'آخر تحديث')}
                  </th>
                  <th className="text-center py-3 px-3 text-[var(--text-muted)] font-['Tajawal'] font-medium">
                    {t('admin.speakingHub.progress.colAttended', 'حضر الجلسة؟')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {assignedStudents.map(student => {
                  const progress = progressByStudent[student.id]
                  const name = student.profile?.full_name || student.profile?.email || student.id
                  const started = progress?.video_started_at
                  const completed = progress?.video_completed_at
                  const wordCount = progress?.notes_word_count || 0
                  const lastUpdate = progress?.notes_updated_at || progress?.video_completed_at
                  const attended = progress?.attended_session

                  return (
                    <tr key={student.id} className="border-b border-[var(--border-subtle)] hover:bg-[rgba(255,255,255,0.02)]">
                      <td className="py-2.5 px-4">
                        <span className="text-[var(--text-primary)] font-['Tajawal']">{name}</span>
                        {completed && (
                          <CheckCircle2 size={11} className="inline mr-1.5 text-emerald-400" />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {started ? (
                          <span className="text-emerald-400">{fmtDateTime(started)}</span>
                        ) : (
                          <span className="text-[var(--text-muted)]">
                            <Minus size={12} className="inline" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {wordCount > 0 ? (
                          <span className={wordCount > 20 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                            {wordCount}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)]">
                            <Minus size={12} className="inline" />
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[var(--text-muted)]">
                        {fmtDateTime(lastUpdate)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {attended === true ? (
                          <CheckCircle2 size={14} className="inline text-emerald-400" />
                        ) : attended === false ? (
                          <X size={14} className="inline text-red-400" />
                        ) : (
                          <Minus size={12} className="inline text-[var(--text-muted)]" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main detail page ──────────────────────────────────────────────────────────

// ── Notification Card ─────────────────────────────────────────────────────────

function NotificationCard({ hub, hubId, sendNotification, confirmOpen, setConfirmOpen, t }) {
  const assignmentCount = (hub?.assignments?.length ?? 0)
  const isPublished = ['published', 'live', 'completed'].includes(hub?.status)
  const canSend = isPublished && assignmentCount > 0 && !sendNotification.isPending

  const lastSent = hub?.last_notification_sent_at
    ? formatDistanceToNow(new Date(hub.last_notification_sent_at), { addSuffix: true, locale: arLocale })
    : null

  async function handleConfirmSend() {
    setConfirmOpen(false)
    try {
      const result = await sendNotification.mutateAsync(hub)
      toast({ type: 'success', title: t('admin.speakingHub.notify.successToast', 'تم إرسال الإشعار إلى {{count}} طالب', { count: result.recipientCount }) })
    } catch (e) {
      toast({ type: 'error', title: e.message || t('admin.speakingHub.notify.failedToast', 'فشل الإرسال') })
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-cyan-500/20 p-5" style={{ background: 'linear-gradient(135deg, rgba(8,145,178,0.08) 0%, rgba(37,99,235,0.08) 100%)' }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="rounded-xl p-3 shrink-0" style={{ background: 'rgba(8,145,178,0.15)', color: '#67e8f9' }}>
              {lastSent ? <Check className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-base text-[var(--text-primary)] font-['Tajawal'] mb-0.5">
                {lastSent
                  ? t('admin.speakingHub.notify.alreadySent', 'الإشعار أُرسل')
                  : t('admin.speakingHub.notify.send', 'إرسال إشعار للطلاب')}
              </div>
              <div className="text-sm text-[var(--text-muted)] font-['Tajawal']">
                {lastSent ? (
                  <>
                    {t('admin.speakingHub.notify.lastSent', 'آخر إرسال {{time}}', { time: lastSent })}
                    {hub.last_notification_recipient_count != null && (
                      <> · {t('admin.speakingHub.notify.recipientCount', 'وصل {{count}} طالب', { count: hub.last_notification_recipient_count })}</>
                    )}
                  </>
                ) : !isPublished ? (
                  t('admin.speakingHub.notify.publishFirst', 'انشر الجلسة أولاً قبل إرسال الإشعار')
                ) : assignmentCount === 0 ? (
                  t('admin.speakingHub.notify.assignFirst', 'عيّن مجموعة أو طلاب أولاً من تاب التعيين')
                ) : (
                  t('admin.speakingHub.notify.willReach', 'سيصل الإشعار لكل الطلاب المعيّنين الآن وفي قائمة الإشعارات')
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={!canSend}
            className="shrink-0 rounded-xl px-5 py-2.5 font-bold font-['Tajawal'] text-sm transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            style={canSend ? {
              background: lastSent
                ? 'rgba(8,145,178,0.15)'
                : 'linear-gradient(135deg, #0891b2, #1d4ed8)',
              color: lastSent ? '#67e8f9' : '#fff',
              border: lastSent ? '1px solid rgba(8,145,178,0.3)' : 'none',
              boxShadow: lastSent ? 'none' : '0 4px 14px rgba(8,145,178,0.3)',
            } : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}
          >
            {sendNotification.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t('admin.speakingHub.notify.sending', 'جاري الإرسال...')}</>
            ) : lastSent ? (
              <><BellRing className="w-4 h-4" /> {t('admin.speakingHub.notify.resend', 'إعادة الإرسال')}</>
            ) : (
              <><Bell className="w-4 h-4" /> 🔔 {t('admin.speakingHub.notify.send', 'إرسال الإشعار')}</>
            )}
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--surface-overlay, #0d1a30)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal'] mb-2">
              {t('admin.speakingHub.notify.confirmTitle', 'تأكيد الإرسال')}
            </h2>
            <p className="text-sm text-[var(--text-muted)] font-['Tajawal'] mb-3">
              {t('admin.speakingHub.notify.confirmBody', 'سيتم إرسال إشعار push + إشعار داخل التطبيق لجميع الطلاب المعيّنين.')}
            </p>
            {lastSent && (
              <p className="text-sm text-amber-300 font-['Tajawal'] mb-3">
                {t('admin.speakingHub.notify.confirmResendWarning', '⚠️ تم إرسال إشعار لهذه الجلسة سابقاً. إعادة الإرسال؟')}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-['Tajawal'] transition-colors hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
              >
                {t('admin.speakingHub.notify.cancel', 'إلغاء')}
              </button>
              <button
                onClick={handleConfirmSend}
                className="px-4 py-2 rounded-xl text-sm font-bold font-['Tajawal'] text-white transition-colors"
                style={{ background: 'linear-gradient(135deg, #0891b2, #1d4ed8)' }}
              >
                {t('admin.speakingHub.notify.confirm', 'نعم، أرسل')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSpeakingHubDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { data: hub, isLoading } = useAdminSpeakingHub(id)

  const [activeTab, setActiveTab] = useState('edit')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const sendNotification = useSendHubNotification(id)

  const TABS = [
    { key: 'edit',     label: t('admin.speakingHub.tabs.edit',     'تعديل') },
    { key: 'assign',   label: t('admin.speakingHub.tabs.assign',   'التعيين') },
    { key: 'progress', label: t('admin.speakingHub.tabs.progress', 'التقدم') },
  ]

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-12 rounded-xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  if (!hub) {
    return (
      <div className="fl-card-static p-10 text-center">
        <p className="text-[var(--text-muted)] font-['Tajawal']">
          {t('admin.speakingHub.detail.notFound', 'الجلسة غير موجودة')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal'] leading-snug">
          {hub.title || hub.title_en || t('admin.speakingHub.list.untitled', 'بدون عنوان')}
        </h1>
        <p className="text-xs text-[var(--text-muted)] font-['Inter'] mt-0.5">{id}</p>
      </motion.div>

      {/* Notification card */}
      <NotificationCard
        hub={hub}
        hubId={id}
        sendNotification={sendNotification}
        confirmOpen={confirmOpen}
        setConfirmOpen={setConfirmOpen}
        t={t}
      />

      {/* Tabs */}
      <SubTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} accent="sky" />

      {/* Tab panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'edit' && <EditTab hub={hub} hubId={id} />}
          {activeTab === 'assign' && <AssignTab hub={hub} hubId={id} />}
          {activeTab === 'progress' && <ProgressTab hub={hub} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
