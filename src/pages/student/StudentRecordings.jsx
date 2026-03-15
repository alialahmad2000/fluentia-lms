import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { PlayCircle, X, Clock, Eye, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const CLASS_TYPES = {
  all: { label: 'الكل', color: '' },
  reading: { label: 'قراءة', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  grammar: { label: 'قواعد', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  speaking: { label: 'محادثة', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  listening: { label: 'استماع', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  writing: { label: 'كتابة', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
  general: { label: 'عام', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  ielts: { label: 'IELTS', color: 'text-gold-400 bg-gold-500/10 border-gold-500/20' },
}

function extractGoogleDriveFileId(url) {
  let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (match) return match[1]
  return null
}

export default function StudentRecordings() {
  const [filter, setFilter] = useState('all')
  const [viewing, setViewing] = useState(null)

  const { data: recordings, isLoading } = useQuery({
    queryKey: ['student-recordings', filter],
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

      const { data } = await query
      return data || []
    },
  })

  const incrementView = useMutation({
    mutationFn: async (id) => {
      await supabase.rpc('increment_view_count', { recording_id: id }).catch(() => {
        // Fallback: direct update
        supabase.from('class_recordings').update({ view_count: (viewing?.view_count || 0) + 1 }).eq('id', id)
      })
    },
  })

  function handleWatch(recording) {
    setViewing(recording)
    incrementView.mutate(recording.id)
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted" size={24} /></div>
  }

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
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === key
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                : 'text-muted hover:text-white border border-transparent'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Recordings Grid */}
      {recordings?.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recordings.map((rec, i) => {
            const typeInfo = CLASS_TYPES[rec.class_type] || CLASS_TYPES.general
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-6 hover:translate-y-[-2px] transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted">
                    <Eye size={12} />
                    <span>{rec.view_count || 0}</span>
                  </div>
                </div>

                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{rec.title}</h3>

                <div className="flex items-center gap-3 text-xs text-muted mb-4">
                  <span>{new Date(rec.recorded_date).toLocaleDateString('ar-SA')}</span>
                  {rec.duration_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {rec.duration_minutes} دقيقة
                    </span>
                  )}
                </div>

                {rec.description && (
                  <p className="text-xs text-muted mb-4 line-clamp-2">{rec.description}</p>
                )}

                <button
                  onClick={() => handleWatch(rec)}
                  className="btn-primary w-full text-sm py-2.5 flex items-center justify-center gap-2"
                >
                  <PlayCircle size={16} />
                  شاهدي التسجيل
                </button>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <PlayCircle size={40} className="text-muted mx-auto mb-3" />
          <p className="text-muted">لا توجد تسجيلات حالياً</p>
          <p className="text-xs text-muted mt-1">سيتم إضافة تسجيلات الحصص هنا بعد كل حصة</p>
        </div>
      )}

      {/* Video Modal */}
      <AnimatePresence>
        {viewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
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
                <h3 className="text-lg font-semibold text-white">{viewing.title}</h3>
                <button
                  onClick={() => setViewing(null)}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
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
