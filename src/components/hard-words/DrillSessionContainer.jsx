import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useAuthProfile } from '../../stores/authStore'
import { useBodyLock } from '../../hooks/useBodyLock'
import {
  selectDrillBatch,
  DRILL_MODE_AR,
} from '../../services/hardWords'
import MatchingDrill from './MatchingDrill'
import ContextFillDrill from './ContextFillDrill'
import ListeningDrill from './ListeningDrill'
import TypingRecallDrill from './TypingRecallDrill'
import HardWordsSessionComplete from './HardWordsSessionComplete'

/**
 * Full-screen drill session.
 * Props:
 *   mode: 'matching' | 'context_fill' | 'listening' | 'typing_recall'
 *   onClose: () => void   // close without finishing
 */
export default function DrillSessionContainer({ mode, onClose, autoplay = true }) {
  const profile = useAuthProfile()
  const studentId = profile?.id
  const queryClient = useQueryClient()
  const [sessionResult, setSessionResult] = useState(null) // set on complete
  const [closing, setClosing] = useState(false)

  useBodyLock(true)

  const { data: batch, isLoading, error } = useQuery({
    queryKey: ['hard-words', 'drill-batch', studentId, mode],
    queryFn: () => selectDrillBatch(studentId, mode),
    enabled: !!studentId && !!mode,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })

  const handleComplete = useCallback(
    (result) => {
      setSessionResult(result)
      // Invalidate dashboard queries so counts/breakdown refresh
      queryClient.invalidateQueries({ queryKey: ['hard-words'] })
    },
    [queryClient]
  )

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => onClose?.(), 240)
  }, [onClose])

  const handleBackToDashboard = useCallback(() => {
    handleClose()
  }, [handleClose])

  const handleRestart = useCallback(() => {
    setSessionResult(null)
    queryClient.invalidateQueries({ queryKey: ['hard-words', 'drill-batch', studentId, mode] })
  }, [queryClient, studentId, mode])

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

  return (
    <AnimatePresence>
      {!closing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] overflow-y-auto"
          style={{
            background: 'var(--bg-overlay, rgba(6,14,28,0.96))',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div className="min-h-screen px-4 md:px-8 py-6 md:py-10 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between max-w-3xl mx-auto w-full mb-6">
              <h2
                className="text-lg md:text-xl font-bold font-['Tajawal']"
                style={{ color: 'var(--text-primary)' }}
              >
                {DRILL_MODE_AR[mode] || 'تدريب'}
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: 'var(--surface)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="max-w-3xl mx-auto w-full flex-1">
              {isLoading && <DrillSkeleton />}
              {error && (
                <div
                  className="p-6 rounded-xl text-center font-['Tajawal']"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    color: 'rgb(239,68,68)',
                    border: '1px solid rgba(239,68,68,0.25)',
                  }}
                >
                  حدث خطأ أثناء تحميل التدريب. حاول مرة ثانية.
                </div>
              )}
              {!isLoading && !error && batch && !sessionResult && Drill && (
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
                  onBack={handleBackToDashboard}
                  onRestart={handleRestart}
                />
              )}
              {!isLoading && !error && batch && batch.primaryWords.length === 0 && !sessionResult && (
                <div
                  className="p-8 rounded-2xl text-center font-['Tajawal']"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <p className="text-base mb-4" style={{ color: 'var(--text-primary)' }}>
                    ما عندك كلمات صعبة كافية لهذا التدريب الآن.
                  </p>
                  <button
                    type="button"
                    onClick={handleBackToDashboard}
                    className="px-5 py-2 rounded-xl font-bold"
                    style={{
                      background: 'var(--surface-raised)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border)',
                    }}
                  >
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

function DrillSkeleton() {
  return (
    <div className="space-y-4">
      <div
        className="h-2 rounded-full"
        style={{ background: 'var(--surface)' }}
      />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-xl animate-pulse"
            style={{ background: 'var(--surface)' }}
          />
        ))}
      </div>
    </div>
  )
}
