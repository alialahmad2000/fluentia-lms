import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PlayCircle, Plus, Trash2, Eye, EyeOff, Loader2, X, Brain,
  CheckCircle2, Video, ChevronDown, ExternalLink, Pencil,
  MessageSquare, BookOpen, Archive, AlertCircle, Link2, ImagePlus,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import { toast } from '../../components/ui/FluentiaToast'
import VideoPlayer from '../../components/VideoPlayer'
import ChapterManager from '../../components/recordings/ChapterManager'

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

function getEmptyCurriculumForm() {
  return {
    group_id: '', unit_id: '', part: 'a',
    google_drive_url: '', recorded_date: new Date().toISOString().split('T')[0],
    notes: '',
  }
}

export default function AdminRecordings() {
  const { profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState('curriculum')

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title">إدارة التسجيلات</h1>
        <p className="text-muted text-sm mt-1">رفع وإدارة تسجيلات الحصص</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'curriculum', label: 'تسجيلات المنهج', icon: BookOpen },
          { id: 'archive', label: 'الأرشيف', icon: Archive },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 h-11 rounded-xl text-sm font-medium transition-all font-['Tajawal'] ${
              activeTab === tab.id
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'curriculum' ? <CurriculumSection /> : <ArchiveSection />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Curriculum Section — Upload + Requests + List
// ═══════════════════════════════════════════════════════
function CurriculumSection() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdmin = profile?.role === 'admin'
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(getEmptyCurriculumForm)
  const [saving, setSaving] = useState(false)
  const [filterGroup, setFilterGroup] = useState('')
  const [chapterRecId, setChapterRecId] = useState(null)

  // Groups (trainer sees own, admin sees all)
  const { data: groups = [] } = useQuery({
    queryKey: ['rec-groups', profile?.role],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code, level').eq('is_active', true)
      // Trainer filtering handled by RLS
      const { data, error } = await query.order('name')
      if (error) throw error
      return data || []
    },
    staleTime: 60_000,
  })

  // Units for selected group's level
  const selectedGroup = groups.find(g => g.id === form.group_id)
  const { data: units = [] } = useQuery({
    queryKey: ['rec-units', selectedGroup?.level],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('id, unit_number, title_ar, title_en')
        .eq('level', selectedGroup.level)
        .eq('is_active', true)
        .order('unit_number')
      if (error) throw error
      return data || []
    },
    enabled: !!selectedGroup?.level,
  })

  // All curriculum recordings
  const { data: recordings = [], isLoading: loadingRecs } = useQuery({
    queryKey: ['admin-curriculum-recordings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_recordings')
        .select('*, unit:curriculum_units(unit_number, title_ar, title_en), group:groups(name, code)')
        .eq('is_archive', false)
        .not('unit_id', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })

  // Pending requests
  const { data: requests = [] } = useQuery({
    queryKey: ['recording-requests-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recording_requests')
        .select('*, student:profiles!student_id(full_name), unit:curriculum_units(unit_number, title_ar), group:groups(name, code)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })

  const filteredRecs = filterGroup
    ? recordings.filter(r => r.group_id === filterGroup)
    : recordings

  const handleSave = async () => {
    if (!form.google_drive_url.trim() || !form.group_id || !form.unit_id || saving) return
    setSaving(true)

    const fileId = extractGoogleDriveFileId(form.google_drive_url.trim())
    const { error } = await supabase.from('class_recordings').upsert({
      group_id: form.group_id,
      unit_id: form.unit_id,
      part: form.part,
      google_drive_url: form.google_drive_url.trim(),
      google_drive_file_id: fileId || '',
      recorded_date: form.recorded_date || null,
      notes: form.notes.trim() || null,
      uploaded_by: profile?.id,
      is_archive: false,
    }, {
      onConflict: 'group_id,unit_id,part',
      ignoreDuplicates: false,
    })

    if (error) {
      console.error('[CurriculumUpload] Save error:', error)
      toast({ type: 'error', title: 'حدث خطأ أثناء الحفظ' })
    } else {
      toast({ type: 'success', title: 'تم حفظ التسجيل' })

      // Auto-fulfill matching requests
      await supabase
        .from('recording_requests')
        .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() })
        .eq('group_id', form.group_id)
        .eq('unit_id', form.unit_id)
        .eq('part', form.part)
        .eq('status', 'pending')

      // Notify students in this group
      try {
        const { data: students } = await supabase
          .from('students')
          .select('id')
          .eq('group_id', form.group_id)
          .eq('status', 'active')
          .is('deleted_at', null)

        const unitInfo = units.find(u => u.id === form.unit_id)
        if (students?.length > 0) {
          const notifications = students.map(s => ({
            user_id: s.id,
            type: 'system',
            title: 'تسجيل جديد 🎥',
            body: `تم رفع تسجيل الوحدة ${unitInfo?.unit_number || ''} Part ${form.part.toUpperCase()}`,
            data: { unit_id: form.unit_id, part: form.part },
            read: false,
          }))
          await supabase.from('notifications').insert(notifications)
        }
      } catch {}

      queryClient.invalidateQueries({ queryKey: ['admin-curriculum-recordings'] })
      queryClient.invalidateQueries({ queryKey: ['recording-requests-pending'] })
      setForm(prev => ({ ...getEmptyCurriculumForm(), group_id: prev.group_id }))
      setShowForm(false)
    }
    setSaving(false)
  }

  const handleDeleteRec = async (id) => {
    if (!confirm('هل أنت متأكد من حذف هذا التسجيل؟')) return
    await supabase.from('class_recordings').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['admin-curriculum-recordings'] })
    toast({ type: 'success', title: 'تم حذف التسجيل' })
  }

  const handleDismissRequest = async (reqId) => {
    await supabase.from('recording_requests').update({ status: 'dismissed' }).eq('id', reqId)
    queryClient.invalidateQueries({ queryKey: ['recording-requests-pending'] })
    toast({ type: 'success', title: 'تم تجاهل الطلب' })
  }

  const handleFillFromRequest = (req) => {
    setForm({
      group_id: req.group_id,
      unit_id: req.unit_id,
      part: req.part,
      google_drive_url: '',
      recorded_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setShowForm(true)
  }

  // Manual thumbnail upload
  const thumbnailInputRef = useRef(null)
  const [thumbnailRecId, setThumbnailRecId] = useState(null)
  const [uploadingThumb, setUploadingThumb] = useState(false)

  const handleThumbnailClick = (recId) => {
    setThumbnailRecId(recId)
    thumbnailInputRef.current?.click()
  }

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !thumbnailRecId) return
    e.target.value = ''
    setUploadingThumb(true)

    try {
      const reader = new FileReader()
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-recording-thumbnail`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ recording_id: thumbnailRecId, image_base64: base64 }),
        }
      )
      const result = await res.json()
      if (result.url || result.skipped) {
        // Force overwrite if already exists
        if (result.skipped) {
          // Upload directly via storage + update DB
          const bytes = Uint8Array.from(atob(base64.replace(/^data:image\/\w+;base64,/, '')), c => c.charCodeAt(0))
          await supabase.storage.from('recording-thumbnails').upload(`${thumbnailRecId}.jpg`, bytes, { contentType: 'image/jpeg', upsert: true })
          const { data: urlData } = supabase.storage.from('recording-thumbnails').getPublicUrl(`${thumbnailRecId}.jpg`)
          await supabase.from('class_recordings').update({ thumbnail_url: urlData.publicUrl + '?t=' + Date.now() }).eq('id', thumbnailRecId)
        }
        toast({ type: 'success', title: 'تم تحديث الصورة المصغرة' })
        queryClient.invalidateQueries({ queryKey: ['admin-curriculum-recordings'] })
      } else {
        toast({ type: 'error', title: result.error || 'فشل رفع الصورة' })
      }
    } catch (err) {
      console.error('[Thumbnail] Upload error:', err)
      toast({ type: 'error', title: 'حدث خطأ أثناء رفع الصورة' })
    } finally {
      setUploadingThumb(false)
      setThumbnailRecId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      {requests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-amber-400 font-['Tajawal'] flex items-center gap-2">
            <MessageSquare size={14} />
            طلبات التسجيل ({requests.length})
          </h3>
          {requests.map(req => (
            <div
              key={req.id}
              className="fl-card-static p-4 flex items-center justify-between gap-3"
              style={{ borderColor: 'rgba(245,158,11,0.15)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-primary)] font-['Tajawal']">
                  {req.student?.full_name} تطلب تسجيل الوحدة {req.unit?.unit_number} Part {req.part?.toUpperCase()}
                </p>
                <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
                  {req.group?.code} — {new Date(req.created_at).toLocaleDateString('ar-SA')}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleFillFromRequest(req)}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 text-xs font-bold font-['Tajawal'] border border-sky-500/20 hover:bg-sky-500/20 transition-colors"
                >
                  رفع التسجيل
                </button>
                <button
                  onClick={() => handleDismissRequest(req.id)}
                  className="px-3 py-1.5 rounded-lg text-[var(--text-muted)] text-xs font-['Tajawal'] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  تجاهل
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Toggle */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="btn-primary text-sm px-5 flex items-center gap-2"
      >
        <Plus size={16} />
        إضافة تسجيل منهج
      </button>

      {/* Upload Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="fl-card-static p-6 space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">إضافة تسجيل جديد</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Group */}
                <div>
                  <label className="text-xs text-muted mb-1 block font-['Tajawal']">المجموعة *</label>
                  <select
                    className="input-field text-sm w-full"
                    value={form.group_id}
                    onChange={e => setForm(f => ({ ...f, group_id: e.target.value, unit_id: '' }))}
                  >
                    <option value="">اختر المجموعة</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name} (مستوى {g.level})</option>)}
                  </select>
                </div>

                {/* Unit */}
                <div>
                  <label className="text-xs text-muted mb-1 block font-['Tajawal']">الوحدة *</label>
                  <select
                    className="input-field text-sm w-full"
                    value={form.unit_id}
                    onChange={e => setForm(f => ({ ...f, unit_id: e.target.value }))}
                    disabled={!form.group_id}
                  >
                    <option value="">اختر الوحدة</option>
                    {units.map(u => <option key={u.id} value={u.id}>الوحدة {u.unit_number}: {u.title_ar || u.title_en}</option>)}
                  </select>
                </div>

                {/* Part */}
                <div>
                  <label className="text-xs text-muted mb-1 block font-['Tajawal']">الجزء *</label>
                  <div className="flex gap-2 mt-1">
                    {['a', 'b'].map(p => (
                      <button
                        key={p}
                        onClick={() => setForm(f => ({ ...f, part: p }))}
                        className={`flex-1 h-10 rounded-xl text-sm font-bold font-['Inter'] transition-all ${
                          form.part === p
                            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                            : 'bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        Part {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* URL */}
                <div>
                  <label className="text-xs text-muted mb-1 block font-['Tajawal']">رابط التسجيل *</label>
                  <input
                    className="input-field text-sm w-full"
                    value={form.google_drive_url}
                    onChange={e => setForm(f => ({ ...f, google_drive_url: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    dir="ltr"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="text-xs text-muted mb-1 block font-['Tajawal']">تاريخ الحصة</label>
                  <input
                    type="date"
                    className="input-field text-sm w-full"
                    value={form.recorded_date}
                    onChange={e => setForm(f => ({ ...f, recorded_date: e.target.value }))}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-muted mb-1 block font-['Tajawal']">ملاحظات (اختياري)</label>
                <input
                  className="input-field text-sm w-full"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="ملاحظات إضافية..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={!form.group_id || !form.unit_id || !form.google_drive_url.trim() || saving}
                  className="btn-primary text-sm px-6 flex items-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  حفظ التسجيل
                </button>
                <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">إلغاء</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter + List */}
      <div className="flex items-center gap-3">
        <select
          className="input-field text-sm"
          value={filterGroup}
          onChange={e => setFilterGroup(e.target.value)}
        >
          <option value="">كل المجموعات</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.code} — {g.name}</option>)}
        </select>
        <span className="text-xs text-muted font-['Tajawal']">{filteredRecs.length} تسجيل</span>
      </div>

      {loadingRecs ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>
      ) : filteredRecs.length > 0 ? (
        <div className="space-y-2">
          {filteredRecs.map(rec => (
            <div key={rec.id} className="fl-card-static p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] font-['Tajawal'] truncate">
                    الوحدة {rec.unit?.unit_number}: {rec.unit?.title_ar || rec.unit?.title_en} — Part {rec.part?.toUpperCase()}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted font-['Tajawal']">
                    <span>{rec.group?.code || ''}</span>
                    {rec.recorded_date && <span>{new Date(rec.recorded_date).toLocaleDateString('ar-SA')}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setChapterRecId(rec.id)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold font-['Tajawal'] text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition shrink-0"
                  title="إدارة الفصول"
                >
                  <BookOpen size={12} className="inline ml-1" />
                  فصول
                </button>
                <button
                  onClick={() => handleThumbnailClick(rec.id)}
                  disabled={uploadingThumb && thumbnailRecId === rec.id}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold font-['Tajawal'] text-purple-400 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition shrink-0"
                  title="رفع صورة مصغرة"
                >
                  {uploadingThumb && thumbnailRecId === rec.id
                    ? <Loader2 size={12} className="inline ml-1 animate-spin" />
                    : <ImagePlus size={12} className="inline ml-1" />}
                  صورة
                </button>
                <button onClick={() => handleDeleteRec(rec.id)} className="btn-icon shrink-0" title="حذف">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
              <VideoPlayer
                url={rec.google_drive_url}
                part={`Part ${rec.part?.toUpperCase()}`}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="fl-card-static p-10 text-center">
          <Video size={32} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm font-['Tajawal']">لا توجد تسجيلات منهج</p>
        </div>
      )}

      {/* Hidden thumbnail file input */}
      <input
        ref={thumbnailInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleThumbnailUpload}
      />

      {/* Chapter Manager Modal */}
      <AnimatePresence>
        {chapterRecId && (
          <ChapterManager
            recordingId={chapterRecId}
            onClose={() => setChapterRecId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Archive Section — Old recordings system
// ═══════════════════════════════════════════════════════
function ArchiveSection() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(getEmptyForm)
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(null)

  const { data: recordings, isLoading } = useQuery({
    queryKey: ['admin-archive-recordings'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_recordings')
        .select('*, uploader:uploaded_by(full_name)')
        .is('deleted_at', null)
        .or('is_archive.eq.true,unit_id.is.null')
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
        is_archive: true,
      }).select().single()
      if (error) throw error

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
      } catch {}

      return { recording, notifiedCount }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-archive-recordings'] })
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-archive-recordings'] }),
  })

  const deleteRecording = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('class_recordings').update({ deleted_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-archive-recordings'] }),
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">الأرشيف ({recordings?.length || 0} تسجيل)</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm px-4 flex items-center gap-2">
          <Plus size={16} />
          إضافة تسجيل أرشيف
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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="fl-card-static p-4 border-emerald-500/20 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-400 font-medium">{saveSuccess}</p>
        </motion.div>
      )}

      {/* Recordings List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}</div>
      ) : recordings?.length > 0 ? (
        <div className="space-y-3">
          {recordings.map((rec) => (
            <div key={rec.id} className="fl-card-static p-5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{rec.title || 'تسجيل'}</p>
                  <span className="badge-blue text-xs shrink-0">{typeLabels[rec.class_type] || rec.class_type}</span>
                  <span className="badge-muted text-xs shrink-0">مستوى {rec.level}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  {rec.recorded_date && <span>{new Date(rec.recorded_date).toLocaleDateString('ar-SA')}</span>}
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
          <p className="text-muted">لا توجد تسجيلات أرشيفية</p>
        </div>
      )}
    </div>
  )
}
