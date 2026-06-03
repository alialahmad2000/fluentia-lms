import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, X, ChevronLeft } from 'lucide-react'
import { recordDrill } from '../../services/vocab'

/**
 * Typing Recall — Arabic meaning shown, student types the English word.
 *
 * Levenshtein distance ≤ 1 = correct (one typo allowed). Educates with
 * the corrected spelling. Counts toward streak as correct.
 *
 * Distance > 1 = incorrect; show correct spelling, log and advance.
 */
export default function TypingRecallDrill({ batch, studentId, onComplete }) {
  const primaries = batch?.primaryWords || []
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null) // { isCorrect, distance, typo }
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, promoted: 0 })
  const sessionStartRef = useRef(Date.now())
  const cardStartRef = useRef(Date.now())
  const inputRef = useRef(null)

  const current = primaries[index]
  const isLast = index >= primaries.length - 1

  useEffect(() => {
    cardStartRef.current = Date.now()
    setInput('')
    setSubmitted(false)
    setResult(null)
    // Focus input on card mount
    setTimeout(() => inputRef.current?.focus(), 60)
  }, [index])

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault?.()
      if (submitted) return
      const guess = input.trim().toLowerCase()
      const target = (current?.word || '').trim().toLowerCase()
      if (!guess) return

      const distance = levenshtein(guess, target)
      const isCorrect = distance <= 1
      const typo = isCorrect && distance === 1
      setSubmitted(true)
      setResult({ isCorrect, distance, typo })

      try {
        const card = await recordDrill(current.id, 'typing_recall', isCorrect)
        const promoted = card?.mastery_level === 'mastered'
        setSessionStats((s) => ({
          correct: s.correct + (isCorrect ? 1 : 0),
          wrong: s.wrong + (isCorrect ? 0 : 1),
          promoted: s.promoted + (promoted ? 1 : 0),
        }))
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[hard-words] typing_recall attempt log failed', err?.message || err)
      }

      // Auto-advance after delay (longer when wrong so student can read correct spelling)
      const delay = isCorrect ? 1400 : 2400
      setTimeout(() => {
        if (isLast) {
          onComplete?.({
            mode: 'typing_recall',
            total: primaries.length,
            correct: sessionStats.correct + (isCorrect ? 1 : 0),
            wrong: sessionStats.wrong + (isCorrect ? 0 : 1),
            promoted: sessionStats.promoted,
            elapsedMs: Date.now() - sessionStartRef.current,
          })
        } else {
          setIndex((i) => i + 1)
        }
      }, delay)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [submitted, input, current, isLast, studentId]
  )

  const handleNextNow = useCallback(() => {
    if (!submitted) return
    if (isLast) {
      onComplete?.({
        mode: 'typing_recall',
        total: primaries.length,
        correct: sessionStats.correct,
        wrong: sessionStats.wrong,
        promoted: sessionStats.promoted,
        elapsedMs: Date.now() - sessionStartRef.current,
      })
    } else {
      setIndex((i) => i + 1)
    }
  }, [submitted, isLast, primaries.length, sessionStats, onComplete])

  if (!primaries.length) {
    return (
      <div className="text-center py-12">
        <p className="text-base" style={{ color: 'var(--vc-text-soft)' }}>
          لا توجد كلمات لهذا التدريب.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--vc-text-soft)' }}>
          {index + 1} / {primaries.length}
        </div>
        <div className="h-2 flex-1 mx-4 rounded-full overflow-hidden" style={{ background: 'var(--vc-surface-2)' }}>
          <motion.div
            className="h-full"
            style={{ background: 'linear-gradient(90deg, var(--vc-indigo), var(--vc-violet))' }}
            initial={{ width: 0 }}
            animate={{ width: `${((index + 1) / primaries.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25 }}
        >
          {/* Meaning card */}
          <div className="vc-card p-6 md:p-8 mb-5 text-center">
            <span className="block text-xs font-bold mb-3" style={{ color: 'var(--vc-text-dim)' }}>
              اكتبي الكلمة بالإنجليزي
            </span>
            <p className="text-2xl md:text-3xl font-bold" dir="rtl" style={{ color: 'var(--vc-text)' }}>
              {current.meaningAr || '—'}
            </p>
            {current.exampleSentence && (
              <p
                className="text-xs mt-3"
                dir="ltr"
                style={{ color: 'var(--vc-text-dim)', fontStyle: 'italic' }}
              >
                {(() => {
                  const re = new RegExp(`\\b${escapeRegex(current.word)}\\b`, 'gi')
                  return current.exampleSentence.replace(re, '_____')
                })()}
              </p>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={submitted}
                dir="ltr"
                placeholder="type the word…"
                className="vc-word w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none"
                style={{
                  background: submitted
                    ? result?.isCorrect
                      ? 'rgba(34,197,94,0.10)'
                      : 'rgba(239,68,68,0.10)'
                    : 'var(--vc-surface)',
                  border: submitted
                    ? result?.isCorrect
                      ? '1.5px solid rgba(34,197,94,0.5)'
                      : '1.5px solid rgba(239,68,68,0.5)'
                    : '1px solid var(--vc-border)',
                  color: 'var(--vc-text)',
                }}
              />
              {submitted && (
                <div className="absolute end-4 top-1/2 -translate-y-1/2">
                  {result?.isCorrect ? (
                    <CheckCircle size={20} style={{ color: 'rgb(34,197,94)' }} />
                  ) : (
                    <X size={20} style={{ color: 'rgb(239,68,68)' }} />
                  )}
                </div>
              )}
            </div>

            {/* Feedback */}
            {submitted && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-3 text-sm"
                style={{
                  background: result?.isCorrect
                    ? 'rgba(34,197,94,0.08)'
                    : 'rgba(239,68,68,0.08)',
                  color: result?.isCorrect ? 'rgb(34,197,94)' : 'rgb(239,68,68)',
                  border: `1px solid ${
                    result?.isCorrect ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'
                  }`,
                }}
              >
                {result?.isCorrect ? (
                  result?.typo ? (
                    <>
                      تقريباً صحيح — الكلمة الصحيحة:{' '}
                      <strong dir="ltr">{current.word}</strong>
                    </>
                  ) : (
                    <>ممتاز! ✓</>
                  )
                ) : (
                  <>
                    الكلمة الصحيحة: <strong dir="ltr">{current.word}</strong>
                  </>
                )}
              </motion.div>
            )}

            {!submitted ? (
              <button
                type="submit"
                disabled={!input.trim()}
                className="vc-btn vc-btn-primary w-full"
                style={{
                  opacity: input.trim() ? 1 : 0.5,
                  cursor: input.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                تحقّقي
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextNow}
                className="vc-btn vc-btn-ghost w-full"
              >
                {isLast ? 'إنهاء التدريب' : 'التالي'}
                <ChevronLeft size={16} />
              </button>
            )}
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Levenshtein distance (no dependency)
// ──────────────────────────────────────────────────────────────────
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const v0 = new Array(b.length + 1)
  const v1 = new Array(b.length + 1)
  for (let i = 0; i <= b.length; i++) v0[i] = i
  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost)
    }
    for (let j = 0; j <= b.length; j++) v0[j] = v1[j]
  }
  return v1[b.length]
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
