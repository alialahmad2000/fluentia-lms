import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useAuthProfile } from '../../stores/authStore'
import { useBodyLock } from '../../hooks/useBodyLock'
import { DRILL_MODE_AR, buildBatchFromCards } from './hardWordsBatch'
import MatchingDrill from './MatchingDrill'
import ContextFillDrill from './ContextFillDrill'
import ListeningDrill from './ListeningDrill'
import TypingRecallDrill from './TypingRecallDrill'
import HardWordsSessionComplete from './HardWordsSessionComplete'

/**
 * Full-screen drill session, scoped to the constellation world.
 * Props:
 *   mode: 'matching' | 'context_fill' | 'listening' | 'typing_recall'
 *   cards: VocabCardWithContent[]   // hard cards from getHardWords (unified store)
 *   onClose: () => void
 *   autoplay: boolean
 */
export default function DrillSessionContainer({ mode, cards, onClose, autoplay = true }) {
  const profile = useAuthProfile()
  const studentId = profile?.id
  const queryClient = useQueryClient()
  const [sessionResult, setSessionResult] = useState(null)
  const [closing, setClosing] = useState(false)
  // Bump to reshape a fresh batch on "restart".
  const [batchSeed, setBatchSeed] = useState(0)

  useBodyLock(true)

  // Build the batch from the unified-store cards (no extra fetch).
  const batch = useMemo(
    () => buildBatchFromCards(cards, mode),
    // batchSeed forces a new shuffle/sample on restart
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, mode, batchSeed]
  )

  const handleComplete = useCallback(
    (result) => {
      setSessionResult(result)
      // Refresh dashboard counts/cards + stats after a session.
      queryClient.invalidateQueries({ queryKey: ['hard-words'] })
      queryClient.invalidateQueries({ queryKey: ['vocab-stats'] })
    },
    [queryClient]
  )

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => onClose?.(), 240)
  }, [onClose])

  const handleRestart = useCallback(() => {
    setSessionResult(null)
    setBatchSeed((s) => s + 1)
  }, [])

  const Drill = useMemo(() => {
    switch (mode) {
      case 'matching':
        return MatchingDrill
      case 'context_fill':
        return ContextFillDrill
      case 'listening':
        return ListeningDrill
      case 'typing_recall':
        return TypingRecallDrill
      default:
        return null
    }
  }, [mode])

  const hasWords = (batch?.primaryWords?.length ?? 0) > 0

  return (
    <AnimatePresence>
      {!closing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          dir="rtl"
          className="vocab-cosmos fixed inset-0 z-[60] overflow-y-auto"
          style={{
            background: 'radial-gradient(130% 85% at 50% -10%, var(--vc-field), var(--vc-void) 78%)',
          }}
        >
          <div
            className="min-h-[100dvh] px-4 md:px-8 py-6 md:py-10 flex flex-col"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.5rem)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between max-w-3xl mx-auto w-full mb-6">
              <h2 className="text-lg md:text-xl font-bold" style={{ color: 'var(--vc-text)' }}>
                {DRILL_MODE_AR[mode] || 'تدريب'}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="vc-pill vc-card-hover"
                style={{ padding: '0.55rem' }}
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="max-w-3xl mx-auto w-full flex-1">
              {!sessionResult && hasWords && Drill && (
                <Drill
                  batch={batch}
                  studentId={studentId}
                  autoplay={autoplay}
                  onComplete={handleComplete}
                />
              )}
              {sessionResult && (
                <HardWordsSessionComplete
                  result={sessionResult}
                  onBack={handleClose}
                  onRestart={handleRestart}
                />
              )}
              {!sessionResult && !hasWords && (
                <div className="vc-card p-8 text-center">
                  <p className="text-base mb-4" style={{ color: 'var(--vc-text)' }}>
                    ما عندك كلمات صعبة كافية لهذا التدريب الآن.
                  </p>
                  <button type="button" onClick={handleClose} className="vc-btn vc-btn-ghost">
                    عودة
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
