import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, RotateCcw, ArrowRight, Star, Timer } from 'lucide-react'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const PAIRS_PER_ROUND = 6

export default function MatchGame({
  pairs,
  title = 'وصّل الكلمة بمعناها',
  pairsPerRound = PAIRS_PER_ROUND,
  onComplete,
  onBack,
}) {
  const [roundPairs, setRoundPairs] = useState([])
  const [shuffledAnswers, setShuffledAnswers] = useState([])
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [matched, setMatched] = useState(new Set())
  const [wrongPair, setWrongPair] = useState(null) // { questionId, answerId }
  const [correctPair, setCorrectPair] = useState(null) // { questionId, answerId }
  const [mistakes, setMistakes] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  // Initialize round
  const initRound = useCallback(() => {
    const selected = shuffle(pairs).slice(0, pairsPerRound)
    setRoundPairs(selected)
    setShuffledAnswers(shuffle(selected.map(p => ({ id: p.id, answer: p.answer }))))
    setSelectedQuestion(null)
    setSelectedAnswer(null)
    setMatched(new Set())
    setWrongPair(null)
    setCorrectPair(null)
    setMistakes(0)
    setIsComplete(false)
    setElapsed(0)
    setStartTime(Date.now())
  }, [pairs, pairsPerRound])

  useEffect(() => {
    if (pairs.length > 0) initRound()
  }, [pairs, initRound])

  // Timer
  useEffect(() => {
    if (!startTime || isComplete) return
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [startTime, isComplete])

  // Check for match when both selected
  useEffect(() => {
    if (selectedQuestion === null || selectedAnswer === null) return

    const pair = roundPairs.find(p => p.id === selectedQuestion)
    const isCorrect = pair && pair.id === selectedAnswer

    if (isCorrect) {
      setCorrectPair({ questionId: selectedQuestion, answerId: selectedAnswer })
      setTimeout(() => {
        setMatched(prev => {
          const next = new Set(prev)
          next.add(selectedQuestion)
          // Check completion
          if (next.size === roundPairs.length) {
            setIsComplete(true)
            clearInterval(timerRef.current)
            const finalTime = Math.floor((Date.now() - startTime) / 1000)
            setElapsed(finalTime)
            onComplete?.({
              score: roundPairs.length - mistakes,
              totalPairs: roundPairs.length,
              time: finalTime,
              mistakes,
            })
          }
          return next
        })
        setCorrectPair(null)
        setSelectedQuestion(null)
        setSelectedAnswer(null)
      }, 500)
    } else {
      setMistakes(m => m + 1)
      setWrongPair({ questionId: selectedQuestion, answerId: selectedAnswer })
      setTimeout(() => {
        setWrongPair(null)
        setSelectedQuestion(null)
        setSelectedAnswer(null)
      }, 600)
    }
  }, [selectedQuestion, selectedAnswer, roundPairs, startTime, mistakes, onComplete])

  const handleQuestionTap = (id) => {
    if (matched.has(id) || wrongPair || correctPair) return
    if (selectedQuestion === id) {
      setSelectedQuestion(null)
      return
    }
    setSelectedQuestion(id)
  }

  const handleAnswerTap = (id) => {
    if (matched.has(id) || wrongPair || correctPair) return
    if (!selectedQuestion) return // must select question first
    if (selectedAnswer === id) {
      setSelectedAnswer(null)
      return
    }
    setSelectedAnswer(id)
  }

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const getStars = (time) => {
    if (time <= 30) return 3
    if (time <= 60) return 2
    return 1
  }

  // Shake animation
  const shakeVariants = {
    shake: {
      x: [0, -8, 8, -6, 6, -3, 3, 0],
      transition: { duration: 0.5 },
    },
  }

  // End screen
  if (isComplete) {
    const stars = getStars(elapsed)
    const score = roundPairs.length - Math.min(mistakes, roundPairs.length)

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
        <div className="flex gap-4 mt-2">
          <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-2xl font-bold text-emerald-400">{score}/{roundPairs.length}</span>
            <span className="text-xs text-emerald-400/70 font-['Tajawal']">صحيحة</span>
          </div>
          <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
            <span className="text-2xl font-bold text-sky-400">{formatTime(elapsed)}</span>
            <span className="text-xs text-sky-400/70 font-['Tajawal']">الوقت</span>
          </div>
          {mistakes > 0 && (
            <div className="flex flex-col items-center px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <span className="text-2xl font-bold text-red-400">{mistakes}</span>
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

  if (!roundPairs.length) return null

  const progress = matched.size / roundPairs.length

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="w-full space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal'] text-center">
          {title}
        </h2>

        {/* Progress bar */}
        <div className="w-full space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-['Tajawal']">
            <span>{matched.size} / {roundPairs.length}</span>
            <span className="flex items-center gap-1">
              <Timer size={12} />
              {formatTime(elapsed)}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={false}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Match area — two columns */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 w-full">
        {/* Questions (left/right depending on RTL) */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs text-[var(--text-muted)] font-['Tajawal'] text-center mb-1">
            الكلمة
          </span>
          <AnimatePresence>
            {roundPairs.map((p, i) => {
              const isMatched = matched.has(p.id)
              const isSelected = selectedQuestion === p.id
              const isWrong = wrongPair?.questionId === p.id
              const isCorrect = correctPair?.questionId === p.id

              if (isMatched) {
                return (
                  <motion.div
                    key={p.id}
                    initial={false}
                    animate={{ opacity: 0.25, scale: 0.95 }}
                    className="h-[52px] rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
                  >
                    <span className="text-sm text-emerald-400/50 line-through font-['Inter']">{p.question}</span>
                  </motion.div>
                )
              }

              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  variants={shakeVariants}
                  {...(isWrong ? { animate: 'shake' } : {})}
                  onClick={() => handleQuestionTap(p.id)}
                  className={`h-[52px] rounded-xl border text-sm font-medium font-['Inter'] transition-all duration-200 ${
                    isCorrect
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 scale-95'
                      : isWrong
                        ? 'bg-red-500/15 border-red-500/40 text-red-400'
                        : isSelected
                          ? 'bg-sky-500/15 border-sky-500/50 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                          : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-sky-500/30'
                  }`}
                >
                  {p.question}
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Answers */}
        <div className="flex flex-col gap-2.5">
          <span className="text-xs text-[var(--text-muted)] font-['Tajawal'] text-center mb-1">
            المعنى
          </span>
          <AnimatePresence>
            {shuffledAnswers.map((a, i) => {
              const isMatched = matched.has(a.id)
              const isSelected = selectedAnswer === a.id
              const isWrong = wrongPair?.answerId === a.id
              const isCorrect = correctPair?.answerId === a.id

              if (isMatched) {
                return (
                  <motion.div
                    key={a.id}
                    initial={false}
                    animate={{ opacity: 0.25, scale: 0.95 }}
                    className="h-[52px] rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
                  >
                    <span className="text-sm text-emerald-400/50 line-through font-['Tajawal']">{a.answer}</span>
                  </motion.div>
                )
              }

              return (
                <motion.button
                  key={a.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.2 }}
                  variants={shakeVariants}
                  {...(isWrong ? { animate: 'shake' } : {})}
                  onClick={() => handleAnswerTap(a.id)}
                  disabled={!selectedQuestion}
                  className={`h-[52px] rounded-xl border text-sm font-medium font-['Tajawal'] transition-all duration-200 ${
                    isCorrect
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 scale-95'
                      : isWrong
                        ? 'bg-red-500/15 border-red-500/40 text-red-400'
                        : isSelected
                          ? 'bg-sky-500/15 border-sky-500/50 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.15)]'
                          : !selectedQuestion
                            ? 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60 cursor-default'
                            : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-sky-500/30 cursor-pointer'
                  }`}
                >
                  {a.answer}
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-[var(--text-muted)] opacity-50 font-['Tajawal'] mt-2">
        اختر كلمة ثم اضغط على معناها
      </p>
    </div>
  )
}
