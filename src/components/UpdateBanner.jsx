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

  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister())
      })
    }
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(n => caches.delete(n))
      })
    }
    fetch('/version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        localStorage.setItem('app_version', data.version)
        window.location.reload(true)
      })
      .catch(() => {
        window.location.reload(true)
      })
  }

  return (
    <AnimatePresence>
      {hasUpdate && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-sky-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between shadow-lg"
          dir="rtl"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🆕</span>
            <span className="text-sm font-medium font-['Tajawal']">يوجد تحديث جديد للموقع!</span>
          </div>
          <button
            onClick={handleUpdate}
            className="bg-white/20 hover:bg-white/30 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-colors font-['Tajawal']"
          >
            تحديث الآن ↻
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
