import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

// Global event emitter for XP notifications
const xpListeners = new Set()
export function emitXP(amount, label) {
  xpListeners.forEach(fn => fn({ amount, label, id: Date.now() + Math.random() }))
}

export default function XPFloater() {
  const [floaters, setFloaters] = useState([])

  useEffect(() => {
    const handler = (data) => {
      setFloaters(prev => [...prev, data])
      setTimeout(() => {
        setFloaters(prev => prev.filter(f => f.id !== data.id))
      }, 1500)
    }
    xpListeners.add(handler)
    return () => xpListeners.delete(handler)
  }, [])

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] pointer-events-none">
      <AnimatePresence>
        {floaters.map(f => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.6 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="text-center mb-2"
          >
            <span
              className="inline-block px-4 py-2 rounded-full text-lg font-bold backdrop-blur-sm"
              style={{
                background: 'rgba(56,189,248,0.15)',
                border: '1px solid rgba(56,189,248,0.3)',
                color: 'var(--accent-sky, #38bdf8)',
              }}
            >
              +{f.amount} XP
            </span>
            {f.label && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)', opacity: 0.7 }}>{f.label}</p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
