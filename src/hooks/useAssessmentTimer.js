import { useState, useEffect, useRef } from 'react'

/**
 * useAssessmentTimer — server-time-based countdown.
 *
 * @param {string|null} startedAt        ISO timestamp of when the attempt started
 * @param {number|null} timeLimitSeconds Total seconds allowed (from assessment config)
 * @param {() => void}  onExpire         Called once when remaining reaches 0
 * @returns {{ remainingSeconds:number, formatted:string, status:'idle'|'safe'|'warning'|'critical'|'final'|'expired' }}
 */
export function useAssessmentTimer(startedAt, timeLimitSeconds, onExpire) {
  const expiredRef = useRef(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!startedAt || !timeLimitSeconds) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [startedAt, timeLimitSeconds])

  if (!startedAt || !timeLimitSeconds) {
    return { remainingSeconds: 0, formatted: '--:--', status: 'idle' }
  }

  const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000
  const remaining = Math.max(0, Math.floor(timeLimitSeconds - elapsed))

  if (remaining === 0 && !expiredRef.current) {
    expiredRef.current = true
    if (typeof onExpire === 'function') {
      setTimeout(() => onExpire(), 0)
    }
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const formatted = `${mm}:${ss}`

  let status = 'safe'
  if (remaining === 0)        status = 'expired'
  else if (remaining <= 30)   status = 'final'
  else if (remaining <= 120)  status = 'critical'
  else if (remaining <= 300)  status = 'warning'

  return { remainingSeconds: remaining, formatted, status }
}
