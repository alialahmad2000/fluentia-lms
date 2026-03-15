import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { PlayCircle, Plus, Trash2, Eye, EyeOff, Loader2, X, Brain, CheckCircle2, Bell } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

const CLASS_TYPES = [
  { value: 'reading', label: 'قراءة' },
  { value: 'grammar', label: 'قواعد' },
  { value: 'speaking', label: 'محادثة' },
  { value: 'listening', label: 'استماع' },
  { value: 'writing', label: 'كتابة' },
  { value: 'general', label: 'عام' },
  { value: 'ielts', label: 'IELTS' },
]

const TRACKS = [
  { value: 'foundation', label: 'أساسي' },
  { value: 'development', label: 'تطوير' },
  { value: 'ielts', label: 'IELTS' },
]

function extractGoogleDriveFileId(url) {
  let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  return null
}

function getEmptyForm() {
  return {
    title: '', google_drive_url: '', class_type: 'general', level: 1,
    track: 'foundation', recorded_date: new Date().toISOString().split('T')[0],
    duration_minutes: '', description: '', group_id: '',
  }
}

export default function AdminRecordings() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(getEmptyForm)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(null)

  const { data: recordings, isLoading } = useQuery({
    queryKey: ['admin-recordings'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_recordings')
        .select('*, uploader:uploaded_by(full_name)')
        .is('deleted_at', null)
        .order('recorded_date', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const { data: groups } = useQuery({
    queryKey: ['admin-groups-list'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('id, name, code').eq('is_active', true)
      if (error) throw error
      return data || []
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const fileId = extractGoogleDriveFileId(form.google_drive_url)
      if (!fileId) throw new Error('رابط Google Drive غير صالح')
      if (!form.title.trim()) throw new Error('العنوان مطلوب')

      const { data: recording, error } = await supabase.from('class_recordings').insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        class_type: form.class_type,
        level: parseInt(form.level),
        track: form.track,
        google_drive_url: form.google_drive_url,
        google_drive_file_id: fileId,
        recorded_date: form.recorded_date,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        uploaded_by: profile?.id,
        group_id: form.group_id || null,
      }).select().single()
      if (error) throw error

      // Send notifications to students at the same level
      let notifiedCount = 0
      try {
        const { data: students } = await supabase
          .from('students')
          .select('id')
          .eq('academic_level', parseInt(form.level))
          .is('deleted_at', null)

        if (students?.length > 0) {
          const typeLabel = CLASS_TYPES.find(t => t.value === form.class_type)?.label || form.class_type
          const notifications = students.map(s => ({
            user_id: s.id,
            type: 'system',
            title: 'تسجيل حصة جديد',
            body: `تم إضافة تسجيل: ${recording.title} (${typeLabel})`,
            data: { recording_id: recording.id },
            read: false,
          }))
          const { error: notifErr } = await supabase.from('notifications').insert(notifications)
          if (!notifErr) notifiedCount = students.length
        }
      } catch {
        // Don't fail the save if notifications fail
      }

      return { recording, notifiedCount }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-recordings'] })
      const prevLevel = form.level
      const prevTrack = form.track
      setForm({ ...getEmptyForm(), level: prevLevel, track: prevTrack })
      setShowForm(false)
      setSaveSuccess(`تم حفظ التسجيل وإرسال إشعار لـ ${result.notifiedCount} طالب/طالبة`)
      setTimeout(() => setSaveSuccess(null), 5000)
    },
  })

  const toggleVisibility = useMutation({
    mutationFn: async ({ id, visible }) => {
      const { error } = await supabase.from('class_recordings').update({ is_visible: visible }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-recordings'] }),
  })

  const deleteRecording = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('class_recordings').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-recordings'] }),
  })

  async function handleAIFill() {
    if (!aiText.trim()) return
    setAiLoading(true)
    try {
      const formSchema = [
        { key: 'title', type: 'text', label: 'العنوان', required: true },
        { key: 'class_type', type: 'select', label: 'نوع الحصة', options: CLASS_TYPES.map(t => ({ value: t.value, label: t.label })) },
        { key: 'level', type: 'number', label: 'المستوى (1-6)' },
        { key: 'track', type: 'select', label: 'المسار', options: TRACKS.map(t => ({ value: t.value, label: t.label })) },
        { key: 'recorded_date', type: 'date', label: 'تاريخ التسجيل' },
        { key: 'duration_minutes', type: 'number', label: 'المدة بالدقائق' },
        { key: 'description', type: 'textarea', label: 'وصف' },
        { key: 'google_drive_url', type: 'text', label: 'رابط Google Drive' },
        { key: 'group_id', type: 'select', label: 'المجموعة', options: (groups || []).map(g => ({ value: g.id, label: `${g.code} — ${g.name}` })) },
      ]
      const res = await invokeWithRetry('ai-form-filler', {
        body: {
          pageId: 'admin-recordings',
          formSchema,
          userMessage: aiText,
          contextData: {
            currentDate: new Date().toISOString().split('T')[0],
            groups: (groups || []).map(g => ({ id: g.id, name: g.name })),
          },
        },
        
      }, { timeoutMs: 15000, retries: 0 })
      const filled = res.data?.filledFields
      if (filled) {
        setForm(prev => ({
          ...prev,
          title: filled.title || prev.title,
          class_type: filled.class_type || prev.class_type,
          level: filled.level || prev.level,
          recorded_date: filled.recorded_date || prev.recorded_date,
          description: filled.description || prev.description,
          google_drive_url: filled.google_drive_url || prev.google_drive_url,
          track: filled.track || prev.track,
          duration_minutes: filled.duration_minutes || prev.duration_minutes,
          group_id: filled.group_id || prev.group_id,
        }))
      }
    } catch (err) {
      console.error('AI fill error:', err)
    } finally {
      setAiLoading(false)
    }
  }

  const typeLabels = Object.fromEntries(CLASS_TYPES.map(t => [t.value, t.label]))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-page-title">التسجيلات</h1>
          <p className="text-muted text-sm mt-1">إدارة تسجيلات الحصص</p>
        </motion.div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-4 flex items-center gap-2">
          <Plus size={16} />
          إضافة تسجيل
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="fl-card-static p-7">
          {/* AI Fill */}
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                className="input-field flex-1 text-sm"
                placeholder="اكتب معلومات التسجيل... مثال: ريدنق ليفل ١ يونت 9A تاريخ ٨ مارس"
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAIFill()}
              />
              <button onClick={handleAIFill} disabled={aiLoading} className="btn-secondary text-sm px-4 flex items-center gap-2 shrink-0">
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
                أملأ البيانات
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted mb-1 block">العنوان *</label>
              <input className="input-field text-sm" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="حصة قراءة - الوحدة 9A" />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">رابط Google Drive *</label>
              <input className="input-field text-sm" value={form.google_drive_url} onChange={(e) => setForm(f => ({ ...f, google_drive_url: e.target.value }))} placeholder="الصق رابط Google Drive هنا" dir="ltr" />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">نوع الحصة</label>
              <select className="input-field text-sm" value={form.class_type} onChange={(e) => setForm(f => ({ ...f, class_type: e.target.value }))}>
                {CLASS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">المستوى</label>
              <select className="input-field text-sm" value={form.level} onChange={(e) => setForm(f => ({ ...f, level: e.target.value }))}>
                {[1,2,3,4,5,6].map(l => <option key={l} value={l}>المستوى {l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">المسار</label>
              <select className="input-field text-sm" value={form.track} onChange={(e) => setForm(f => ({ ...f, track: e.target.value }))}>
                {TRACKS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">التاريخ</label>
              <input type="date" className="input-field text-sm" value={form.recorded_date} onChange={(e) => setForm(f => ({ ...f, recorded_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">المدة (دقيقة)</label>
              <input type="number" className="input-field text-sm" value={form.duration_minutes} onChange={(e) => setForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="60" />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">المجموعة (اختياري)</label>
              <select className="input-field text-sm" value={form.group_id} onChange={(e) => setForm(f => ({ ...f, group_id: e.target.value }))}>
                <option value="">الكل</option>
                {groups?.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs text-muted mb-1 block">وصف (اختياري)</label>
            <textarea className="input-field text-sm" rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="ملاحظات إضافية..." />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">إلغاء</button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="btn-primary text-sm px-6 flex items-center gap-2"
            >
              {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              حفظ التسجيل
            </button>
          </div>
          {saveMutation.isError && <p className="text-red-400 text-xs mt-2">{saveMutation.error?.message}</p>}
        </motion.div>
      )}

      {/* Success Banner */}
      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fl-card-static p-4 border-emerald-500/20 flex items-center gap-3"
        >
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-400 font-medium">{saveSuccess}</p>
        </motion.div>
      )}

      {/* Recordings Table */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : recordings?.length > 0 ? (
        <div className="space-y-3">
          {recordings.map((rec) => (
            <div key={rec.id} className="fl-card-static p-5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{rec.title}</p>
                  <span className="badge-blue text-xs shrink-0">{typeLabels[rec.class_type] || rec.class_type}</span>
                  <span className="badge-muted text-xs shrink-0">مستوى {rec.level}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span>{new Date(rec.recorded_date).toLocaleDateString('ar-SA')}</span>
                  <span>{rec.uploader?.full_name}</span>
                  <span className="flex items-center gap-1"><Eye size={10} /> {rec.view_count || 0}</span>
                  {rec.is_visible
                    ? <span className="text-emerald-400 flex items-center gap-0.5"><Eye size={10} /> مرئي</span>
                    : <span className="text-amber-400 flex items-center gap-0.5"><EyeOff size={10} /> مخفي</span>
                  }
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {profile?.role === 'admin' && (
                  <>
                    <button
                      onClick={() => toggleVisibility.mutate({ id: rec.id, visible: !rec.is_visible })}
                      className="btn-icon"
                      title={rec.is_visible ? 'إخفاء' : 'إظهار'}
                    >
                      {rec.is_visible ? <EyeOff size={16} className="text-muted" /> : <Eye size={16} className="text-muted" />}
                    </button>
                    <button
                      onClick={() => { if (confirm('حذف التسجيل؟')) deleteRecording.mutate(rec.id) }}
                      className="btn-icon"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="fl-card-static p-12 text-center">
          <PlayCircle size={40} className="text-muted mx-auto mb-3" />
          <p className="text-muted">لا توجد تسجيلات</p>
        </div>
      )}
    </div>
  )
}
