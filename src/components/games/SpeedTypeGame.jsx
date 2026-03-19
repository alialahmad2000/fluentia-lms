import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, CheckCircle, RotateCcw, ArrowRight, Star, Timer, Lightbulb, Zap } from 'lucide-react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ITEMS_PER_ROUND = 10

export default function SpeedTypeGame({
  items,
  title = 'اسمع واكتب',
  itemsPerRound = ITEMS_PER_ROUND,
  showAudio = true,
  showPrompt = true,
  onComplete,
  onBack,
}) {
  const [roundItems, setRoundItems] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [input, setInput] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [hintUsed, setHintUsed] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | 'reveal'
  const [score, setScore] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [floatingScore, setFloatingScore] = useState(null) // { points, key }
  const [isComplete, setIsComplete] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [wordStartTime, setWordStartTime] = useState(null)
  const [direction, setDirection] = useState(1)

  const inputRef = useRef(null)
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const hintTimerRef = useRef(null)

  // Initialize round
  const initRound = useCallback(() => {
    const selected = shuffle(items).slice(0, itemsPerRound)
    setRoundItems(selected)
    setCurrentIndex(0)
    setInput('')
    setAttempts(0)
    setHintUsed(false)
    setShowHint(false)
    setFeedback(null)
    setScore(0)
    setCorrect(0)
    setWrong(0)
    setFloatingScore(null)
    setIsComplete(false)
    setElapsed(0)
    setStartTime(Date.now())
    setWordStartTime(Date.now())
    setDirection(1)
  }, [items, itemsPerRound])

  useEffect(() => {
    if (items.length > 0) initRound()
  }, [items, initRound])

  // Timer
  useEffect(() => {
    if (!startTime || isComplete) return
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [startTime, isComplete])

  const currentItem = roundItems[currentIndex]

  // Auto-play audio when word changes
  useEffect(() => {
    if (!currentItem || !showAudio || !currentItem.audioUrl) return
    const timeout = setTimeout(() => {
      playAudio()
    }, 300)
    return () => clearTimeout(timeout)
  }, [currentIndex, currentItem]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-hint after 10 seconds
  useEffect(() => {
    if (!currentItem || feedback) return
    hintTimerRef.current = setTimeout(() => {
      if (!hintUsed) setShowHint(true)
    }, 10000)
    return () => clearTimeout(hintTimerRef.current)
  }, [currentIndex, currentItem, feedback, hintUsed])

  // Auto-focus input
  useEffect(() => {
    if (!feedback && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentIndex, feedback])

  const playAudio = useCallback((e) => {
    if (e) e.stopPropagation()
    if (!currentItem?.audioUrl) return
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(currentItem.audioUrl)
    audioRef.current.play().catch(() => {})
  }, [currentItem])

  const advanceToNext = useCallback(() => {
    setDirection(1)
    setInput('')
    setAttempts(0)
    setHintUsed(false)
    setShowHint(false)
    setFeedback(null)

    if (currentIndex + 1 >= roundItems.length) {
      const finalTime = Math.floor((Date.now() - startTime) / 1000)
      setElapsed(finalTime)
      setIsComplete(true)
      clearInterval(timerRef.current)
      onComplete?.({
        score,
        time: finalTime,
        correct,
        wrong,
        wpm: finalTime > 0 ? Math.round((correct / finalTime) * 60) : 0,
      })
    } else {
      setCurrentIndex(i => i + 1)
      setWordStartTime(Date.now())
    }
  }, [currentIndex, roundItems.length, startTime, score, correct, wrong, onComplete])

  const handleCorrect = useCallback(() => {
    const wordTime = (Date.now() - wordStartTime) / 1000
    let points = hintUsed ? 5 : 10
    if (wordTime < 5 && !hintUsed) points += 5

    setScore(s => s + points)
    setCorrect(c => c + 1)
    setFeedback('correct')
    setFloatingScore({ points, key: Date.now() })

    setTimeout(() => advanceToNext(), 800)
  }, [wordStartTime, hintUsed, advanceToNext])

  const handleWrong = useCallback(() => {
    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    if (newAttempts >= 2) {
      // Reveal answer
      setWrong(w => w + 1)
      setFeedback('reveal')
      setTimeout(() => advanceToNext(), 2000)
    } else {
      // Shake and let them try again
      setFeedback('wrong')
      setTimeout(() => {
        setFeedback(null)
        setInput('')
        if (inputRef.current) inputRef.current.focus()
      }, 600)
    }
  }, [attempts, advanceToNext])

  const handleInputChange = (e) => {
    if (feedback) return
    const val = e.target.value
    setInput(val)

    // Auto-detect complete correct answer
    if (val.toLowerCase().trim() === currentItem.answer.toLowerCase()) {
      handleCorrect()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim() && !feedback) {
      if (input.toLowerCase().trim() === currentItem.answer.toLowerCase()) {
        handleCorrect()
      } else {
        handleWrong()
      }
    }
  }

  const handleHint = () => {
    setHintUsed(true)
    setShowHint(true)
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const getStars = (pct) => {
    if (pct >= 90) return 3
    if (pct >= 70) return 2
    return 1
  }

  // Render colored input letters
  const renderColoredInput = () => {
    if (!currentItem) return null
    const answer = currentItem.answer.toLowerCase()
    return input.split('').map((char, i) => {
      const isCorrect = i < answer.length && char.toLowerCase() === answer[i]
      return (
        <span
          key={i}
          className={isCorrect ? 'text-emerald-400' : 'text-red-400'}
        >
          {char}
        </span>
      )
    })
  }

  // End screen
  if (isComplete) {
    const total = roundItems.length
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    const stars = getStars(pct)
    const wpm = elapsed > 0 ? Math.round((correct / elapsed) * 60) : 0

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

        {/* Stars */}
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

        {/* Stats */}
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
            <span className="text-2xl font-bold text-purple-400">{wpm}</span>
            <span className="text-xs text-purple-400/70 font-['Tajawal']">كلمة/دقيقة</span>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={initRound}
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

  if (!currentItem) return null

  const progress = currentIndex / roundItems.length
  const hintText = currentItem.answer.slice(0, 2) + '...'

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto" dir="rtl">
      {/* Progress bar */}
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-['Tajawal']">
          <span>{currentIndex + 1} / {roundItems.length}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400">✅ {correct}</span>
            {wrong > 0 && <span className="flex items-center gap-1 text-red-400">❌ {wrong}</span>}
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

      {/* Card area */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentItem.id + '-' + currentIndex}
          custom={direction}
          initial={{ x: 200, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -200, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full"
        >
          <div
            className="w-full rounded-[20px] p-8 flex flex-col items-center gap-5"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Audio button */}
            {showAudio && currentItem.audioUrl && (
              <button
                onClick={playAudio}
                className="w-14 h-14 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center hover:bg-sky-500/30 transition-colors"
                aria-label="تشغيل النطق"
              >
                <Volume2 size={24} />
              </button>
            )}

            {/* Prompt (Arabic meaning) */}
            {showPrompt && (
              <p className="text-2xl font-bold text-[var(--text-primary)] font-['Tajawal'] text-center">
                {currentItem.prompt}
              </p>
            )}

            {/* Hint */}
            {showHint && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-amber-400 font-['Inter']"
              >
                💡 {hintText}
              </motion.p>
            )}

            {/* Input area */}
            <div className="relative w-full max-w-[320px]">
              {/* Colored overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <span className="text-2xl font-bold font-['Inter'] tracking-wide">
                  {renderColoredInput()}
                </span>
              </div>

              {/* Actual input (transparent text, visible caret) */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={!!feedback}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                dir="ltr"
                className={`w-full h-16 text-2xl text-center font-bold font-['Inter'] tracking-wide rounded-xl border-2 outline-none transition-all duration-200 bg-[var(--surface-base)] ${
                  feedback === 'correct'
                    ? 'border-emerald-500 bg-emerald-500/10 text-transparent caret-transparent'
                    : feedback === 'wrong'
                      ? 'border-red-500 bg-red-500/10 text-transparent caret-transparent'
                      : feedback === 'reveal'
                        ? 'border-amber-500 bg-amber-500/10 text-transparent caret-transparent'
                        : 'border-[var(--border-subtle)] text-transparent caret-[var(--text-primary)] focus:border-sky-500'
                }`}
              />

              {/* Floating score */}
              <AnimatePresence>
                {floatingScore && (
                  <motion.span
                    key={floatingScore.key}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -40 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg font-bold text-emerald-400 pointer-events-none"
                  >
                    +{floatingScore.points}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Revealed answer */}
            {feedback === 'reveal' && (
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-bold text-amber-400 font-['Inter']"
              >
                {currentItem.answer}
              </motion.p>
            )}

            {/* Hint button (before auto-hint) */}
            {!feedback && !showHint && (
              <button
                onClick={handleHint}
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-amber-400 transition-colors font-['Tajawal']"
              >
                <Lightbulb size={14} />
                تلميح
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Score display */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] font-['Tajawal']">
        <Zap size={14} className="text-amber-400" />
        <span>{score} نقطة</span>
      </div>
    </div>
  )
}
