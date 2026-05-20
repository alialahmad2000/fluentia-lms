import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, RotateCcw, CheckCircle, X } from 'lucide-react'
import { recordDrillAttempt } from '../../services/hardWords'

/**
 * Listening drill — audio of the target word plays, student picks the
 * matching English word from 4 options (target + 3 distractors).
 *
 * Auto-plays on card load when srs_autoplay_audio is enabled on the profile.
 * Replay button always present.
 */
export default function ListeningDrill({ batch, studentId, onComplete, autoplay = true }) {
  const primaries = batch?.primaryWords || []
  const distractorPool = batch?.distractorWords || []
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0, promoted: 0 })
  const sessionStartRef = useRef(Date.now())
  const cardStartRef = useRef(Date.now())
  const audioRef = useRef(null)

  const current = primaries[index]
  const isLast = index >= primaries.length - 1

  const options = useMemo(() => {
    if (!current) return []
    const pool = distractorPool.filter(
      (d) => d.vocabularyId !== current.vocabularyId && d.audioUrl // distractors need audio for fairness
    )
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
  }, [current?.vocabularyId])

  // Reset card state + autoplay
  useEffect(() => {
    cardStartRef.current = Date.now()
    setSelected(null)
    setRevealed(false)
    if (autoplay && current?.audioUrl) {
      try {
        audioRef.current = new Audio(current.audioUrl)
        audioRef.current.play().catch(() => {})
      } catch {}
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const replay = useCallback(() => {
    if (!current?.audioUrl) return
    try {
      audioRef.current = new Audio(current.audioUrl)
      audioRef.current.play().catch(() => {})
    } catch {}
  }, [current])

  const handleSelect = useCallback(
    async (option) => {
      if (revealed) return
      const isCorrect = option.vocabularyId === current.vocabularyId
      const responseMs = Date.now() - cardStartRef.current
      setSelected(option.vocabularyId)
      setRevealed(true)

      try {
        const result = await recordDrillAttempt({
          studentId,
          vocabularyId: current.vocabularyId,
          drillMode: 'listening',
          isCorrect,
          responseMs,
        })
        setSessionStats((s) => ({
          correct: s.correct + (isCorrect ? 1 : 0),
          wrong: s.wrong + (isCorrect ? 0 : 1),
          promoted: s.promoted + (result.promoted ? 1 : 0),
        }))
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[hard-words] listening attempt log failed', e?.message || e)
      }

      setTimeout(() => {
        if (isLast) {
          onComplete?.({
            mode: 'listening',
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
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold font-['Tajawal']" style={{ color: 'var(--text-secondary)' }}>
          {index + 1} / {primaries.length}
        </div>
        <div className="h-2 flex-1 mx-4 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
          <motion.div
            className="h-full"
            style={{ background: 'linear-gradient(90deg, var(--accent-sky), var(--accent-emerald))' }}
            initial={{ width: 0 }}
            animate={{ width: `${((index + 1) / primaries.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.vocabularyId}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25 }}
        >
          {/* Audio card — large play button */}
          <div
            className="p-8 rounded-3xl mb-6 flex flex-col items-center"
            style={{
              background:
                'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(168,85,247,0.06))',
              border: '1px solid var(--border)',
            }}
          >
            <span
              className="text-xs font-bold font-['Tajawal'] mb-4"
              style={{ color: 'var(--text-tertiary)' }}
            >
              استمع للكلمة:
            </span>
            <motion.button
              type="button"
              onClick={replay}
              whileTap={{ scale: 0.95 }}
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(135deg, rgb(56,189,248), rgb(99,102,241))',
                color: 'white',
                boxShadow: '0 12px 30px rgba(56,189,248,0.35)',
              }}
              aria-label="استمع للكلمة"
            >
              <Volume2 size={32} />
            </motion.button>
            <button
              type="button"
              onClick={replay}
              className="mt-4 px-3 py-1.5 rounded-full text-xs font-bold font-['Tajawal'] inline-flex items-center gap-1.5"
              style={{
                background: 'var(--surface)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border)',
              }}
            >
              <RotateCcw size={12} />
              إعادة
            </button>
          </div>

          {/* Options — English words only */}
          <div className="grid grid-cols-2 gap-3">
            {options.map((opt) => {
              const isSelected = selected === opt.vocabularyId
              const isCorrectOpt = opt.vocabularyId === current.vocabularyId
              const showAsCorrect = revealed && isCorrectOpt
              const showAsWrong = revealed && isSelected && !isCorrectOpt
              return (
                <motion.button
                  key={opt.vocabularyId}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  disabled={revealed}
                  whileTap={!revealed ? { scale: 0.98 } : {}}
                  animate={showAsWrong ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                  className="p-4 rounded-xl font-semibold text-center"
                  style={{
                    background: showAsCorrect
                      ? 'rgba(34,197,94,0.16)'
                      : showAsWrong
                      ? 'rgba(239,68,68,0.16)'
                      : 'var(--surface)',
                    border: showAsCorrect
                      ? '1.5px solid rgba(34,197,94,0.5)'
                      : showAsWrong
                      ? '1.5px solid rgba(239,68,68,0.5)'
                      : '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    cursor: revealed ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div className="flex items-center justify-center gap-2" dir="ltr">
                    <span>{opt.word}</span>
                    {showAsCorrect && <CheckCircle size={16} style={{ color: 'rgb(34,197,94)' }} />}
                    {showAsWrong && <X size={16} style={{ color: 'rgb(239,68,68)' }} />}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
