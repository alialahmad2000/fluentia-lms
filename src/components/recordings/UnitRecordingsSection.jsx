import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, X, CheckCircle2 } from 'lucide-react'
import { useUnitRecordings } from '../../hooks/useUnitRecordings'
import { useRecordingProgress } from '../../hooks/useRecordingProgress'
import { useAuthStore } from '../../stores/authStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import PremiumVideoPlayer from './PremiumVideoPlayer'

// ─── Main Section ────────────────────────────────────────
export default function UnitRecordingsSection({ unitId }) {
  const { data: recordings = [], isLoading } = useUnitRecordings(unitId)
  const { studentData } = useAuthStore()
  const [activeRecording, setActiveRecording] = useState(null)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="h-48 rounded-2xl bg-[var(--surface-raised)] animate-pulse" />
        ))}
      </div>
    )
  }

  // Filter to only visible recordings (non-deleted, non-archive)
  const visible = recordings.filter(r => !r.deleted_at && !r.is_archive)

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center">
          <Video size={28} className="text-[var(--text-muted)]" />
        </div>
        <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">
          لا توجد تسجيلات لهذه الوحدة بعد
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((rec, i) => (
          <RecordingCard
            key={rec.id}
            recording={rec}
            studentId={studentData?.id}
            index={i}
            onPlay={() => setActiveRecording(rec)}
          />
        ))}
      </div>

      {/* Player Modal */}
      <AnimatePresence>
        {activeRecording && (
          <PlayerModal
            recording={activeRecording}
            onClose={() => setActiveRecording(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Recording Card ─────────────────────────────────────
function RecordingCard({ recording, studentId, index, onPlay }) {
  const { data: progress } = useQuery({
    queryKey: ['recording-progress', studentId, recording.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('recording_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('recording_id', recording.id)
        .maybeSingle()
      return data
    },
    enabled: !!studentId && !!recording.id,
    staleTime: 30_000,
  })

  const watchedPercent = progress?.watched_percent || 0
  const isCompleted = !!progress?.completed_at
  const formattedDate = recording.recorded_date
    ? new Date(recording.recorded_date).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : null

  const partLabel = recording.part === 'a' ? 'الجزء A' : recording.part === 'b' ? 'الجزء B' : ''
  const title = recording.title || `تسجيل ${partLabel}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onPlay}
      className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all hover:ring-1 hover:ring-sky-500/30 hover:shadow-lg"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Thumbnail gradient */}
      <div className="relative h-32 bg-gradient-to-br from-sky-900/40 via-indigo-900/30 to-purple-900/20 flex items-center justify-center">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-14 h-14 rounded-full bg-sky-400/90 flex items-center justify-center shadow-xl group-hover:bg-sky-400 transition"
        >
          <Video size={24} className="text-white" />
        </motion.div>

        {/* Duration badge */}
        {recording.duration_seconds && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white/90 text-[11px] font-['Inter'] tabular-nums">
            {formatDuration(recording.duration_seconds)}
          </span>
        )}

        {/* Watched ring (top-right in LTR = top-left in RTL container) */}
        {watchedPercent > 0 && (
          <div className="absolute top-2 left-2">
            <WatchedRing percent={watchedPercent} size={32} />
          </div>
        )}

        {/* Completed badge */}
        {isCompleted && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-400/90 text-white text-[10px] font-bold font-['Tajawal']">
            <CheckCircle2 size={10} />
            مكتمل
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <h4 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] truncate">
          {title}
        </h4>
        {formattedDate && (
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{formattedDate}</p>
        )}
        {recording.notes && (
          <p className="text-xs text-[var(--text-muted)] font-['Tajawal'] line-clamp-1">{recording.notes}</p>
        )}
      </div>

      {/* Bottom progress bar */}
      {watchedPercent > 0 && !isCompleted && (
        <div className="h-1 w-full bg-white/5">
          <div className="h-full bg-sky-400/60 transition-all" style={{ width: `${watchedPercent}%` }} />
        </div>
      )}
    </motion.div>
  )
}

// ─── Player Modal ───────────────────────────────────────
function PlayerModal({ recording, onClose }) {
  const { progress, save, forceSave } = useRecordingProgress(recording.id)
  const queryClient = useQueryClient()

  const partLabel = recording.part === 'a' ? 'الجزء A' : recording.part === 'b' ? 'الجزء B' : ''
  const title = recording.title || `تسجيل ${partLabel}`

  const handleProgress = useCallback((data) => {
    save(data)
  }, [save])

  const handleComplete = useCallback(() => {
    forceSave({
      position: 0,
      percent: 100,
      speed: 1,
      completed: true,
    })
    // Invalidate to refresh cards
    queryClient.invalidateQueries({ queryKey: ['recording-progress'] })
  }, [forceSave, queryClient])

  const handleClose = useCallback(() => {
    // Invalidate progress queries to refresh cards
    queryClient.invalidateQueries({ queryKey: ['recording-progress'] })
    onClose()
  }, [onClose, queryClient])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-5xl z-10"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Close button (top-left in RTL) */}
        <button
          onClick={handleClose}
          className="absolute -top-12 left-0 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition z-20"
          aria-label="إغلاق"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h3 className="text-lg font-bold text-white font-['Tajawal'] mb-3 pr-1">
          {title}
          {recording.recorded_date && (
            <span className="text-sm text-white/40 font-normal mr-2">
              {new Date(recording.recorded_date).toLocaleDateString('ar-SA', {
                day: 'numeric', month: 'long'
              })}
            </span>
          )}
        </h3>

        {/* Player */}
        <PremiumVideoPlayer
          recording={recording}
          onProgress={handleProgress}
          onComplete={handleComplete}
          initialPosition={progress?.position || 0}
        />
      </motion.div>
    </motion.div>
  )
}

// ─── Watched Ring SVG ────────────────────────────────────
function WatchedRing({ percent, size = 32 }) {
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="rgba(0,0,0,0.5)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke="#38bdf8"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        x={size / 2} y={size / 2}
        textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize="9" fontFamily="Inter"
        transform={`rotate(90, ${size / 2}, ${size / 2})`}
      >
        {Math.round(percent)}%
      </text>
    </svg>
  )
}

// ─── Duration formatter ──────────────────────────────────
function formatDuration(seconds) {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
