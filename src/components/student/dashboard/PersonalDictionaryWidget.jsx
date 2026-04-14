import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Volume2, ChevronLeft } from 'lucide-react'
import AnimatedNumber from '../../ui/AnimatedNumber'
import { Link } from 'react-router-dom'
import { useDictionaryStats } from '../../../hooks/dashboard/useDictionaryStats'
import { usePersonalDictionary } from '../../../hooks/dashboard/usePersonalDictionary'
import { useSRSCounts, useSRSDue } from '../../../hooks/useSRS'
import ReviewOverlay from '../vocabulary/ReviewOverlay'

const MASTERY_CONFIG = {
  new: { label: 'جديد', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.25)', color: 'var(--accent-sky)' },
  learning: { label: 'قيد التعلم', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', color: 'var(--accent-amber)' },
  mastered: { label: 'متقن', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', color: 'var(--accent-emerald)' },
}

function StatMiniCard({ value, label, color, pulse }) {
  const colors = {
    sky: { border: 'rgba(56,189,248,0.25)', text: 'var(--accent-sky)', bg: 'rgba(56,189,248,0.06)' },
    emerald: { border: 'rgba(16,185,129,0.25)', text: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.06)' },
    gold: { border: 'rgba(245,158,11,0.25)', text: 'var(--accent-gold)', bg: 'rgba(245,158,11,0.06)' },
  }
  const c = colors[color]

  return (
    <motion.div
      className="rounded-xl p-3 text-center"
      style={{ background: c.bg, border: `1px solid ${c.border}` }}
      animate={pulse ? { boxShadow: ['0 0 0 0 rgba(16,185,129,0)', '0 0 0 4px rgba(16,185,129,0.15)', '0 0 0 0 rgba(16,185,129,0)'] } : {}}
      transition={pulse ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
    >
      <div className="text-2xl font-black" style={{ color: c.text }}>
        <AnimatedNumber value={value ?? 0} />
      </div>
      <div className="text-[11px] mt-0.5 font-medium" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </div>
    </motion.div>
  )
}

function MasteryChip({ status }) {
  const config = MASTERY_CONFIG[status] || MASTERY_CONFIG.new
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.color }}
    >
      {config.label}
    </span>
  )
}

