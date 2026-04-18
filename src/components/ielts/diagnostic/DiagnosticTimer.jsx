import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'

export default function DiagnosticTimer({ initialSeconds, onExpire, onTick }) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const ref = useRef(seconds)
  ref.current = seconds

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(prev => {
        const next = prev - 1
        if (onTick) onTick(next)
        if (next <= 0) {
          clearInterval(id)
          if (onExpire) onExpire()
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const mins = Math.floor(Math.max(0, seconds) / 60)
  const secs = Math.max(0, seconds) % 60

  const color = seconds <= 60
    ? '#ef4444'
    : seconds <= 300
    ? '#fb923c'
    : '#4ade80'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 10,
      background: `${color}14`,
      border: `1px solid ${color}30`,
    }}>
      <Clock size={14} style={{ color, flexShrink: 0 }} />
      <span style={{ fontFamily: 'Tajawal', fontWeight: 700, fontSize: 15, color, fontVariantNumeric: 'tabular-nums' }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </span>
      {seconds <= 300 && seconds > 0 && (
        <span style={{ fontSize: 11, color, fontFamily: 'Tajawal' }}>
          {seconds <= 60 ? '⚠️ الوقت ينتهي!' : 'أسرع!'}
        </span>
      )}
    </div>
  )
}
