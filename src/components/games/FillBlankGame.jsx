import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, RotateCcw, ArrowRight, Star, Timer, Volume2 } from 'lucide-react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ITEMS_PER_ROUND = 10

export default function FillBlankGame({
  items,
  title = 'أكمل الجملة',
  itemsPerRound = ITEMS_PER_ROUND,
  onComplete,
  onBack,
}) {
  const [roundItems, setRoundItems] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [shuffledOptions, setShuffledOptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong'
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [direction, setDirection] = useState(1)

  const audioRef = useRef(null)
  const timerRef = useRef(null)

  const setupOptions = useCallback((item) => {
    // Deduplicate: remove any distractor matching correct answer, then remove dupes
    const correctLower = item.correctAnswer.toLowerCase().trim()
    const seen = new Set([correctLower])
    const uniqueDistractors = item.distractors.filter(d => {
      const key = d.toLowerCase().trim()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, 3)
    const options = shuffle([item.correctAnswer, ...uniqueDistractors])
    setShuffledOptions(options)
  }, [])

  const initRound = useCallback(() => {
    const selected = shuffle(items).slice(0, itemsPerRound)
    setRoundItems(selected)
    setCurrentIndex(0)
    setSelected(null)
    setFeedback(null)
    setScore(0)
    setCorrectCount(0)
    setWrongCount(0)
    setIsComplete(false)
    setElapsed(0)
    setStartTime(Date.now())
    setDirection(1)
    if (selected.length > 0) setupOptions(selected[0])
  }, [items, itemsPerRound, setupOptions])

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

  const playAudio = useCallback((e) => {
    if (e) e.stopPropagation()
    if (!currentItem?.audioUrl) return
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(currentItem.audioUrl)
    audioRef.current.play().catch(() => {})
  }, [currentItem])

  const advanceToNext = useCallback(() => {
    setDirection(1)
    setSelected(null)
    setFeedback(null)

    if (currentIndex + 1 >= roundItems.length) {
      const finalTime = Math.floor((Date.now() - startTime) / 1000)
      setElapsed(finalTime)
      setIsComplete(true)
      clearInterval(timerRef.current)
      onComplete?.({
        score,
        correct: correctCount,
        wrong: wrongCount,
        total: roundItems.length,
      })
    } else {
      const nextIdx = currentIndex + 1
      setCurrentIndex(nextIdx)
      setupOptions(roundItems[nextIdx])
    }
  }, [currentIndex, roundItems, startTime, score, correctCount, wrongCount, onComplete, setupOptions])

  const handleOptionClick = (option) => {
    if (feedback || selected) return

    setSelected(option)
    const isCorrect = option.toLowerCase() === currentItem.correctAnswer.toLowerCase()

    if (isCorrect) {
      setFeedback('correct')
      setScore(s => s + 10)
      setCorrectCount(c => c + 1)
    } else {
      setFeedback('wrong')
      setWrongCount(w => w + 1)
    }

    setTimeout(() => advanceToNext(), 1500)
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

  // Render sentence with blank highlighted
  const renderSentence = (sentence) => {
    if (!sentence) return null
    const parts = sentence.split('_____')
    if (parts.length < 2) return <span>{sentence}</span>

    return (
      <>
        {parts[0]}
        <span className={`inline-block min-w-[80px] mx-1 px-2 py-0.5 rounded-lg border-b-2 text-center font-bold ${
          feedback === 'correct'
            ? 'border-emerald-500 text-emerald-400'
            : feedback === 'wrong'
              ? 'border-red-500 text-red-400'
              : 'border-sky-500 text-sky-400'
        }`}>
          {feedback ? currentItem.correctAnswer : '______'}
        </span>
        {parts[1]}
      </>
    )
  }

  // End screen
  if (isComplete) {
    const total = roundItems.length
    const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0
    const stars = getStars(pct)

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
            <span className="text-2xl font-bold text-emerald-400">{correctCount}/{total}</span>
            <span className="text-xs text-emerald-400/70 font-['Tajawal']">صحيحة</span>
          </div>
          <div className="flex flex-col items-center px-4 py-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
            <span className="text-2xl font-bold text-sky-400">{formatTime(elapsed)}</span>
            <span className="text-xs text-sky-400/70 font-['Tajawal']">الوقت</span>
          </div>
          <div className="flex flex-col items-center px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-2xl font-bold text-amber-400">{score}</span>
            <span className="text-xs text-amber-400/70 font-['Tajawal']">نقاط</span>
          </div>
          {wrongCount > 0 && (
            <div className="flex flex-col items-center px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <span className="text-2xl font-bold text-red-400">{wrongCount}</span>
              <span className="text-xs text-red-400/70 font-['Tajawal']">أخطاء</span>
            </div>
          )}
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

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto" dir="rtl">
      {/* Progress bar */}
      <div className="w-full space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-['Tajawal']">
          <span>{currentIndex + 1} / {roundItems.length}</span>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400">✅ {correctCount}</span>
            {wrongCount > 0 && <span className="text-red-400">❌ {wrongCount}</span>}
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
            className="w-full rounded-[20px] p-6 sm:p-8 flex flex-col items-center gap-5"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {/* Audio button */}
            {currentItem.audioUrl && (
              <button
                onClick={playAudio}
                className="w-11 h-11 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center hover:bg-sky-500/30 transition-colors"
                aria-label="تشغيل النطق"
              >
                <Volume2 size={20} />
              </button>
            )}

            {/* Sentence with blank */}
            <p className="text-lg sm:text-xl text-[var(--text-primary)] font-['Inter'] text-center leading-relaxed" dir="ltr">
              {renderSentence(currentItem.sentence)}
            </p>

            {/* Arabic meaning (shown after answer or as fallback) */}
            <AnimatePresence>
              {feedback && currentItem.meaning && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-base text-[var(--text-secondary)] font-['Tajawal']"
                >
                  {currentItem.meaning}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              {shuffledOptions.map((option) => {
                const isSelected = selected === option
                const isCorrectAnswer = option.toLowerCase() === currentItem.correctAnswer.toLowerCase()
                const showAsCorrect = feedback && isCorrectAnswer
                const showAsWrong = feedback === 'wrong' && isSelected && !isCorrectAnswer

                return (
                  <motion.button
                    key={option}
                    onClick={() => handleOptionClick(option)}
                    disabled={!!feedback}
                    whileTap={!feedback ? { scale: 0.97 } : undefined}
                    className={`h-14 rounded-xl border text-base font-medium font-['Inter'] transition-all duration-200 ${
                      showAsCorrect
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : showAsWrong
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : feedback
                            ? 'bg-[var(--surface-base)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-50'
                            : 'bg-[var(--surface-base)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-sky-500/40 hover:bg-sky-500/5 cursor-pointer'
                    }`}
                  >
                    {option}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
