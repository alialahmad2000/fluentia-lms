import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { ADMIN_UUIDS } from './constants'

const HINT_KEY = 'fluentia-theme-hint-seen'

export default function ThemeOnboardingHint() {
  const user = useAuthStore((s) => s.user)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    // Don't show for admin
    if (ADMIN_UUIDS.includes(user.id)) return
    // Already seen
    try { if (localStorage.getItem(HINT_KEY)) return } catch { return }

    const timer = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(timer)
  }, [user?.id])

  useEffect(() => {
    if (!show) return
    const dismiss = () => {
      setShow(false)
      try { localStorage.setItem(HINT_KEY, '1') } catch {}
    }
    // Auto-dismiss after 4s
    const t = setTimeout(dismiss, 4000)
    // Dismiss on any click
    document.addEventListener('click', dismiss, { once: true })
    return () => {
      clearTimeout(t)
      document.removeEventListener('click', dismiss)
    }
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="fixed z-[10000] pointer-events-none"
          style={{
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <div
            className="px-4 py-2.5 rounded-xl text-[13px] font-medium font-['Tajawal']"
            style={{
              background: 'var(--ds-bg-elevated, #0b0f18)',
              border: '1px solid var(--ds-accent-primary-glow, rgba(233,185,73,0.35))',
              color: 'var(--ds-text-primary, #faf5e6)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 20px var(--ds-accent-primary-glow, rgba(233,185,73,0.2))',
              direction: 'rtl',
              whiteSpace: 'nowrap',
            }}
          >
            🎨 جربي مظاهر مختلفة! اختاري اللي يريحك من أيقونة المظهر
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
