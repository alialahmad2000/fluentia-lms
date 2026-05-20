import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, CheckCircle, X } from 'lucide-react'
import { recordDrillAttempt } from '../../services/hardWords'

/**
 * Matching drill — 6 English words ↔ 6 shuffled Arabic meanings.
 * Tap one side, then the other side to pair. Correct pair locks green;
 * incorrect pair flashes red and resets.
 *
 * Each correct pair = 1 drill attempt logged.
 */
export default function MatchingDrill({ batch, studentId, onComplete }) {
  const primaries = batch?.primaryWords || []
  const [selectedEn, setSelectedEn] = useState(null) // vocabId
  const [selectedAr, setSelectedAr] = useState(null) // vocabId
  const [pairs, setPairs] = useState({}) // vocabId -> 'correct' | 'wrong'
  const [flashing, setFlashing] = useState(null) // { enId, arId }
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, promoted: 0 })
  const startTimeRef = useRef(Date.now())
  const cardStartRef = useRef(Date.now())

  // Shuffle the Arabic column once per mount (stable across renders)
  const shuffledArabic = useMemo(() => {
    const arr = [...primaries]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [primaries])

  const allDone = primaries.length > 0 && Object.keys(pairs).length === primaries.length
  const completedCount = Object.values(pairs).filter((s) => s === 'correct').length

  // Trigger session-complete one tick after all pairs done
  useEffect(() => {
    if (allDone) {
      const elapsedMs = Date.now() - startTimeRef.current
      onComplete?.({
        mode: 'matching',
        total: primaries.length,
        correct: sessionStats.correct,
        wrong: sessionStats.wrong,
        promoted: sessionStats.promoted,
        elapsedMs,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone])

  const playAudio = useCallback((url) => {
    if (!url) return
    try {
      const audio = new Audio(url)
      audio.play().catch(() => {})
    } catch {}
  }, [])

  const handleAttempt = useCallback(
    async (enWord, arWord) => {
      const isCorrect = enWord.vocabularyId === arWord.vocabularyId
      const responseMs = Date.now() - cardStartRef.current
      cardStartRef.current = Date.now()
      setFlashing({ enId: enWord.vocabularyId, arId: arWord.vocabularyId, isCorrect })

      // Optimistic UI lock for correct pair
      if (isCorrect) {
        setPairs((p) => ({ ...p, [enWord.vocabularyId]: 'correct' }))
      }

      try {
        const result = await recordDrillAttempt({
          studentId,
          vocabularyId: enWord.vocabularyId,
          drillMode: 'matching',
          isCorrect,
          responseMs,
        })
        setSessionStats((s) => ({
          correct: s.correct + (isCorrect ? 1 : 0),
          wrong: s.wrong + (isCorrect ? 0 : 1),
          promoted: s.promoted + (result.promoted ? 1 : 0),
        }))
      } catch (e) {
        // Log silently — UI continues
        // eslint-disable-next-line no-console
        console.warn('[hard-words] matching attempt log failed', e?.message || e)
      }

      // Clear flash after 600ms
      setTimeout(() => {
        setFlashing(null)
        setSelectedEn(null)
        setSelectedAr(null)
      }, isCorrect ? 350 : 700)
    },
    [studentId]
  )

  const handleEnglishTap = useCallback(
    (word) => {
      if (pairs[word.vocabularyId] === 'correct') return // already paired
      playAudio(word.audioUrl)
      if (selectedAr) {
        // Already have an Arabic selected — attempt the pair
        const arWord = primaries.find((w) => w.vocabularyId === selectedAr)
        if (arWord) {
          handleAttempt(word, arWord)
          return
        }
      }
      setSelectedEn(word.vocabularyId)
    },
    [pairs, primaries, selectedAr, playAudio, handleAttempt]
  )

  const handleArabicTap = useCallback(
    (word) => {
      if (pairs[word.vocabularyId] === 'correct') return
      if (selectedEn) {
        const enWord = primaries.find((w) => w.vocabularyId === selectedEn)
        if (enWord) {
          handleAttempt(enWord, word)
          return
        }
      }
      setSelectedAr(word.vocabularyId)
    },
    [pairs, primaries, selectedEn, handleAttempt]
  )

  const cardClass = (vocabId, side) => {
    if (pairs[vocabId] === 'correct') return 'paired-correct'
    if (flashing?.isCorrect === false && (flashing.enId === vocabId || flashing.arId === vocabId))
      return 'flash-wrong'
    if (side === 'en' && selectedEn === vocabId) return 'selected'
    if (side === 'ar' && selectedAr === vocabId) return 'selected'
    return 'idle'
  }

  if (!primaries.length) {
    return (
      <div className="text-center py-12">
        <p className="text-base font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
          لا توجد كلمات لهذا التدريب.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress strip */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
          {completedCount} / {primaries.length}
        </div>
        <div className="h-2 flex-1 mx-4 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, var(--accent-sky), var(--accent-emerald))' }}
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / primaries.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {/* English column */}
        <div className="space-y-2.5">
          <h3
            className="text-xs font-bold text-center mb-2 font-['Tajawal']"
            style={{ color: 'var(--text-tertiary)' }}
          >
            English
          </h3>
          {primaries.map((w) => (
            <DrillCard
              key={`en-${w.vocabularyId}`}
              state={cardClass(w.vocabularyId, 'en')}
              onClick={() => handleEnglishTap(w)}
            >
              <div className="flex items-center gap-2 justify-between" dir="ltr">
                <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {w.word}
                </span>
                {w.audioUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      playAudio(w.audioUrl)
                    }}
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)' }}
                    aria-label="استمع"
                  >
                    <Volume2 size={14} />
                  </button>
                )}
              </div>
            </DrillCard>
          ))}
        </div>

        {/* Arabic column */}
        <div className="space-y-2.5">
          <h3
            className="text-xs font-bold text-center mb-2 font-['Tajawal']"
            style={{ color: 'var(--text-tertiary)' }}
          >
            العربية
          </h3>
          {shuffledArabic.map((w) => (
            <DrillCard
              key={`ar-${w.vocabularyId}`}
              state={cardClass(w.vocabularyId, 'ar')}
              onClick={() => handleArabicTap(w)}
            >
              <span
                className="text-base font-semibold font-['Tajawal']"
                style={{ color: 'var(--text-primary)' }}
                dir="rtl"
              >
                {w.meaningAr || '—'}
              </span>
            </DrillCard>
          ))}
        </div>
      </div>

      {/* Wrong flash overlay */}
      <AnimatePresence>
        {flashing?.isCorrect === false && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-bold z-50 font-['Tajawal']"
            style={{
              background: 'rgba(239,68,68,0.95)',
              color: 'white',
              boxShadow: '0 8px 20px rgba(239,68,68,0.35)',
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <X size={16} /> غير صحيح — حاول مرة ثانية
            </span>
          </motion.div>
        )}
        {flashing?.isCorrect === true && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-bold z-50 font-['Tajawal']"
            style={{
              background: 'rgba(34,197,94,0.95)',
              color: 'white',
              boxShadow: '0 8px 20px rgba(34,197,94,0.35)',
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle size={16} /> ممتاز
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DrillCard({ state, children, onClick }) {
  const stateStyle = {
    idle: {
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      color: 'var(--text-primary)',
    },
    selected: {
      background: 'rgba(56,189,248,0.12)',
      border: '1.5px solid rgba(56,189,248,0.45)',
      transform: 'scale(0.98)',
    },
    'paired-correct': {
      background: 'rgba(34,197,94,0.12)',
      border: '1px solid rgba(34,197,94,0.4)',
      opacity: 0.7,
    },
    'flash-wrong': {
      background: 'rgba(239,68,68,0.18)',
      border: '1.5px solid rgba(239,68,68,0.5)',
    },
  }[state]

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={state === 'idle' ? { y: -2 } : {}}
      whileTap={state === 'idle' ? { scale: 0.98 } : {}}
      animate={state === 'flash-wrong' ? { x: [0, -6, 6, -4, 4, 0] } : {}}
      transition={{ duration: 0.4 }}
      className="w-full p-3 md:p-4 rounded-xl text-start cursor-pointer transition-colors"
      style={{
        ...stateStyle,
        minHeight: 56,
        outline: 'none',
      }}
      disabled={state === 'paired-correct'}
    >
      {children}
    </motion.button>
  )
}
