import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, ChevronLeft } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/authStore'
import { toast } from '../../ui/FluentiaToast'
import { emitXP } from '../../ui/XPFloater'
import ReviewSessionStats from './ReviewSessionStats'
import { useBodyLock } from '../../../hooks/useBodyLock'

const GRADES = [
  { quality: 1, label: 'ما أعرفها', emoji: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
  { quality: 3, label: 'صعبة', emoji: '🤔', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  { quality: 4, label: 'أعرفها', emoji: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' },
  { quality: 5, label: 'سهلة جداً', emoji: '⚡', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)' },
]

export default function ReviewOverlay({ isOpen, onClose, words: initialWords }) {
  const { profile } = useAuthStore()
  const [words, setWords] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [grading, setGrading] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0, xpEarned: 0, mastered: 0 })
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (isOpen && initialWords?.length) {
      setWords([...initialWords])
      setCurrentIndex(0)
      setRevealed(false)
      setSessionDone(false)
      setSessionStats({ reviewed: 0, correct: 0, xpEarned: 0, mastered: 0 })
    }
  }, [isOpen, initialWords])

  const currentWord = words[currentIndex]

  const playAudio = useCallback(() => {
    const url = currentWord?.audio_url
    if (!url) return
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(url)
    audioRef.current.onplay = () => setPlaying(true)
    audioRef.current.onended = () => setPlaying(false)
    audioRef.current.onerror = () => setPlaying(false)
    audioRef.current.play().catch(() => setPlaying(false))
  }, [currentWord])

  const handleGrade = useCallback(async (quality) => {
    if (grading || !currentWord) return
    setGrading(true)

    try {
      const { data, error } = await supabase.rpc('srs_review_word', {
        p_word_id: currentWord.id,
        p_quality: quality,
      })

      if (error) {
        console.error('SRS review error:', error)
        toast({ type: 'error', title: 'خطأ في حفظ المراجعة' })
        setGrading(false)
        return
      }

      const isCorrect = quality >= 3
      const isMastered = data?.mastered === true
      const xp = isMastered ? 15 : isCorrect ? 3 : 1

      if (xp > 0) emitXP(xp)

      setSessionStats(prev => ({
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        xpEarned: prev.xpEarned + xp,
        mastered: prev.mastered + (isMastered ? 1 : 0),
      }))

      // Next card or finish
      if (currentIndex < words.length - 1) {
        setTimeout(() => {
          setCurrentIndex(i => i + 1)
          setRevealed(false)
          setGrading(false)
        }, 300)
      } else {
        setTimeout(() => {
          setSessionDone(true)
          setGrading(false)
        }, 300)
      }
    } catch (err) {
      console.error('SRS error:', err)
      setGrading(false)
    }
  }, [currentWord, currentIndex, words.length, grading])

  // Close on escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Lock body scroll + hide mobile nav while open
  useBodyLock(isOpen)

  if (!isOpen) return null

  if (sessionDone) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(12px)' }}>
        <ReviewSessionStats stats={sessionStats} onClose={onClose} />
      </div>
    )
  }

  if (!currentWord) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center" style={{ background: 'rgba(2,6,23,0.95)' }}>
        <div className="text-center space-y-4">
          <p className="text-4xl">✨</p>
          <p className="text-white/60 text-sm font-['Tajawal']">كل شي تحت السيطرة — ما في كلمات للمراجعة</p>
          <button onClick={onClose} className="px-6 py-2 rounded-xl text-sm font-bold text-sky-400 bg-sky-500/10 border border-sky-500/25 font-['Tajawal']">
            رجوع
          </button>
        </div>
      </div>
    )
  }

  const wordText = currentWord.word
  const meaningAr = currentWord.definition_ar || currentWord.meaning || ''
  const exampleEn = currentWord.example_sentence || currentWord.context_sentence || ''

  return (
    <div className="fixed inset-0 z-[80]" style={{ background: 'rgba(2,6,23,0.97)', backdropFilter: 'blur(12px)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 safe-area-top">
        <button onClick={onClose} className="flex items-center gap-1 text-white/40 hover:text-white/60 text-sm font-['Tajawal']">
          <ChevronLeft size={16} />
          إنهاء
        </button>
        <span className="text-white/30 text-xs font-['Inter'] font-bold">
          {currentIndex + 1} / {words.length}
        </span>
        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white/50 bg-white/5">
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-4 mb-6">
        <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #38bdf8, #818cf8)' }}
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + (revealed ? 0.5 : 0)) / words.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Card area */}
      <div className="flex flex-col items-center justify-center px-6" style={{ height: 'calc(100dvh - 180px)' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWord.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-sm"
          >
            {/* Word */}
            <div className="text-center space-y-4 mb-8">
              <h1 className="text-3xl sm:text-4xl font-black text-white font-['Inter']" dir="ltr">
                {wordText}
              </h1>

              {/* Audio */}
              {currentWord.audio_url && (
                <button
                  onClick={playAudio}
                  className="mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-all"
                  style={{ background: playing ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {playing ? (
                    <div className="flex items-end gap-[2px] h-4">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} className="w-[2px] bg-sky-400 rounded-full" animate={{ height: ['5px', '16px', '5px'] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} />
                      ))}
                    </div>
                  ) : (
                    <Volume2 size={20} className="text-white/50" />
                  )}
                </button>
              )}

              {currentWord.review_count > 0 && (
                <p className="text-[10px] text-white/15 font-['Tajawal']">
                  راجعتها {currentWord.review_count} مرة
                </p>
              )}
            </div>

            {/* Reveal area */}
            {!revealed ? (
              <motion.button
                onClick={() => setRevealed(true)}
                className="w-full py-4 rounded-2xl text-center text-sm font-bold text-white/50 font-['Tajawal'] transition-all hover:bg-white/[0.04]"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
                whileTap={{ scale: 0.98 }}
              >
                اضغط للكشف 👆
              </motion.button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-5 space-y-3 text-center"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-xl font-bold text-amber-400 font-['Tajawal']">{meaningAr}</p>
                {exampleEn && (
                  <p className="text-xs text-white/30 font-['Inter'] italic leading-relaxed" dir="ltr">
                    "{exampleEn}"
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Grade buttons — shown only after reveal */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-0 left-0 right-0 px-4 pt-4"
            style={{ paddingBottom: 'calc(24px + var(--sab))' }}
            style={{ background: 'linear-gradient(transparent, rgba(2,6,23,0.95) 20%)' }}
          >
            <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
              {GRADES.map(g => (
                <motion.button
                  key={g.quality}
                  onClick={() => handleGrade(g.quality)}
                  disabled={grading}
                  whileTap={{ scale: 0.93 }}
                  className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl text-center transition-all disabled:opacity-40 font-['Tajawal']"
                  style={{ background: g.bg, border: `1px solid ${g.border}` }}
                >
                  <span className="text-lg">{g.emoji}</span>
                  <span className="text-[10px] font-bold" style={{ color: g.color }}>{g.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
