import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { useLocation } from 'react-router-dom'
import { refreshAppSession } from '@/lib/refreshAppSession'
import { useActiveExamAttempt } from '@/hooks/useActiveExamAttempt'

const POLL_INTERVAL_MS = 60_000      // 60s + on-focus

// SILENT auto-update (owner directive 2026-06-04): detect a new deploy and apply
// it TRANSPARENTLY — no banner, no button, no countdown.
//
// CRITICAL: a student must NEVER be reloaded in the middle of an activity —
// writing, reading, a listening exercise with questions, a quiz, a unit
// assessment, or a mock exam. Yanking them off the page would lose their work.
// So the update is applied ONLY at a SAFE boundary: the next time the student
// NAVIGATES to a different page (a different route — a natural break where they
// are already leaving the current screen). Switching tabs/activities *within* a
// unit (same route, only the ?activity= query changes) does NOT trigger it.
// The student is never interrupted; they simply land on the next page already
// running the latest build. (Renders null — kept mounted so the existing mount
// points in LayoutShell / TrainerLayout don't need to change.)
function UpdateBanner() {
  const location = useLocation()
  const isExamActive = useActiveExamAttempt()
  const [pendingUpdate, setPendingUpdate] = useState(false)
  const lastPathRef = useRef(location.pathname)

  const applyUpdate = useCallback((toPath) => {
    // Clear stored version so we re-baseline against the fresh build after reload.
    try { localStorage.removeItem('app_version') } catch {}
    // Keep the student logged in and send them to the page they were navigating
    // to; refreshAppSession purges caches + the service worker so fresh code is
    // guaranteed.
    refreshAppSession({ redirectTo: toPath, keepAuth: true })
  }, [])

  // Poll /version.json on an interval + whenever the tab regains focus.
  // This only FLAGS that a new build exists — it never reloads here.
  useEffect(() => {
    let cancelledEffect = false
    const check = async () => {
      if (document.hidden) return
      try {
        const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' })
        if (!res.ok) return
        const remote = await res.json()
        if (cancelledEffect || !remote?.version) return
        const local = localStorage.getItem('app_version')
        if (!local) {
          localStorage.setItem('app_version', remote.version)
          return
        }
        if (local !== remote.version) setPendingUpdate(true)
      } catch {
        // network blip — try next interval
      }
    }
    check()
    const id = setInterval(check, POLL_INTERVAL_MS)
    const onVisibility = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelledEffect = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // Apply the pending update ONLY when the route's pathname changes — i.e. the
  // student left the current screen for a different one. A mid-activity tab/query
  // change (same pathname) is ignored, and mid mock-exam is deferred entirely.
  useEffect(() => {
    const prevPath = lastPathRef.current
    const nextPath = location.pathname
    if (prevPath === nextPath) return        // same page (or only ?activity= changed) → never interrupt
    lastPathRef.current = nextPath
    if (pendingUpdate && !isExamActive) {
      applyUpdate(nextPath + location.search)
    }
  }, [location.pathname, location.search, pendingUpdate, isExamActive, applyUpdate])

  return null
}

export default memo(UpdateBanner)
