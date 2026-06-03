import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, CheckCircle, X } from 'lucide-react'
import { recordDrill } from '../../services/vocab'

/**
 * Context Fill — student sees an example sentence with the target word blanked,
 * picks the correct English word from 4 options (target + 3 distractors).
 *
 * Words without an example_sentence are skipped (the parent should ideally route
 * them to typing_recall instead). We surface them with a friendly "no example" card.
 */
export default function ContextFillDrill({ batch, studentId, onComplete }) {
  const primaries = batch?.primaryWords || []
  const distractorPool = batch?.distractorWords || []
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false) // shows correctness after tap
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, promoted: 0 })
  const sessionStartRef = useRef(Date.now())
  const cardStartRef = useRef(Date.now())

  const current = primaries[index]
  const isLast = index >= primaries.length - 1

  // Per-card 3 distractors (sampled, stable across re-renders for this card)
  const options = useMemo(() => {
    if (!current) return []
    const pool = distractorPool.filter((d) => d.id !== current.id)
    // shuffle pool and pick 3
    const arr = [...pool]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    const distractors = arr.slice(0, 3)
    const mixed = [...distractors, current]
    for (let i = mixed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[mixed[i], mixed[j]] = [mixed[j], mixed[i]]
    }
    return mixed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  useEffect(() => {
    cardStartRef.current = Date.now()
    setSelected(null)
    setRevealed(false)
  }, [index])

  // Sentence with target word blanked. Case-insensitive match; preserve sentence shape.
  const blankedSentence = useMemo(() => {
    if (!current?.exampleSentence) return null
    const sentence = current.exampleSentence
    const re = new RegExp(`\\b${escapeRegex(current.word)}\\b`, 'gi')
    if (re.test(sentence)) {
      return sentence.replace(re, '_____')
    }
    // Fallback: append blank if word not found in sentence
    return `${sentence} (_____)`
  }, [current])

  const handleSelect = useCallback(
    async (option) => {
      if (revealed) return
      const isCorrect = option.id === current.id
      setSelected(option.id)
      setRevealed(true)

      try {
        const card = await recordDrill(current.id, 'context_fill', isCorrect)
        const promoted = card?.mastery_level === 'mastered'
        setSessionStats((s) => ({
          correct: s.correct + (isCorrect ? 1 : 0),
          wrong: s.wrong + (isCorrect ? 0 : 1),
          promoted: s.promoted + (promoted ? 1 : 0),
        }))
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[hard-words] context_fill attempt log failed', e?.message || e)
      }

      // Advance after a moment so student sees the correctness flash
      setTimeout(() => {
        if (isLast) {
          onComplete?.({
            mode: 'context_fill',
            total: primaries.length,
            correct: sessionStats.correct + (isCorrect ? 1 : 0),
            wrong: sessionStats.wrong + (isCorrect ? 0 : 1),
            promoted: sessionStats.promoted,
            elapsedMs: Date.now() - sessionStartRef.current,
          })
        } else {
          setIndex((i) => i + 1)
        }
      }, isCorrect ? 1200 : 2000)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revealed, current, isLast, studentId]
  )

  const playAudio = useCallback((url) => {
    if (!url) return
    try {
      const audio = new Audio(url)
      audio.play().catch(() => {})
    } catch {}
  }, [])

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
      {/* Progress */}
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
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          {/* Sentence card */}
          <div className="vc-card p-5 md:p-6 mb-5">
            <div className="flex items-center justify-between mb-3 gap-2">
              <span className="text-xs font-bold" style={{ color: 'var(--vc-text-dim)' }}>
                اقرئي الجملة واختاري الكلمة المناسبة
              </span>
              {current.meaningAr && (
                <span className="text-xs" dir="rtl" style={{ color: 'var(--vc-text-dim)' }}>
                  المعنى: <span style={{ color: 'var(--vc-text-soft)' }}>{current.meaningAr}</span>
                </span>
              )}
            </div>
            <p className="vc-word text-lg md:text-xl leading-relaxed" dir="ltr" style={{ color: 'var(--vc-text)' }}>
              {blankedSentence || '—'}
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {options.map((opt) => {
              const isSelected = selected === opt.id
              const isCorrectOpt = opt.id === current.id
              const showAsCorrect = revealed && isCorrectOpt
              const showAsWrong = revealed && isSelected && !isCorrectOpt

              return (
                <motion.button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  disabled={revealed}
                  whileTap={!revealed ? { scale: 0.98 } : {}}
                  animate={showAsWrong ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                  className="p-4 rounded-2xl text-start font-semibold"
                  style={{
                    background: showAsCorrect
                      ? 'rgba(34,197,94,0.16)'
                      : showAsWrong
                      ? 'rgba(239,68,68,0.16)'
                      : 'var(--vc-surface)',
                    border: showAsCorrect
                      ? '1.5px solid rgba(34,197,94,0.5)'
                      : showAsWrong
                      ? '1.5px solid rgba(239,68,68,0.5)'
                      : '1px solid var(--vc-border)',
                    color: 'var(--vc-text)',
                    cursor: revealed ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div className="flex items-center justify-between" dir="ltr">
                    <span className="vc-word">{opt.word}</span>
                    {showAsCorrect && <CheckCircle size={18} style={{ color: 'rgb(34,197,94)' }} />}
                    {showAsWrong && <X size={18} style={{ color: 'rgb(239,68,68)' }} />}
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Hint: play target word audio when revealed */}
          {revealed && current.audioUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center mt-4"
            >
              <button
                type="button"
                onClick={() => playAudio(current.audioUrl)}
                className="vc-pill vc-card-hover"
              >
                <Volume2 size={14} />
                استمعي للنطق
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
