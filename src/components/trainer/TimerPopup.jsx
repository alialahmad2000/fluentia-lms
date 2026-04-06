import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, Play, Pause, RotateCcw } from 'lucide-react'
import useClassMode from '../../stores/classModeStore'
import { sounds } from '../../lib/celebrations'

const PRESETS = [
  { label: '١ دقيقة', seconds: 60 },
  { label: '٣ دقائق', seconds: 180 },
  { label: '٥ دقائق', seconds: 300 },
  { label: '١٠ دقائق', seconds: 600 },
]

export default function TimerPopup({ onClose }) {
  const {
    timerSeconds, timerRunning, timerVisible,
    setTimer, setTimerRunning, setTimerVisible,
  } = useClassMode()
  const [remaining, setRemaining] = useState(timerSeconds)
  const intervalRef = useRef(null)
  const displayRef = useRef(null)

  // Sync remaining from store on mount
  useEffect(() => {
    setRemaining(timerSeconds)
  }, [timerSeconds])

  // Timer interval — updates DOM directly for performance
  useEffect(() => {
    if (!timerRunning || remaining <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timerRunning && remaining <= 0) {
        setTimerRunning(false)
        try { sounds.achievement() } catch {}
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1
        setTimer(next)
        if (displayRef.current) {
          const mins = Math.floor(next / 60)
          const secs = next % 60
          displayRef.current.textContent = `${mins}:${String(secs).padStart(2, '0')}`
        }
        if (next <= 0) {
          setTimerRunning(false)
          clearInterval(intervalRef.current)
          try { sounds.achievement() } catch {}
        }
        return next
      })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [timerRunning, remaining, setTimer, setTimerRunning])

  const selectPreset = (seconds) => {
    setTimer(seconds)
    setRemaining(seconds)
    setTimerRunning(false)
  }

  const toggleRunning = () => {
    if (remaining <= 0) return
    setTimerRunning(!timerRunning)
  }

  const reset = () => {
    setTimerRunning(false)
    setTimer(0)
    setRemaining(0)
  }

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-[72px] left-4 right-4 sm:left-auto sm:right-4 sm:w-[300px] z-[65] rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(20px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>⏱</span> تايمر النشاط
        </h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
          <X size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.seconds}
              onClick={() => selectPreset(p.seconds)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all"
              style={{
                background: remaining === p.seconds && !timerRunning ? 'var(--accent-sky-glow)' : 'var(--surface-overlay)',
                color: remaining === p.seconds && !timerRunning ? 'var(--accent-sky)' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Display */}
        <div className="text-center py-4">
          <p
            ref={displayRef}
            className="text-4xl font-bold font-data tabular-nums"
            style={{ color: remaining <= 30 && remaining > 0 ? '#f87171' : 'var(--text-primary)' }}
          >
            {mins}:{String(secs).padStart(2, '0')}
          </p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>
            {timerRunning ? 'جاري العد...' : remaining > 0 ? 'جاهز' : 'اختر وقت'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={toggleRunning}
            disabled={remaining <= 0}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
            style={{
              background: timerRunning ? 'rgba(245,158,11,0.15)' : 'var(--accent-sky-glow)',
              border: `1px solid ${timerRunning ? 'rgba(245,158,11,0.3)' : 'rgba(56,189,248,0.3)'}`,
              color: timerRunning ? '#fbbf24' : 'var(--accent-sky)',
            }}
          >
            {timerRunning ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <button
            onClick={reset}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Show on screen toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={timerVisible}
            onChange={(e) => setTimerVisible(e.target.checked)}
            className="accent-sky-500"
          />
          <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            عرض التايمر على الشاشة (يشوفه الطلاب)
          </span>
        </label>
      </div>
    </motion.div>
  )
}
