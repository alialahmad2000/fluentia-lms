import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { PlayCircle, X, Clock, Eye, FileText, Video, ExternalLink, BookOpen, Archive } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import EmptyState from '../../components/ui/EmptyState'
import VideoPlayer from '../../components/VideoPlayer'

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

const CLASS_TYPES = {
  all: { label: 'الكل', icon: '', color: '' },
  reading: { label: 'قراءة', icon: '📖', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  grammar: { label: 'قواعد', icon: '📚', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  speaking: { label: 'محادثة', icon: '🎤', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  listening: { label: 'استماع', icon: '🎧', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  writing: { label: 'كتابة', icon: '✍️', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  general: { label: 'عام', icon: '📋', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  ielts: { label: 'IELTS', icon: '🎯', color: 'text-gold-400 bg-gold-500/10 border-gold-500/20' },
}

function getClassNumber(recordings, rec) {
  const sameType = recordings.filter(
    (r) => r.class_type === rec.class_type && r.recorded_date <= rec.recorded_date
  )
  sameType.sort((a, b) => a.recorded_date.localeCompare(b.recorded_date))
  return sameType.findIndex((r) => r.id === rec.id) + 1
}

export default function StudentRecordings() {
  const [activeTab, setActiveTab] = useState('curriculum')

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title">التسجيلات</h1>
        <p className="text-muted text-sm mt-1">تسجيلات حصصك السابقة</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('curriculum')}
          className={`flex items-center gap-1.5 px-4 h-11 rounded-xl text-sm font-medium transition-all font-['Tajawal'] ${
            activeTab === 'curriculum'
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
          }`}
        >
          <BookOpen size={15} />
          تسجيلات المنهج
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`flex items-center gap-1.5 px-4 h-11 rounded-xl text-sm font-medium transition-all font-['Tajawal'] ${
            activeTab === 'archive'
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)]'
          }`}
        >
          <Archive size={15} />
          الأرشيف
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'curriculum' ? <CurriculumRecordings /> : <ArchiveRecordings />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Curriculum Recordings (grouped by unit) ─────────
function CurriculumRecordings() {
  const { studentData } = useAuthStore()
  const groupId = studentData?.group_id

  const { data: recordings = [], isLoading } = useQuery({
    queryKey: ['student-curriculum-recordings', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_recordings')
        .select('*, unit:curriculum_units(id, unit_number, title_ar, title_en, level)')
        .eq('group_id', groupId)
        .eq('is_archive', false)
        .is('deleted_at', null)
        .not('unit_id', 'is', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!groupId,
    staleTime: 0,
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map(i => <div key={i} className="h-32 rounded-2xl bg-[var(--surface-raised)] animate-pulse" />)}
      </div>
    )
  }

  if (!recordings.length) {
    return (
      <EmptyState
        icon={Video}
        title="لا توجد تسجيلات بعد"
        description="سيتم إضافة تسجيلات المنهج هنا بعد كل حصة"
      />
    )
  }

  // Group by unit
  const unitMap = {}
  for (const rec of recordings) {
    const uid = rec.unit_id
    if (!unitMap[uid]) unitMap[uid] = { unit: rec.unit, recordings: [] }
    unitMap[uid].recordings.push(rec)
  }

  // Sort units by unit_number descending
  const units = Object.values(unitMap).sort((a, b) => (b.unit?.unit_number || 0) - (a.unit?.unit_number || 0))

  return (
    <div className="space-y-4">
      {units.map(({ unit, recordings: recs }) => (
        <div
          key={unit?.id || recs[0]?.unit_id}
          className="rounded-2xl p-5 space-y-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center flex-shrink-0">
              <BookOpen size={18} className="text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
                الوحدة {unit?.unit_number}: {unit?.title_ar || unit?.title_en}
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">المستوى {unit?.level}</p>
            </div>
          </div>

          <div className="space-y-2 pr-3">
            {['a', 'b'].map(partId => {
              const rec = recs.find(r => r.part === partId)
              if (rec) {
                return (
                  <div key={partId} className="py-2">
                    <VideoPlayer
                      url={rec.google_drive_url}
                      title={`Part ${partId.toUpperCase()}`}
                      date={rec.recorded_date ? new Date(rec.recorded_date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' }) : null}
                      part={`Part ${partId.toUpperCase()}`}
                    />
                  </div>
                )
              }
              return (
                <div key={partId} className="flex items-center gap-2 py-2">
                  <Video size={14} className="text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-muted)] font-['Tajawal']">
                    Part {partId.toUpperCase()} — لم يُرفع بعد
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Archive Recordings (old system) ─────────────────
function ArchiveRecordings() {
  const [filter, setFilter] = useState('all')
  const [viewing, setViewing] = useState(null)

  const { data: recordings, isLoading } = useQuery({
    queryKey: ['student-archive-recordings', filter],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase
        .from('class_recordings')
        .select('*')
        .eq('is_visible', true)
        .is('deleted_at', null)
        .or('is_archive.eq.true,unit_id.is.null')
        .order('recorded_date', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('class_type', filter)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })

  const incrementView = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc('increment_view_count', { recording_id: id })
      if (error) {
        await supabase
          .from('class_recordings')
          .update({ view_count: (viewing?.view_count || 0) + 1 })
          .eq('id', id)
      }
    },
  })

  function handleWatch(recording) {
    setViewing(recording)
    incrementView.mutate(recording.id)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-[var(--surface-raised)] animate-pulse" />)}
      </div>
    )
  }

  const allForNumbers = recordings || []

  return (
    <>
      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        {Object.entries(CLASS_TYPES).map(([key, type]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === key
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                : 'text-muted hover:text-[var(--text-primary)] border border-transparent'
            }`}
          >
            {type.icon && <span className="me-1">{type.icon}</span>}
            {type.label}
          </button>
        ))}
      </div>

      {recordings?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recordings.map((rec, i) => {
            const typeInfo = CLASS_TYPES[rec.class_type] || CLASS_TYPES.general
            const date = rec.recorded_date ? new Date(rec.recorded_date) : null
            const dayName = date ? ARABIC_DAYS[date.getDay()] : ''
            const formattedDate = date
              ? date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })
              : ''
            const classNum = getClassNumber(allForNumbers, rec)

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="fl-card p-6 hover:translate-y-[-2px] transition-all duration-200 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[13px] px-3 py-1 rounded-full border font-medium ${typeInfo.color}`}>
                    {typeInfo.icon && <span className="me-1">{typeInfo.icon}</span>}
                    {typeInfo.label}
                  </span>
                  <span className="text-[13px] text-muted font-medium">
                    الحصة #{classNum}
                  </span>
                </div>

                <h3 className="text-[15px] font-bold mb-2 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {rec.title || 'تسجيل حصة'}
                </h3>

                {date && (
                  <p className="text-sm text-muted mb-3">
                    {dayName} — {formattedDate}
                  </p>
                )}

                {rec.description && (
                  <p className="text-[13px] text-muted mb-3 line-clamp-2 flex items-start gap-1.5">
                    <FileText size={13} className="shrink-0 mt-0.5" />
                    <span>{rec.description}</span>
                  </p>
                )}

                <div className="flex items-center gap-4 text-[13px] text-muted mb-5 mt-auto">
                  {rec.duration_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {rec.duration_minutes} دقيقة
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Eye size={13} />
                    {rec.view_count || 0} مشاهدة
                  </span>
                </div>

                <button
                  onClick={() => handleWatch(rec)}
                  className="btn-primary w-full text-sm py-3 flex items-center justify-center gap-2 rounded-xl"
                >
                  <PlayCircle size={18} />
                  شاهدي التسجيل
                </button>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Video}
          title="لا يوجد أرشيف"
          description="لا توجد تسجيلات أرشيفية حالياً"
        />
      )}

      {/* Video Modal */}
      <AnimatePresence>
        {viewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'var(--modal-backdrop)', backdropFilter: 'blur(8px)' }}
            onClick={() => setViewing(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{viewing.title || 'تسجيل حصة'}</h3>
                  {viewing.recorded_date && (
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                      {ARABIC_DAYS[new Date(viewing.recorded_date).getDay()]} — {new Date(viewing.recorded_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setViewing(null)}
                  className="w-11 h-11 rounded-full bg-[var(--surface-raised)] flex items-center justify-center text-white hover:bg-[var(--sidebar-hover-bg)] transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="relative w-full rounded-2xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src={`https://drive.google.com/file/d/${viewing.google_drive_file_id}/preview`}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
