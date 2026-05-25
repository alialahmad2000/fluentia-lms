import { useEffect, useState, useCallback } from 'react'

const HEARTBEAT_INTERVAL_MS = 30_000
const HEARTBEAT_TIMEOUT_MS = 5_000

// Layer 5 (auto-recovery): combine navigator.onLine with a lightweight 30s
// heartbeat to /version.json so the student knows when *their* connection is
// the problem (vs. a silent stall).
export function useNetworkStatus() {
  const [browserOnline, setBrowserOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [serverReachable, setServerReachable] = useState(true)
  const [lastCheckAt, setLastCheckAt] = useState(null)

  const heartbeat = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setServerReachable(false)
      return
    }
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), HEARTBEAT_TIMEOUT_MS)
      const res = await fetch(`/version.json?_hb=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timer)
      setServerReachable(res.ok)
      setLastCheckAt(new Date())
    } catch {
      setServerReachable(false)
      setLastCheckAt(new Date())
    }
  }, [])

  useEffect(() => {
    const onOnline = () => { setBrowserOnline(true); heartbeat() }
    const onOffline = () => { setBrowserOnline(false); setServerReachable(false) }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    heartbeat()
    const interval = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      clearInterval(interval)
    }
  }, [heartbeat])

  return {
    browserOnline,
    serverReachable,
    isHealthy: browserOnline && serverReachable,
    lastCheckAt,
    recheck: heartbeat,
  }
}
