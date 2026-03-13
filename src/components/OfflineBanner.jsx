import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'

/**
 * OfflineBanner
 * Renders a fixed banner at the very top of the viewport.
 *   - Amber/yellow  → offline warning
 *   - Emerald       → briefly shown on reconnect
 * Automatically hides 2.5 s after the connection is restored.
 */
export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  // 'offline' | 'reconnected' | 'hidden'
  const [phase, setPhase] = useState(() =>
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'hidden'
  )

  useEffect(() => {
    let hideTimer = null

    function handleOffline() {
      if (hideTimer) clearTimeout(hideTimer)
      setIsOnline(false)
      setPhase('offline')
    }

    function handleOnline() {
      setIsOnline(true)
      setPhase('reconnected')
      hideTimer = setTimeout(() => setPhase('hidden'), 2500)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [])

  const visible = phase === 'offline' || phase === 'reconnected'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={phase}
          dir="rtl"
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={[
            'fixed top-0 inset-x-0 z-[9999]',
            'flex items-center justify-center gap-2',
            'px-4 py-2 text-sm font-semibold select-none',
            phase === 'offline'
              ? 'bg-amber-400 text-amber-950'
              : 'bg-emerald-500 text-white',
          ].join(' ')}
          role="status"
          aria-live="polite"
        >
          {phase === 'offline' ? (
            <>
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>أنت غير متصل بالإنترنت</span>
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 shrink-0" />
              <span>تم الاتصال!</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
