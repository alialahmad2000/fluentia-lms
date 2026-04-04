import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Video, ExternalLink, Pencil, Trash2, Calendar, Link2, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { toast } from '../../components/ui/FluentiaToast'

const PARTS = [
  { id: 'a', label: 'Part A', labelAr: 'الجزء A (الأحد)' },
  { id: 'b', label: 'Part B', labelAr: 'الجزء B (الأربعاء)' },
]

function isGoogleDriveUrl(url) {
  return /drive\.google\.com|docs\.google\.com/.test(url)
}

export default function RecordingTab({ unitId }) {
  const { profile } = useAuthStore()
  const role = profile?.role || 'student'
  const isStaff = role === 'admin' || role === 'trainer'

  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ['unit-recordings', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_recordings')
        .select('*')
        .eq('unit_id', unitId)
        .eq('is_archive', false)
        .is('deleted_at', null)
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
    staleTime: 0,
  })

  return (
    <RecordingContent
      recordings={recordings}
      isLoading={isLoading}
      isStaff={isStaff}
      unitId={unitId}
    />
  )
}

// ─── Recording Content ──────────────────────────────
function RecordingContent({ recordings, isLoading, isStaff, unitId }) {
  if (isLoading) return <RecordingSkeleton />

  const recordingByPart = {}
  for (const r of recordings) {
    if (r.part) recordingByPart[r.part] = r
  }

  return (
    <div className="space-y-4">
      {PARTS.map(part => {
        const rec = recordingByPart[part.id]
        return (
          <PartSection
            key={part.id}
            part={part}
            recording={rec}
            isStaff={isStaff}
            unitId={unitId}
          />
        )
      })}
    </div>
  )
}

// ─── Part Section ─────────────────────────────────────
function PartSection({ part, recording, isStaff, unitId }) {
  const [editing, setEditing] = useState(false)

  if (recording && !editing) {
    return (
      <RecordingCard
        recording={recording}
        part={part}
        isStaff={isStaff}
        onEdit={() => setEditing(true)}
      />
    )
  }

  if (isStaff) {
    return (
      <RecordingForm
        part={part}
        unitId={unitId}
        existing={editing ? recording : null}
        onCancel={editing ? () => setEditing(false) : null}
      />
    )
  }

  return <EmptyRecording part={part} unitId={unitId} />
}

