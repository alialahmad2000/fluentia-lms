import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ACTIONS = [
  { key: 'notes', icon: '📝', label: 'ملاحظاتي' },
  { key: 'bookmark', icon: '📌', label: 'علّم هنا' },
  { key: 'help', icon: '❓', label: 'ما فهمت' },
  { key: 'words', icon: '📚', label: 'كلماتي' },
]

export default function StudentFAB({ onNotes, onBookmark, onHelp, onWords }) {
  const [open, setOpen] = useState(false)
  const fabRef = useRef(null)

  // Close on tap outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (fabRef.current && !fabRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  const handleAction = (key) => {
    setOpen(false)
    switch (key) {
      case 'notes': onNotes?.(); break
      case 'bookmark': onBookmark?.(); break
      case 'help': onHelp?.(); break
      case 'words': onWords?.(); break
    }
  }

  return (
    <div ref={fabRef} className="fixed bottom-[calc(var(--bottom-nav-height,64px)+var(--sab)+16px)] lg:bottom-6 left-4 lg:left-6 z-40">
      {/* Action buttons */}
      <AnimatePresence>
        {open && (
          <div className="absolute bottom-16 left-0 flex flex-col gap-2 mb-2">
            {ACTIONS.map((action, i) => (
              <motion.button
                key={action.key}
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                transition={{ duration: 0.15, delay: i * 0.04 }}
                onClick={() => handleAction(action.key)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium font-['Tajawal'] whitespace-nowrap min-h-[44px] transition-colors"
                style={{
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(!open)}
        className="w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center shadow-lg transition-colors"
        style={{
          background: open ? 'var(--surface-raised)' : 'rgba(56,189,248,0.9)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: open ? 'var(--shadow-lg)' : '0 4px 20px rgba(56,189,248,0.3)',
        }}
      >
        <span className="text-lg">{open ? '✕' : '⚡'}</span>
      </motion.button>
    </div>
  )
}
