import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, ArrowLeft, RotateCcw } from 'lucide-react'

const TOTAL_QUESTIONS = 10

function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function VerbPractice({ verbs, difficulty = 'easy' }) {
  const [queue, setQueue] = useState([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [feedback, setFeedback] = useState(null) // { correct, correctAnswer }
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const inputRef = useRef(null)
  const input2Ref = useRef(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // Build quiz queue
  useEffect(() => {
    if (!verbs?.length) return
    const shuffled = shuffleArray(verbs).slice(0, TOTAL_QUESTIONS)
    const questions = shuffled.map(verb => {
      const forms = ['base', 'past', 'pp']
      if (difficulty === 'hard') {
        // 2 blanks — show 1 form, blank 2
        const shown = Math.floor(Math.random() * 3)
        const blanks = forms.filter((_, i) => i !== shown)
        return { verb, shown: forms[shown], blanks }
      } else {
        // 1 blank
        const blankIdx = Math.floor(Math.random() * 3)
        return { verb, shown: null, blanks: [forms[blankIdx]] }
      }
    })
    setQueue(questions)
    setCurrent(0)
    setAnswers({})
    setFeedback(null)
    setScore(0)
    setFinished(false)
  }, [verbs, difficulty])

  const getFormValue = (verb, form) => {
    if (form === 'base') return verb.verb_base
    if (form === 'past') return verb.verb_past
    return verb.verb_past_participle
  }

  const getFormLabel = (form) => {
    if (form === 'base') return 'المصدر'
    if (form === 'past') return 'الماضي'
    return 'التصريف الثالث'
  }

  const checkAnswer = useCallback(() => {
    if (!queue[current]) return
    const q = queue[current]
    let allCorrect = true
    const corrections = []

    for (const blank of q.blanks) {
      const correct = getFormValue(q.verb, blank)
      const given = (answers[blank] || '').trim().toLowerCase()
      if (given !== correct.toLowerCase()) {
        allCorrect = false
        corrections.push(`${getFormLabel(blank)}: ${correct}`)
      }
    }

    if (allCorrect) {
      setScore(s => s + 1)
      setFeedback({ correct: true })
    } else {
      setFeedback({ correct: false, correctAnswer: corrections.join(' — ') })
    }
  }, [queue, current, answers])

  const nextQuestion = () => {
    setFeedback(null)
    setAnswers({})
    if (current + 1 >= queue.length) {
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
    }
  }

  const restart = (newRound = false) => {
    if (newRound) {
      const shuffled = shuffleArray(verbs).slice(0, TOTAL_QUESTIONS)
      const questions = shuffled.map(verb => {
        const forms = ['base', 'past', 'pp']
        if (difficulty === 'hard') {
          const shown = Math.floor(Math.random() * 3)
          const blanks = forms.filter((_, i) => i !== shown)
          return { verb, shown: forms[shown], blanks }
        } else {
          const blankIdx = Math.floor(Math.random() * 3)
          return { verb, shown: null, blanks: [forms[blankIdx]] }
        }
      })
      setQueue(questions)
    }
    setCurrent(0)
    setAnswers({})
    setFeedback(null)
    setScore(0)
    setFinished(false)
  }

  useEffect(() => {
    if (!feedback && inputRef.current) inputRef.current.focus()
  }, [current, feedback])

  if (!queue.length) return null

  // Results screen
  if (finished) {
    const pct = Math.round((score / queue.length) * 100)
    const color = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'
    const bg = pct >= 80 ? 'bg-emerald-500/10' : pct >= 60 ? 'bg-amber-500/10' : 'bg-red-500/10'

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-xl p-8 text-center max-w-md mx-auto"
      >
        <div className={`w-20 h-20 rounded-full ${bg} flex items-center justify-center mx-auto mb-4`}>
          <span className={`text-3xl font-bold ${color}`}>{pct}%</span>
        </div>
        <p className="text-lg font-semibold text-[var(--text-primary)] mb-2 font-['Tajawal']">
          {score} / {queue.length} صحيحة
        </p>
        <p className={`text-sm ${color} mb-6 font-['Tajawal']`}>
          {pct >= 80 ? 'ممتاز! أداء رائع' : pct >= 60 ? 'جيد، واصل التدريب' : 'حاول مرة أخرى'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => restart(false)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors font-['Tajawal']"
          >
            <RotateCcw size={16} />
            أعد المحاولة
          </button>
          <button
            onClick={() => restart(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors font-['Tajawal']"
          >
            جولة جديدة
          </button>
        </div>
      </motion.div>
    )
  }

  const q = queue[current]
  const allForms = ['base', 'past', 'pp']

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-[var(--text-muted)] mb-2 font-['Tajawal']">
          <span>{current + 1} / {queue.length}</span>
          <span>{score} صحيحة</span>
        </div>
        <div className="h-2 bg-[var(--border-subtle)] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-sky-500 rounded-full"
            initial={false}
            animate={{ width: `${((current + 1) / queue.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Verb question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="glass-card rounded-xl p-6"
        >
          {/* Arabic meaning as hint */}
          <p className="text-center text-lg text-[var(--text-secondary)] mb-1 font-['Tajawal']">
            {q.verb.meaning_ar}
          </p>
          {q.verb.example_sentence && (
            <p className="text-center text-sm text-[var(--text-muted)] italic mb-6 font-['Inter']">
              "{q.verb.example_sentence}"
            </p>
          )}

          {/* 3 forms */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {allForms.map((form, idx) => {
              const isBlank = q.blanks.includes(form)
              const value = getFormValue(q.verb, form)
              const refProp = idx === 0 && isBlank ? inputRef : q.blanks.indexOf(form) === 1 ? input2Ref : null

              return (
                <div key={form} className="text-center">
                  <p className="text-xs text-[var(--text-muted)] mb-2">{getFormLabel(form)}</p>
                  {isBlank ? (
                    <input
                      ref={refProp}
                      type="text"
                      value={answers[form] || ''}
                      onChange={e => setAnswers(a => ({ ...a, [form]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !feedback) checkAnswer()
                      }}
                      disabled={!!feedback}
                      placeholder="?"
                      className={`w-full max-w-[120px] mx-auto h-12 text-center rounded-lg border text-lg font-['Inter'] transition-colors outline-none
                        ${feedback
                          ? feedback.correct
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                            : 'border-red-500 bg-red-500/10 text-red-400'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-primary)] focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30'
                        }`}
                      dir="ltr"
                    />
                  ) : (
                    <p className="text-xl font-bold text-[var(--text-primary)] font-['Inter'] h-12 flex items-center justify-center">
                      {value}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mb-4 p-3 rounded-lg text-center font-['Tajawal'] ${
                  feedback.correct
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {feedback.correct ? (
                  <span className="flex items-center justify-center gap-2">
                    <Check size={18} /> أحسنت! 🎉
                  </span>
                ) : (
                  <span>
                    <X size={18} className="inline ml-1" />
                    الإجابة الصحيحة: {feedback.correctAnswer}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex justify-center gap-3">
            {!feedback ? (
              <button
                onClick={checkAnswer}
                disabled={q.blanks.every(b => !(answers[b] || '').trim())}
                className="px-6 py-3 rounded-xl bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-['Tajawal']"
              >
                تحقق
              </button>
            ) : (
              <button
                onClick={nextQuestion}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 text-white hover:bg-sky-600 transition-colors font-['Tajawal']"
              >
                <ArrowLeft size={16} />
                التالي
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
