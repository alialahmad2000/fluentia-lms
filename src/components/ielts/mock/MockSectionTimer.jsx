import { useEffect, useRef, useState } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'

// Strict timer: reconciles elapsed time from section_started_at on mount (resume-safe)
export default function MockSectionTimer({ sectionStartedAt, totalSeconds, onExpire, onTick }) {
  const computeRemaining = () => {
    if (!sectionStartedAt) return totalSeconds
    const elapsed = Math.floor((Date.now() - new Date(sectionStartedAt).getTime()) / 1000)
    return Math.max(0, totalSeconds - elapsed)
  }

  const [seconds, setSeconds] = useState(computeRemaining)
  const expiredRef = useRef(false)

  useEffect(() => {
    const remaining = computeRemaining()
    setSeconds(remaining)
    expiredRef.current = false

    const id = setInterval(() => {
      setSeconds(prev => {
        const next = prev - 1
        onTick?.(next)
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true
          clearInterval(id)
          onExpire?.()
          return 0
        }
        return Math.max(0, next)
      })
    }, 1000)
    return () => clearInterval(id)
  }, [sectionStartedAt, totalSeconds])

  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.max(0, seconds) % 60
  const urgent = seconds <= 120
  const warning = seconds <= 300 && !urgent
  const color = urgent ? '#ef4444' : warning ? '#fb923c' : '#4ade80'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 14px', borderRadius: 10,
      background: `${color}14`, border: `1px solid ${color}30`,
    }}>
      {urgent ? <AlertTriangle size={14} style={{ color, flexShrink: 0 }} /> : <Clock size={14} style={{ color, flexShrink: 0 }} />}
      <span style={{ fontFamily: 'Tajawal', fontWeight: 800, fontSize: 16, color, fontVariantNumeric: 'tabular-nums' }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
      {urgent && seconds > 0 && (
        <span style={{ fontSize: 11, color, fontFamily: 'Tajawal', fontWeight: 700 }}>ينتهي قريباً!</span>
      )}
      {warning && (
        <span style={{ fontSize: 11, color, fontFamily: 'Tajawal' }}>أسرع!</span>
      )}
    </div>
  )
}
