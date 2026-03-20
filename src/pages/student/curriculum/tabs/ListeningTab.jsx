import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Headphones, Play, Pause, SkipBack, SkipForward, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

const QUESTION_TYPE_LABELS = {
  main_idea: 'الفكرة الرئيسية',
  detail: 'تفاصيل',
  vocabulary: 'مفردات',
  inference: 'استنتاج',
}

const QUESTION_TYPE_COLORS = {
  main_idea: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  detail: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  vocabulary: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  inference: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

// ─── Main Component ─────────────────────────────────
export default function ListeningTab({ unitId }) {
  const { data: listenings, isLoading } = useQuery({
    queryKey: ['unit-listening', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_listening')
        .select('*')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
  })

  if (isLoading) return <ListeningSkeleton />

  if (!listenings?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Headphones size={40} className="text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] font-['Tajawal']">محتوى الاستماع غير متاح لهذه الوحدة بعد</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {listenings.map((listening) => (
        <ListeningSection key={listening.id} listening={listening} />
      ))}
    </div>
  )
}

// ─── Listening Section ───────────────────────────────
function ListeningSection({ listening }) {
  const [showTranscript, setShowTranscript] = useState(false)

  const exercises = (listening.exercises || []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Inter']" dir="ltr">
          {listening.title_en || 'Listening'}
        </h2>
        {listening.title_ar && (
          <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">{listening.title_ar}</p>
        )}
        {listening.audio_type && (
          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-['Inter']">
            {listening.audio_type}
          </span>
        )}
      </div>

      {/* Audio Player */}
      {listening.audio_url ? (
        <AudioPlayer url={listening.audio_url} duration={listening.audio_duration_seconds} />
      ) : (
        <div
          className="rounded-xl p-5 flex flex-col items-center gap-3"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center">
            <Headphones size={24} className="text-purple-400" />
          </div>
          <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">المقطع الصوتي غير متاح حالياً</p>
          {listening.audio_duration_seconds && (
            <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">
              المدة المتوقعة: {formatTime(listening.audio_duration_seconds)}
            </p>
          )}
        </div>
      )}

      {/* Transcript */}
      {listening.transcript && (
        <div>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-['Tajawal']"
          >
            {showTranscript ? <EyeOff size={15} /> : <Eye size={15} />}
            {showTranscript ? 'إخفاء النص' : 'عرض النص'}
          </button>
          <AnimatePresence>
            {showTranscript && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div
                  className="mt-3 rounded-xl p-5 text-sm text-[var(--text-secondary)] font-['Inter'] leading-[1.85] whitespace-pre-wrap"
                  dir="ltr"
                  style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
                >
                  {listening.transcript}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Exercises */}
      {exercises.length > 0 && (
        <ListeningExercises exercises={exercises} />
      )}
    </div>
  )
}

// ─── Audio Player ────────────────────────────────────
function AudioPlayer({ url, duration: initialDuration }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(initialDuration || 0)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    const audio = new Audio(url)
    audioRef.current = audio

    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration))
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime))
    audio.addEventListener('ended', () => setPlaying(false))

    return () => {
      audio.pause()
      audio.removeAttribute('src')
    }
  }, [url])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {})
    }
    setPlaying(!playing)
  }

  const skip = (seconds) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds))
  }

  const seek = (e) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audioRef.current.currentTime = pct * duration
  }

  const changeSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5]
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length
    const newSpeed = speeds[nextIdx]
    setSpeed(newSpeed)
    if (audioRef.current) audioRef.current.playbackRate = newSpeed
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className="rounded-xl p-5 space-y-4"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-2">
        <Headphones size={16} className="text-purple-400" />
        <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">استمع للمقطع</span>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div
          className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.06)] cursor-pointer relative overflow-hidden"
          onClick={seek}
        >
          <div
            className="h-full rounded-full bg-purple-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-['Inter']">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => skip(-10)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          title="-10 ثواني"
        >
          <SkipBack size={18} />
        </button>
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center hover:bg-purple-500/30 transition-colors"
        >
          {playing ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
        </button>
        <button
          onClick={() => skip(10)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          title="+10 ثواني"
        >
          <SkipForward size={18} />
        </button>
      </div>

      {/* Speed */}
      <div className="flex justify-center">
        <button
          onClick={changeSpeed}
          className="px-3 h-7 rounded-lg text-[11px] font-bold bg-[var(--surface-base)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-purple-400 transition-colors font-['Inter']"
        >
          {speed}x
        </button>
      </div>
    </div>
  )
}