// ─── Recording Card ──────────────────────────────────
function RecordingCard({ recording, part, isStaff, onEdit }) {
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا التسجيل؟')) return
    setDeleting(true)
    const { error } = await supabase
      .from('class_recordings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', recording.id)

    if (error) {
      toast({ type: 'error', title: 'حدث خطأ أثناء الحذف' })
    } else {
      toast({ type: 'success', title: 'تم حذف التسجيل' })
      queryClient.invalidateQueries({ queryKey: ['unit-recordings'] })
    }
    setDeleting(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
            <Video size={18} className="text-sky-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
              تسجيل {part.label}
            </h4>
            {recording.recorded_date && (
              <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
                <Calendar size={11} className="inline ml-1" />
                {new Date(recording.recorded_date).toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {isStaff && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onEdit}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
              title="تعديل"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
              title="حذف"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {recording.notes && (
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{recording.notes}</p>
      )}

      <a
        href={recording.google_drive_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500/15 text-sky-400 text-sm font-bold font-['Tajawal'] border border-sky-500/30 hover:bg-sky-500/25 transition-colors"
      >
        <ExternalLink size={14} />
        فتح التسجيل
      </a>
    </motion.div>
  )
}

// ─── Upload / Edit Form ─────────────────────────────
function RecordingForm({ part, unitId, existing, onCancel }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [url, setUrl] = useState(existing?.google_drive_url || '')
  const [date, setDate] = useState(existing?.recorded_date || new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState(existing?.notes || '')
  const [saving, setSaving] = useState(false)

  const urlTrimmed = url.trim()
  const isValid = urlTrimmed.length > 5
  const isGoogleDrive = isGoogleDriveUrl(urlTrimmed)

  const handleSave = async () => {
    if (!isValid || saving) return
    setSaving(true)

    // Extract file ID from Google Drive URL if possible
    const fileIdMatch = urlTrimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)
    const payload = {
      google_drive_url: urlTrimmed,
      google_drive_file_id: fileIdMatch?.[1] || '',
      recorded_date: date || null,
      notes: notes.trim() || null,
    }

    let error
    if (existing) {
      ;({ error } = await supabase
        .from('class_recordings')
        .update(payload)
        .eq('id', existing.id))
    } else {
      ;({ error } = await supabase
        .from('class_recordings')
        .insert({
          ...payload,
          unit_id: unitId,
          part: part.id,
          uploaded_by: user.id,
          is_archive: false,
        }))
    }

    setSaving(false)
    if (error) {
      console.error('[RecordingForm] Save error:', error)
      toast({ type: 'error', title: 'حدث خطأ أثناء الحفظ' })
    } else {
      toast({ type: 'success', title: existing ? 'تم تحديث التسجيل' : 'تم حفظ التسجيل' })
      queryClient.invalidateQueries({ queryKey: ['unit-recordings'] })
      if (onCancel) onCancel()
    }
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
          <Video size={14} className="text-sky-400" />
        </div>
        <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
          {existing ? `تعديل تسجيل ${part.label}` : part.labelAr}
        </span>
      </div>

      {/* URL input */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-[var(--text-muted)] font-['Tajawal']">رابط التسجيل</label>
        <div className="relative">
          <Link2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://drive.google.com/..."
            dir="ltr"
            className="w-full h-11 pr-9 pl-3 rounded-xl text-sm font-['Inter'] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        </div>
        {urlTrimmed && !isGoogleDrive && (
          <p className="flex items-center gap-1 text-[11px] text-amber-400 font-['Tajawal']">
            <AlertCircle size={11} />
            الرابط ليس من Google Drive — تأكد من صحته
          </p>
        )}
      </div>

      {/* Date input */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-[var(--text-muted)] font-['Tajawal']">تاريخ الحصة</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full h-11 px-3 rounded-xl text-sm font-['Inter'] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </div>

      {/* Notes input */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-[var(--text-muted)] font-['Tajawal']">ملاحظات (اختياري)</label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="مثلاً: مراجعة الوحدة السابقة"
          className="w-full h-11 px-3 rounded-xl text-sm font-['Tajawal'] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-colors"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          dir="rtl"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500/15 text-sky-400 text-sm font-bold font-['Tajawal'] border border-sky-500/30 hover:bg-sky-500/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'جاري الحفظ...' : 'حفظ التسجيل'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] font-['Tajawal'] transition-colors"
          >
            إلغاء
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Empty State (Student) with Request ─────────────
function EmptyRecording({ part, unitId }) {
  const { user, studentData } = useAuthStore()
  const groupId = studentData?.group_id
  const [requested, setRequested] = useState(false)
  const [loading, setLoading] = useState(false)

  // Check for existing pending request
  const { data: existingRequest } = useQuery({
    queryKey: ['recording-request', user?.id, unitId, part.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('recording_requests')
        .select('id, created_at')
        .eq('student_id', user.id)
        .eq('unit_id', unitId)
        .eq('part', part.id)
        .eq('status', 'pending')
        .maybeSingle()
      return data
    },
    enabled: !!user?.id && !!unitId,
  })

  // Check if request was made within 24 hours
  const recentlyRequested = existingRequest && (Date.now() - new Date(existingRequest.created_at).getTime() < 24 * 60 * 60 * 1000)

  const handleRequest = async () => {
    if (loading || recentlyRequested) return
    setLoading(true)
    try {
      const { error } = await supabase.from('recording_requests').insert({
        student_id: user.id,
        group_id: groupId,
        unit_id: unitId,
        part: part.id,
      })
      if (error) {
        if (error.code === '23505') {
          toast({ type: 'info', title: 'تم إرسال طلب مسبقاً لهذا التسجيل' })
        } else {
          console.error('[RecordingRequest] Error:', error)
          toast({ type: 'error', title: 'حدث خطأ أثناء إرسال الطلب' })
        }
      } else {
        // Notify admin + group trainer
        try {
          const { data: admins } = await supabase
            .from('profiles')
            .select('id')
            .eq('role', 'admin')
          const { data: group } = await supabase
            .from('groups')
            .select('trainer_id')
            .eq('id', groupId)
            .single()

          const recipients = [...(admins || []).map(a => a.id)]
          if (group?.trainer_id) recipients.push(group.trainer_id)

          if (recipients.length > 0) {
            const notifications = [...new Set(recipients)].map(uid => ({
              user_id: uid,
              type: 'system',
              title: 'طلب تسجيل 📩',
              body: `طالب يطلب تسجيل Part ${part.id.toUpperCase()}`,
              data: { unit_id: unitId, part: part.id, group_id: groupId },
              read: false,
            }))
            await supabase.from('notifications').insert(notifications)
          }
        } catch {}

        setRequested(true)
        toast({ type: 'success', title: 'تم إرسال الطلب — سيتم رفع التسجيل قريباً' })
      }
    } finally {
      setLoading(false)
    }
  }

  const isDisabled = recentlyRequested || requested || loading

  return (
    <div
      className="rounded-xl p-5 flex flex-col items-center gap-3 text-center"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center">
        <Video size={20} className="text-[var(--text-muted)]" />
      </div>
      <div>
        <p className="text-sm font-bold text-[var(--text-secondary)] font-['Tajawal']">تسجيل {part.label}</p>
        <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] mt-1">لم يُرفع تسجيل بعد</p>
      </div>
      <button
        onClick={handleRequest}
        disabled={isDisabled}
        className={`px-4 py-2 rounded-xl text-xs font-bold font-['Tajawal'] border transition-colors ${
          isDisabled
            ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5 cursor-not-allowed'
            : 'text-sky-400 border-sky-500/20 hover:bg-sky-500/10'
        }`}
      >
        {isDisabled ? 'تم إرسال الطلب ✅' : loading ? 'جاري الإرسال...' : 'اطلب التسجيل 📩'}
      </button>
    </div>
  )
}

// ─── Skeleton ───────────────────────────────────────
function RecordingSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map(i => (
        <div key={i} className="h-32 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      ))}
    </div>
  )
}
