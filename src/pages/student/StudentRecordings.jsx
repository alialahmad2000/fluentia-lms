import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { PlayCircle, X, Clock, Eye, FileText, Video } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { GridSkeleton } from '../../components/ui/PageSkeleton'
import EmptyState from '../../components/ui/EmptyState'

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
  // Count recordings of the same class_type that are on or before this date
  const sameType = recordings.filter(
    (r) => r.class_type === rec.class_type && r.recorded_date <= rec.recorded_date
  )
  // Sort ascending to get the order
  sameType.sort((a, b) => a.recorded_date.localeCompare(b.recorded_date))
  return sameType.findIndex((r) => r.id === rec.id) + 1
}

export default function StudentRecordings() {
  const [filter, setFilter] = useState('all')
  const [viewing, setViewing] = useState(null)

  const { data: recordings, isLoading } = useQuery({
    queryKey: ['student-recordings', filter],
    staleTime: 30_000,
    queryFn: async () => {
      let query = supabase
        .from('class_recordings')
        .select('*')
        .eq('is_visible', true)
        .is('deleted_at', null)
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
    return <GridSkeleton cols={3} count={6} />
  }

  // Get all recordings (unfiltered) for class number calculation
  const allForNumbers = recordings || []

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title">تسجيلات الحصص</h1>
        <p className="text-muted text-sm mt-1">شاهدي تسجيلات حصصك السابقة</p>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
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

      {/* Recordings Grid */}
      {recordings?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recordings.map((rec, i) => {
            const typeInfo = CLASS_TYPES[rec.class_type] || CLASS_TYPES.general
            const date = new Date(rec.recorded_date)
            const dayName = ARABIC_DAYS[date.getDay()]
            const formattedDate = date.toLocaleDateString('ar-SA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
            const classNum = getClassNumber(allForNumbers, rec)

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="fl-card p-6 hover:translate-y-[-2px] transition-all duration-200 flex flex-col"
              >
                {/* Top row: type badge + class number */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[13px] px-3 py-1 rounded-full border font-medium ${typeInfo.color}`}>
                    {typeInfo.icon && <span className="me-1">{typeInfo.icon}</span>}
                    {typeInfo.label}
                  </span>
                  <span className="text-[13px] text-muted font-medium">
                    الحصة #{classNum}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-[15px] font-bold mb-2 leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {rec.title}
                </h3>

                {/* Day + Date */}
                <p className="text-sm text-muted mb-3">
                  {dayName} — {formattedDate}
                </p>

                {/* Description */}
                {rec.description && (
                  <p className="text-[13px] text-muted mb-3 line-clamp-2 flex items-start gap-1.5">
                    <FileText size={13} className="shrink-0 mt-0.5" />
                    <span>{rec.description}</span>
                  </p>
                )}

                {/* Duration + Views */}
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

                {/* Watch button */}
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
          title="لا توجد تسجيلات حالياً"
          description="سيتم إضافة تسجيلات الحصص هنا بعد كل حصة"
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
                  <h3 className="text-lg font-semibold text-white">{viewing.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                    {ARABIC_DAYS[new Date(viewing.recorded_date).getDay()]} — {new Date(viewing.recorded_date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
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
    </div>
  )
}
