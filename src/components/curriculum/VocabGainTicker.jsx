import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

/**
 * Floating toast bottom-left whenever a word enters the student's dictionary.
 * Mounted once globally in LayoutShell (not per-page).
 * Listens for: window event 'fluentia:vocab-added' with detail { word, context? }
 */
export default function VocabGainTicker() {
  const isImpersonating = useAuthStore(s => s.isImpersonating)
  const [queue, setQueue] = useState([])

  useEffect(() => {
    if (isImpersonating) return
    const handler = (e) => {
      const word = e.detail?.word
      if (!word) return
      const id = Date.now() + Math.random()
      setQueue(q => [...q, { id, word }])
      setTimeout(() => setQueue(q => q.filter(t => t.id !== id)), 3500)
    }
    window.addEventListener('fluentia:vocab-added', handler)
    return () => window.removeEventListener('fluentia:vocab-added', handler)
  }, [isImpersonating])

  if (isImpersonating) return null

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '16px',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {queue.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: -40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 16px',
              borderRadius: '14px',
              background: 'linear-gradient(90deg, rgba(74,222,128,0.15), rgba(56,189,248,0.08))',
              border: '1px solid rgba(74,222,128,0.25)',
              color: 'rgba(248,250,252,0.95)',
              fontFamily: "'Tajawal', sans-serif",
              fontSize: '13px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <Plus size={14} color="#4ade80" />
            <span>كلمة جديدة في قاموسكِ: <strong>{t.word}</strong></span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