// ─── Listening Exercises ─────────────────────────────
function ListeningExercises({ exercises }) {
  const [answers, setAnswers] = useState({})
  const total = exercises.length
  const answered = Object.keys(answers).length
  const correctCount = Object.values(answers).filter(a => a.correct).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">أسئلة الاستماع</h3>
        {answered > 0 && (
          <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">
            {correctCount}/{answered} صحيحة
          </span>
        )}
      </div>
      <div className="space-y-4">
        {exercises.map((ex, idx) => (
          <ListeningMCQ
            key={idx}
            exercise={ex}
            index={idx}
            answer={answers[idx]}
            onAnswer={(ans) => setAnswers(prev => ({ ...prev, [idx]: ans }))}
          />
        ))}
      </div>
      {answered === total && total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{
            background: correctCount === total ? 'rgba(16,185,129,0.1)' : 'rgba(56,189,248,0.1)',
            border: `1px solid ${correctCount === total ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.2)'}`,
          }}
        >
          <CheckCircle size={20} className={correctCount === total ? 'text-emerald-400' : 'text-sky-400'} />
          <p className="text-sm font-medium font-['Tajawal']" style={{ color: correctCount === total ? '#34d399' : '#38bdf8' }}>
            {correctCount === total ? 'ممتاز! أجبت على جميع الأسئلة بشكل صحيح' : `أجبت على ${correctCount} من ${total} بشكل صحيح`}
          </p>
        </motion.div>
      )}
    </div>
  )
}

// ─── Single MCQ (listening uses correct_answer_index) ─
function ListeningMCQ({ exercise, index, answer, onAnswer }) {
  const handleSelect = (optIdx) => {
    if (answer) return
    const correct = optIdx === exercise.correct_answer_index
    onAnswer({ selected: optIdx, correct })
  }

  const typeBadge = QUESTION_TYPE_LABELS[exercise.question_type] || exercise.question_type
  const typeColor = QUESTION_TYPE_COLORS[exercise.question_type] || QUESTION_TYPE_COLORS.detail

  return (
    <div
      className="rounded-xl p-4 sm:p-5 space-y-3"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 space-y-2">
          {exercise.question_type && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeColor} font-['Tajawal']`}>
              {typeBadge}
            </span>
          )}
          <p className="text-sm sm:text-[15px] font-medium text-[var(--text-primary)] font-['Inter'] leading-relaxed" dir="ltr">
            {exercise.question_en}
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2 mt-1">
        {exercise.options?.map((opt, i) => {
          const isSelected = answer?.selected === i
          const isCorrectAnswer = i === exercise.correct_answer_index
          const showCorrect = answer && isCorrectAnswer
          const showWrong = answer && isSelected && !answer.correct

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={!!answer}
              dir="ltr"
              className={`text-start px-4 py-3 rounded-xl text-sm font-['Inter'] transition-all duration-200 border ${
                showCorrect
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : showWrong
                    ? 'bg-red-500/15 border-red-500/40 text-red-400'
                    : answer
                      ? 'bg-[var(--surface-base)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
                      : 'bg-[var(--surface-base)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-purple-500/40 hover:bg-purple-500/5 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{
                    background: showCorrect ? 'rgba(16,185,129,0.2)' : showWrong ? 'rgba(239,68,68,0.2)' : 'var(--surface-raised)',
                    color: showCorrect ? '#34d399' : showWrong ? '#f87171' : 'var(--text-muted)',
                  }}
                >
                  {showCorrect ? <CheckCircle size={14} /> : showWrong ? <XCircle size={14} /> : String.fromCharCode(65 + i)}
                </span>
                <span>{opt}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {answer && exercise.explanation_ar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="p-3.5 rounded-xl mt-1 text-xs font-['Tajawal']"
              dir="rtl"
              style={{
                background: answer.correct ? 'rgba(16,185,129,0.06)' : 'rgba(56,189,248,0.06)',
                border: `1px solid ${answer.correct ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.15)'}`,
                color: 'var(--text-secondary)',
              }}
            >
              {exercise.explanation_ar}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function formatTime(s) {
  if (!s || isNaN(s)) return '00:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

// ─── Skeleton ────────────────────────────────────────
function ListeningSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-6 w-40 rounded bg-[var(--surface-raised)] animate-pulse" />
      <div className="h-40 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
        ))}
      </div>
    </div>
  )
}
