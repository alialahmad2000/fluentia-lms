import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, CheckCircle, RotateCcw, ArrowRight, Star, Timer, Lightbulb, Zap } from 'lucide-react'

function fisherYatesShuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ITEMS_PER_ROUND = 10

export default function ScrambleGame({
  items,
  title = 'رتّب الحروف',
  itemsPerRound = ITEMS_PER_ROUND,
  onComplete,
  onBack,
}) {
  // === CORE STATE ===
  const [roundItems, setRoundItems] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [scrambledLetters, setScrambledLetters] = useState([])
  const [answerSlots, setAnswerSlots] = useState([])
  const [feedback, setFeedback] = useState(null) // null | 'correct' | 'wrong'
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [totalHints, setTotalHints] = useState(0)
  const [floatingScore, setFloatingScore] = useState(null)
  const [isComplete, setIsComplete] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [roundKey, setRoundKey] = useState(0) // bumped to force new round

  // Refs for timeout cleanup and stable values inside callbacks
  const feedbackTimerRef = useRef(null)
  const audioRef = useRef(null)
  const timerRef = useRef(null)

  // === DERIVED VALUES ===
  const currentItem = roundItems[currentIndex] || null

  const targetWord = useMemo(() => {
    if (!currentItem) return ''
    return (currentItem.word || currentItem.base_form || currentItem.english || '').trim()
  }, [currentItem])

  // === INIT ROUND — runs on mount and when roundKey changes (new round) ===
  useEffect(() => {
    if (!items || items.length === 0) return
    const selected = fisherYatesShuffle(items).slice(0, itemsPerRound)
    setRoundItems(selected)
    setCurrentIndex(0)
    setScore(0)
    setCorrect(0)
    setTotalHints(0)
    setHintsUsed(0)
    setFloatingScore(null)
    setIsComplete(false)
    setFeedback(null)
    setElapsed(0)
    setStartTime(Date.now())
  }, [roundKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Trigger first round on mount
  useEffect(() => {
    if (items && items.length > 0) {
      setRoundKey(k => k + 1)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // === REGENERATE LETTERS when currentIndex or targetWord changes ===
  useEffect(() => {
    if (!targetWord) return

    const letters = targetWord.split('').map((char, i) => ({
      id: `${currentIndex}-${char}-${i}-${Date.now()}`,
      char,
      placed: false,
    }))

    // Shuffle, ensure not identical to original
    let shuffled = fisherYatesShuffle(letters)
    let attempts = 0
    while (
      shuffled.map(l => l.char).join('') === targetWord &&
      attempts < 20
    ) {
      shuffled = fisherYatesShuffle(letters)
      attempts++
    }

    setScrambledLetters(shuffled)
    setAnswerSlots(new Array(targetWord.length).fill(null))
    setFeedback(null)
    setHintsUsed(0)
  }, [currentIndex, targetWord])

  // === CHECK ANSWER when all slots filled ===
  useEffect(() => {
    // Only check when: no feedback showing, slots exist, all filled
    if (feedback) return
    if (answerSlots.length === 0) return
    if (answerSlots.some(s => s === null)) return
    if (!currentItem) return

    const builtWord = answerSlots
      .map(id => scrambledLetters.find(l => l.id === id)?.char || '')
      .join('')

    const isCorrect = builtWord.toLowerCase() === targetWord.toLowerCase()

    if (isCorrect) {
      const points = hintsUsed === 0 ? 15 : hintsUsed === 1 ? 10 : hintsUsed === 2 ? 5 : 2
      setScore(prev => prev + points)
      setCorrect(prev => prev + 1)
      setFeedback('correct')
      setFloatingScore({ points, key: Date.now() })

      // Auto-advance after delay
      feedbackTimerRef.current = setTimeout(() => {
        if (currentIndex + 1 < roundItems.length) {
          setCurrentIndex(prev => prev + 1)
          // The useEffect on [currentIndex, targetWord] will regenerate letters
        } else {
          // Game complete
          const finalTime = Math.floor((Date.now() - (startTime || Date.now())) / 1000)
          setElapsed(finalTime)
          setIsComplete(true)
          clearInterval(timerRef.current)
          try {
            onComplete?.({
              score: score + points,
              time: finalTime,
              hintsUsed: totalHints,
              correct: correct + 1,
            })
          } catch {}
        }
      }, 1000)
    } else {
      setFeedback('wrong')
      feedbackTimerRef.current = setTimeout(() => {
        setScrambledLetters(prev => prev.map(l => ({ ...l, placed: false })))
        setAnswerSlots(new Array(targetWord.length).fill(null))
        setFeedback(null)
      }, 700)
    }
  }, [answerSlots]) // eslint-disable-line react-hooks/exhaustive-deps

  // === TIMER ===
  useEffect(() => {
    if (!startTime || isComplete) return
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [startTime, isComplete])

  // === CLEANUP on unmount ===
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // === HANDLERS ===
  const playAudio = useCallback((e) => {
    if (e) e.stopPropagation()
    if (!currentItem?.audioUrl) return
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(currentItem.audioUrl)
    audioRef.current.play().catch(() => {})
  }, [currentItem])

  const handleTileClick = useCallback((letterId) => {
    if (feedback) return
    setScrambledLetters(prev => {
      const letter = prev.find(l => l.id === letterId)
      if (!letter || letter.placed) return prev
      return prev.map(l => l.id === letterId ? { ...l, placed: true } : l)
    })
    setAnswerSlots(prev => {
      const emptyIdx = prev.indexOf(null)
      if (emptyIdx === -1) return prev
      const next = [...prev]
      next[emptyIdx] = letterId
      return next
    })
  }, [feedback])

  const handleSlotClick = useCallback((slotIdx) => {
    if (feedback) return
    setAnswerSlots(prev => {
      const letterId = prev[slotIdx]
      if (!letterId) return prev
      const next = [...prev]
      next[slotIdx] = null
      return next
    })
    setScrambledLetters(prev => {
      const letterId = answerSlots[slotIdx]
      if (!letterId) return prev
      return prev.map(l => l.id === letterId ? { ...l, placed: false } : l)
    })
  }, [feedback, answerSlots])

  const handleHint = useCallback(() => {
    if (feedback || !currentItem) return
    const word = targetWord

    const emptyPositions = []
    for (let i = 0; i < word.length; i++) {
      const placedId = answerSlots[i]
      if (!placedId) {
        emptyPositions.push(i)
      } else {
        const placedChar = scrambledLetters.find(l => l.id === placedId)?.char
        if (placedChar?.toLowerCase() !== word[i].toLowerCase()) {
          setScrambledLetters(prev =>
            prev.map(l => l.id === placedId ? { ...l, placed: false } : l)
          )
          setAnswerSlots(prev => {
            const next = [...prev]
            next[i] = null
            return next
          })
          emptyPositions.push(i)
        }
      }
    }

    if (emptyPositions.length === 0) return
    const posToReveal = emptyPositions[Math.floor(Math.random() * emptyPositions.length)]
    const targetChar = word[posToReveal].toLowerCase()
    const available = scrambledLetters.find(
      l => !l.placed && l.char.toLowerCase() === targetChar
    )
    if (!available) return

    setScrambledLetters(prev =>
      prev.map(l => l.id === available.id ? { ...l, placed: true } : l)
    )
    setAnswerSlots(prev => {
      const next = [...prev]
      next[posToReveal] = available.id
      return next
    })

    setHintsUsed(h => h + 1)
    setTotalHints(h => h + 1)
  }, [feedback, currentItem, targetWord, answerSlots, scrambledLetters])

  const startNewRound = useCallback(() => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    setRoundKey(k => k + 1)
  }, [])

  // === HELPERS ===
  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const getStars = (hints) => {
    if (hints === 0) return 3
    if (hints <= 3) return 2
    return 1
  }

  const shakeVariants = {
    shake: {
      x: [0, -6, 6, -4, 4, -2, 2, 0],
      transition: { duration: 0.4 },
    },
  }

  // ── End screen ──────────────────────────────────────────────
  if (isComplete) {
    const total = roundItems.length
    const stars = getStars(totalHints)

    return (
      <motion.div
        className="flex flex-col items-center gap-6 py-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
        >
          <CheckCircle size={64} className="text-emerald-400" />
        </motion.div>

        <h2 className="text-2xl font-bold text-[var(--text-primary)] font-['Tajawal']">أحسنت!</h2>

        <div className="flex gap-2">
          {[1, 2, 3].map(i => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 300 }}
            >
              <Star
                size={36}
                className={i <= stars ? 'text-amber-400 fill-amber-400' : 'text-[var(--border-subtle)]'}
              />
            </motion.div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <div className="flex flex-col items-center px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-2xl font-bold text-emerald-400">{score}</span>
            <span className="text-xs text-emerald-400/70 font-['Tajawal']">نقاط</span>
          </div>
          <div className="flex flex-col items-center px-4 py-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
            <span className="text-2xl font-bold text-sky-400">{formatTime(elapsed)}</span>
            <span className="text-xs text-sky-400/70 font-['Tajawal']">الوقت</span>
          </div>
          <div className="flex flex-col items-center px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-2xl font-bold text-amber-400">{correct}/{total}</span>
            <span className="text-xs text-amber-400/70 font-['Tajawal']">صحيحة</span>
          </div>
          <div className="flex flex-col items-center px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <span className="text-2xl font-bold text-purple-400">{totalHints}</span>
            <span className="text-xs text-purple-400/70 font-['Tajawal']">تلميحات</span>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={startNewRound}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:bg-sky-500/30 transition-colors font-['Tajawal']"
          >
            <RotateCcw size={16} />
            جولة جديدة
          </button>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] transition-colors font-['Tajawal']"
            >
              العودة
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  if (!currentItem || !targetWord) return null

  const progress = roundItems.length > 0 ? currentIndex / roundItems.length : 0

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto" dir="rtl">
      {/* Progress bar */}
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-['Tajawal']">
          <span>{currentIndex + 1} / {roundItems.length}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Zap size={12} className="text-amber-400" />
              {score}
            </span>
            <span className="flex items-center gap-1">
              <Timer size={12} />
              {formatTime(elapsed)}
            </span>
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-sky-500"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Card */}
      <div key={`scramble-card-${currentIndex}`} className="w-full">
        <motion.div
          key={`scramble-motion-${currentIndex}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="w-full rounded-[20px] p-6 sm:p-8 flex flex-col items-center gap-5 relative"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Floating score */}
          <AnimatePresence>
            {floatingScore && (
              <motion.span
                key={floatingScore.key}
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 0, y: -40 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute top-2 left-1/2 -translate-x-1/2 text-lg font-bold text-emerald-400 pointer-events-none z-10"
              >
                +{floatingScore.points}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Clue: Arabic hint + audio */}
          <div className="flex items-center gap-3">
            <p className="text-xl font-bold text-[var(--text-primary)] font-['Tajawal']">
              {currentItem.hint}
            </p>
            {currentItem.audioUrl && (
              <button
                onClick={playAudio}
                className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center hover:bg-sky-500/30 transition-colors flex-shrink-0"
                aria-label="تشغيل النطق"
              >
                <Volume2 size={18} />
              </button>
            )}
          </div>

          {/* Answer slots */}
          <div dir="ltr" style={{ direction: 'ltr' }} className="flex flex-wrap justify-center gap-2">
            {answerSlots.map((letterId, idx) => {
              const letter = letterId
                ? scrambledLetters.find(l => l.id === letterId)
                : null

              return (
                <motion.button
                  key={`slot-${currentIndex}-${idx}`}
                  onClick={() => handleSlotClick(idx)}
                  variants={feedback === 'wrong' ? shakeVariants : undefined}
                  animate={feedback === 'wrong' ? 'shake' : undefined}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg border-2 text-lg font-bold font-['Inter'] flex items-center justify-center transition-colors ${
                    feedback === 'correct' && letter
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                      : feedback === 'wrong' && letter
                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : letter
                          ? 'bg-sky-500/15 border-sky-500/40 text-sky-400 cursor-pointer hover:bg-sky-500/25'
                          : 'border-dashed border-[var(--border-subtle)] bg-transparent'
                  }`}
                  disabled={!letter || !!feedback}
                >
                  {letter?.char || ''}
                </motion.button>
              )
            })}
          </div>

          {/* Scrambled tiles */}
          <div dir="ltr" style={{ direction: 'ltr' }} className="flex flex-wrap justify-center gap-2 min-h-[48px]">
            {scrambledLetters.map((letter) => {
              if (letter.placed) {
                return (
                  <div
                    key={letter.id}
                    className="w-11 h-11 sm:w-12 sm:h-12"
                  />
                )
              }

              return (
                <motion.button
                  key={letter.id}
                  onClick={() => handleTileClick(letter.id)}
                  disabled={!!feedback}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg border text-lg font-bold font-['Inter'] flex items-center justify-center bg-[var(--surface-base)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-sky-500/40 hover:bg-sky-500/10 active:scale-95 transition-all cursor-pointer"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {letter.char}
                </motion.button>
              )
            })}
          </div>

          {/* Hint button */}
          {!feedback && answerSlots.some(s => s === null) && (
            <button
              onClick={handleHint}
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-amber-400 transition-colors font-['Tajawal']"
            >
              <Lightbulb size={14} />
              تلميح
            </button>
          )}
        </motion.div>
      </div>
    </div>
  )
}