function AudioButton({ audioUrl, isPlaying, isLoading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!audioUrl}
      className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full transition-all hover:scale-110 active:scale-95"
      style={{
        background: audioUrl ? 'rgba(56,189,248,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${audioUrl ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)'}`,
        color: isPlaying ? 'var(--accent-emerald)' : audioUrl ? 'var(--accent-sky)' : 'var(--text-tertiary)',
        cursor: audioUrl ? 'pointer' : 'default',
        opacity: audioUrl ? 1 : 0.4,
      }}
      title={audioUrl ? 'تشغيل النطق' : 'لا يوجد صوت'}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent-sky)', borderTopColor: 'transparent' }} />
      ) : (
        <Volume2 size={14} />
      )}
    </button>
  )
}

function WordRow({ word, audioState, onPlayAudio }) {
  return (
    <div
      className="flex items-center gap-3 py-2.5 px-2 rounded-lg transition-colors"
      style={{ borderBottom: '1px solid var(--border-default)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <AudioButton
        audioUrl={word.audio_url}
        isPlaying={audioState.playingId === word.saved_word_id && audioState.playing}
        isLoading={audioState.loadingId === word.saved_word_id}
        onClick={() => onPlayAudio(word)}
      />

      <div className="flex-1 min-w-0">
        <span className="text-sm font-bold block truncate" style={{ color: 'var(--text-primary)' }}>
          {word.word_en}
        </span>
        <span className="text-xs block truncate" style={{ color: 'var(--text-secondary)' }}>
          {word.word_ar}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {word.source_label_ar && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)' }}>
            {word.source_label_ar}
          </span>
        )}
        <MasteryChip status={word.mastery_status} />
      </div>
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl p-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="h-7 w-10 mx-auto rounded mb-1.5" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-3 w-14 mx-auto rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        ))}
      </div>
      {/* Row skeletons */}
      <div className="space-y-1">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex items-center gap-3 py-2.5 px-2 animate-pulse">
            <div className="w-7 h-7 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 rounded w-24" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-2.5 rounded w-16" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
            <div className="h-5 w-12 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8 px-4">
      <div className="text-4xl mb-3">📖</div>
      <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        ابدأ ببناء قاموسك الشخصي
      </h3>
      <p className="text-xs mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        حدّد أي كلمة في قطع القراءة وأضفها لقاموسك بضغطة
      </p>
      <Link
        to="/student/curriculum"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.97]"
        style={{
          background: 'linear-gradient(135deg, var(--accent-sky), rgba(56,189,248,0.7))',
          color: '#fff',
          boxShadow: '0 2px 12px rgba(56,189,248,0.25)',
        }}
      >
        <BookOpen size={16} />
        ابدأ القراءة
      </Link>
    </div>
  )
}

export default function PersonalDictionaryWidget({ studentId }) {
  const { data: stats, isLoading: statsLoading } = useDictionaryStats(studentId)
  const { data: words, isLoading: wordsLoading } = usePersonalDictionary(studentId, { limit: 6 })
  const { data: srsCounts } = useSRSCounts(studentId)
  const { data: dueWords, refetch: refetchDue } = useSRSDue(studentId, { enabled: (srsCounts?.due_today ?? 0) > 0 })
  const [reviewOpen, setReviewOpen] = useState(false)

  const audioRef = useRef(null)
  const [audioState, setAudioState] = useState({ playingId: null, loadingId: null, playing: false })

  const isLoading = statsLoading || wordsLoading
  const totalWords = stats?.total_words ?? 0

  const openReview = useCallback(() => {
    refetchDue().then(() => setReviewOpen(true))
  }, [refetchDue])

  const handlePlayAudio = useCallback((word) => {
    if (!word.audio_url) return

    // If same word is playing, pause it
    if (audioState.playingId === word.saved_word_id && audioState.playing) {
      audioRef.current?.pause()
      setAudioState(prev => ({ ...prev, playing: false }))
      return
    }

    // Set loading state
    setAudioState({ playingId: word.saved_word_id, loadingId: word.saved_word_id, playing: false })

    // Create or reuse audio element
    if (!audioRef.current) {
      audioRef.current = new Audio()
    }

    const audio = audioRef.current

    // Clean up previous listeners
    const onCanPlay = () => {
      setAudioState({ playingId: word.saved_word_id, loadingId: null, playing: true })
      audio.play().catch(() => {
        setAudioState({ playingId: null, loadingId: null, playing: false })
      })
    }

    const onEnded = () => {
      setAudioState({ playingId: null, loadingId: null, playing: false })
    }

    const onError = () => {
      setAudioState({ playingId: null, loadingId: null, playing: false })
    }

    audio.removeEventListener('canplaythrough', onCanPlay)
    audio.removeEventListener('ended', onEnded)
    audio.removeEventListener('error', onError)

    audio.addEventListener('canplaythrough', onCanPlay, { once: true })
    audio.addEventListener('ended', onEnded, { once: true })
    audio.addEventListener('error', onError, { once: true })

    audio.pause()
    audio.src = word.audio_url
    audio.load()
  }, [audioState.playingId, audioState.playing])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fl-card-static rounded-2xl p-5 sm:p-6"
      style={{ background: 'var(--glass-card)', border: '1px solid var(--border-default)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={18} style={{ color: 'var(--accent-sky)' }} />
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            قاموسي الشخصي
          </h2>
        </div>
        <Link
          to="/student/my-dictionary"
          className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
          style={{ color: 'var(--accent-sky)' }}
        >
          عرض الكل
          <ChevronLeft size={14} />
        </Link>
      </div>

      {/* Loading */}
      {isLoading && <SkeletonLoader />}

      {/* Empty state */}
      {!isLoading && totalWords === 0 && <EmptyState />}

      {/* Content */}
      {!isLoading && totalWords > 0 && (
        <>
          {/* SRS Review pill */}
          {(srsCounts?.due_today ?? 0) > 0 ? (
            <button
              onClick={openReview}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 mb-4 text-sm font-bold font-['Tajawal'] transition-all hover:scale-[1.01] active:scale-[0.99]"
              style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', color: 'var(--accent-sky)' }}
            >
              🧠 <span>{srsCounts.due_today} كلمة للمراجعة اليوم</span>
            </button>
          ) : srsCounts && totalWords > 0 && (
            <div className="text-center text-xs text-white/25 font-['Tajawal'] mb-3">
              كل شي تحت السيطرة ✨ ولا كلمة تنتظر مراجعتك
            </div>
          )}

          {/* Stat mini-cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatMiniCard value={stats.total_words} label="كلمة كلية" color="sky" />
            <StatMiniCard value={stats.added_this_week} label="هذا الأسبوع" color="emerald" pulse={stats.added_this_week > 0} />
            <StatMiniCard value={stats.mastered_count} label="متقن" color="gold" />
          </div>

          {/* Words list */}
          <div className="space-y-0">
            {words?.map(word => (
              <WordRow
                key={word.saved_word_id}
                word={word}
                audioState={audioState}
                onPlayAudio={handlePlayAudio}
              />
            ))}
          </div>

          {/* Source breakdown footer */}
          <div className="mt-4 pt-3 flex items-center justify-center gap-1 flex-wrap" style={{ borderTop: '1px solid var(--border-default)' }}>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              قراءة {stats.from_reading ?? 0}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>•</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              وحدات {stats.from_units ?? 0}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>•</span>
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              يدوي {stats.from_manual ?? 0}
            </span>
          </div>
        </>
      )}

      <ReviewOverlay
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        words={dueWords ?? []}
      />
    </motion.div>
  )
}
