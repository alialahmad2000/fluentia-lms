import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function UpdateBanner() {
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' })
        const remote = await res.json()
        const local = localStorage.getItem('app_version')

        if (local && local !== remote.version) {
          setHasUpdate(true)
        }

        if (!local) {
          localStorage.setItem('app_version', remote.version)
        }
      } catch {}
    }

    check()
    const id = setInterval(check, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  const handleUpdate = async () => {
    // Unregister SWs and clear caches before reload
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations().catch(() => [])
      await Promise.all(regs.map(r => r.unregister())).catch(() => {})
    }
    if ('caches' in window) {
      const names = await caches.keys().catch(() => [])
      await Promise.all(names.map(n => caches.delete(n))).catch(() => {})
    }
    // Fetch latest version and save it BEFORE reloading to prevent re-triggering
    try {
      const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' })
      const data = await res.json()
      localStorage.setItem('app_version', data.version)
    } catch {
      // If fetch fails, remove stored version so it re-syncs on next load instead of looping
      localStorage.removeItem('app_version')
    }
    window.location.reload()
  }

  return (
    <AnimatePresence>
      {hasUpdate && (
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
            background: 'linear-gradient(to left, rgb(2,132,199), rgb(79,70,229))',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🆕</span>
            <span className="text-sm font-medium font-['Tajawal'] text-white">يوجد تحديث جديد للموقع!</span>
          </div>
          <button
            onClick={handleUpdate}
            className="bg-white/20 hover:bg-white/30 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-colors font-['Tajawal'] min-h-[44px] min-w-[44px]"
          >
            تحديث الآن ↻
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
