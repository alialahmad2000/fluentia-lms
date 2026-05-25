import { useState, useEffect, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { refreshAppSession } from '@/lib/refreshAppSession'
import { useActiveExamAttempt } from '@/hooks/useActiveExamAttempt'

const POLL_INTERVAL_MS = 60_000      // was 5 min — now 60s + on-focus
const COUNTDOWN_SECONDS = 10

// Layer 1 (auto-recovery): detect a new deploy and apply it with zero manual
// browser action. During an active mock exam the update is DEFERRED (a calm
// banner, no reload) so a student mid-exam is never interrupted.
function UpdateBanner() {
  const isExamActive = useActiveExamAttempt()
  const [hasUpdate, setHasUpdate] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [countdown, setCountdown] = useState(null)

  const applyUpdate = useCallback(() => {
    setUpdating(true)
    // Clear stored version so the banner doesn't re-trigger after reload.
    try { localStorage.removeItem('app_version') } catch {}
    // Soft update: keep the student logged in + keep them on the current page;
    // refreshAppSession purges caches + SW so fresh code is guaranteed.
    refreshAppSession({
      redirectTo: window.location.pathname + window.location.search,
      keepAuth: true,
    })
  }, [])

  // Poll /version.json on an interval + whenever the tab regains focus.
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
        if (local !== remote.version) setHasUpdate(true)
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

  // When an update is available, not deferred, and not cancelled → 10s auto-apply.
  useEffect(() => {
    if (!hasUpdate || isExamActive || cancelled) {
      setCountdown(null)
      return
    }
    setCountdown(COUNTDOWN_SECONDS)
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c === null) return null
        if (c <= 1) { clearInterval(id); applyUpdate(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [hasUpdate, isExamActive, cancelled, applyUpdate])

  if (!hasUpdate || cancelled) return null

  const deferred = isExamActive

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className="fixed left-0 right-0 z-[9999] flex items-center justify-between shadow-lg"
        dir="rtl"
        style={{
          top: 0,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          paddingBottom: '12px',
          paddingLeft: '16px',
          paddingRight: '16px',
          background: deferred
            ? 'linear-gradient(to left, rgb(120,87,16), rgb(146,64,14))'
            : 'linear-gradient(to left, rgb(2,132,199), rgb(79,70,229))',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{deferred ? '✨' : '🆕'}</span>
          <span className="text-sm font-medium font-['Tajawal'] text-white">
            {deferred
              ? 'نسخة جديدة جاهزة — ستُطبَّق تلقائياً بعد انتهاء اختبارك'
              : countdown != null
                ? `نسخة محسّنة متاحة — جاري التطبيق خلال ${countdown} ثانية...`
                : 'يوجد تحديث جديد للموقع!'}
          </span>
        </div>
        {!deferred && (
          <div className="flex items-center gap-2">
            <button
              onClick={applyUpdate}
              disabled={updating}
              className="bg-white/20 hover:bg-white/30 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-colors font-['Tajawal'] min-h-[44px] disabled:opacity-70"
            >
              {updating ? 'جاري التحديث...' : 'تطبيق الآن ↻'}
            </button>
            <button
              onClick={() => setCancelled(true)}
              disabled={updating}
              className="text-white/80 hover:text-white text-sm px-3 py-1.5 font-['Tajawal'] min-h-[44px]"
            >
              لاحقاً
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export default memo(UpdateBanner)
