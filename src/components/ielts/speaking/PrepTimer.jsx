import { useState, useEffect, useRef } from 'react'

export default function PrepTimer({ durationSec = 60, onDone }) {
  const [remaining, setRemaining] = useState(durationSec)
  const ref = useRef(null)

  useEffect(() => {
    ref.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(ref.current)
          onDone?.()
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(ref.current)
  }, [onDone])

  const pct = ((durationSec - remaining) / durationSec) * 100

  return (
    <div style={{ padding: 20, borderRadius: 14, background: 'rgba(251,191,36,0.06)', border: '1.5px solid rgba(251,191,36,0.25)', textAlign: 'center' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', fontFamily: 'Tajawal', marginBottom: 12 }}>
        وقت التحضير
      </p>
      <div style={{ fontSize: 48, fontWeight: 900, color: remaining <= 10 ? '#ef4444' : '#fbbf24', fontFamily: 'Tajawal', lineHeight: 1, marginBottom: 12, fontVariantNumeric: 'tabular-nums' }}>
        {remaining}
      </div>
      <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 12 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#fbbf24', borderRadius: 6, transition: 'width 0.8s linear' }} />
      </div>
      <button
        onClick={() => { clearInterval(ref.current); onDone?.() }}
        style={{ padding: '8px 20px', borderRadius: 10, background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', fontFamily: 'Tajawal', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
      >
        تخطّ التحضير
      </button>
      <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', marginTop: 8 }}>
        دوّن ملاحظاتك — لن تُقيَّم
      </p>
    </div>
  )
}
