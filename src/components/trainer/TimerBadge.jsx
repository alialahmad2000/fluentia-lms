import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useClassMode from '../../stores/classModeStore'

export default function TimerBadge() {
  const { timerSeconds, timerRunning, timerVisible } = useClassMode()
  const displayRef = useRef(null)
  const [localRemaining, setLocalRemaining] = useState(timerSeconds)

  useEffect(() => {
    setLocalRemaining(timerSeconds)
  }, [timerSeconds])

  // Subscribe to timer changes
  useEffect(() => {
    if (!timerRunning || !timerVisible) return
    const interval = setInterval(() => {
      setLocalRemaining(useClassMode.getState().timerSeconds)
    }, 1000)
    return () => clearInterval(interval)
  }, [timerRunning, timerVisible])

  if (!timerVisible || !timerRunning || localRemaining <= 0) return null

  const mins = Math.floor(localRemaining / 60)
  const secs = localRemaining % 60
  const isUrgent = localRemaining <= 30

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[55] px-5 py-2.5 rounded-full ${isUrgent ? 'animate-pulse' : ''}`}
        style={{
          background: isUrgent ? 'rgba(239,68,68,0.15)' : 'rgba(56,189,248,0.1)',
          border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.3)' : 'rgba(56,189,248,0.2)'}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <span className="text-sm font-bold font-data tabular-nums" style={{ color: isUrgent ? '#f87171' : 'var(--accent-sky)' }}>
          ⏱ {mins}:{String(secs).padStart(2, '0')} متبقي
        </span>
      </motion.div>
    </AnimatePresence>
  )
}
