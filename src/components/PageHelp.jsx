import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, X, ChevronDown } from 'lucide-react'
import { PAGE_HELP } from '../config/pageHelpRegistry'
import { useAuthStore } from '../stores/authStore'

const SEEN_KEY = 'fluentia_seen_page_help'

function getSeenMap() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') } catch { return {} }
}
function markSeen(pageKey) {
  try {
    const m = getSeenMap()
    m[pageKey] = true
    localStorage.setItem(SEEN_KEY, JSON.stringify(m))
  } catch {}
}

export default function PageHelp({ pageKey }) {
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(() => !!getSeenMap()[pageKey])
  const panelRef = useRef(null)
  const { profile } = useAuthStore()
  const role = profile?.role

  const entry = PAGE_HELP[pageKey]
  if (!entry || (!entry.summary && !entry.sections?.length)) return null

  const dismiss = () => {
    setOpen(false)
    if (!seen) { markSeen(pageKey); setSeen(true) }
  }

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current?.contains(e.target)) return
      dismiss()
    }
    const t = setTimeout(() => document.addEventListener('pointerdown', handler), 100)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', handler) }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const roleExtra = role && entry.rolesExtra?.[role]

  return createPortal(
    <>
      {/* Floating help button — bottom-left */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed z-50 flex items-center gap-1.5 rounded-full px-3 py-2 transition-all hover:scale-105"
        style={{
          bottom: 20, left: 20,
          background: 'rgba(30,41,59,0.9)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        <div className="relative">
          <HelpCircle size={16} className="text-sky-400" />
          {!seen && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          )}
        </div>
        <span className="text-xs font-bold text-white/60 font-['Tajawal'] hidden sm:inline">شرح</span>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop on mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[55] bg-black/40 sm:hidden"
              onClick={dismiss}
            />
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, x: -20, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -20, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed z-[56] overflow-y-auto"
              style={{
                bottom: 68, left: 20,
                width: 'min(340px, calc(100vw - 40px))',
                maxHeight: 'min(480px, calc(100vh - 100px))',
                background: 'rgba(15,23,42,0.97)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 16,
                backdropFilter: 'blur(20px)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
              }}
            >
              {/* Header */}
              <div className="sticky top-0 flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/5" style={{ background: 'inherit', borderRadius: '16px 16px 0 0' }}>
                <h3 className="text-sm font-bold text-white font-['Tajawal']" dir="rtl">{entry.title}</h3>
                <button onClick={dismiss} className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
                  <X size={14} />
                </button>
              </div>

              <div className="px-4 py-3 space-y-4" dir="rtl">
                {/* Summary */}
                {entry.summary && (
                  <p className="text-xs text-white/50 font-['Tajawal'] leading-relaxed">{entry.summary}</p>
                )}

                {/* Sections */}
                {entry.sections.map((sec, si) => (
                  <div key={si} className="space-y-1.5">
                    <h4 className="text-xs font-bold text-sky-400 font-['Tajawal']">{sec.heading}</h4>
                    <ul className="space-y-1">
                      {sec.items.map((item, ii) => (
                        <li key={ii} className="flex gap-2 text-xs text-white/60 font-['Tajawal'] leading-relaxed">
                          <span className="text-white/20 flex-shrink-0 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {/* Role-specific */}
                {roleExtra && (
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <h4 className="text-xs font-bold text-amber-400 font-['Tajawal']">{roleExtra.heading}</h4>
                    <ul className="space-y-1">
                      {roleExtra.items.map((item, ii) => (
                        <li key={ii} className="flex gap-2 text-xs text-white/60 font-['Tajawal'] leading-relaxed">
                          <span className="text-amber-400/30 flex-shrink-0 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Dismiss button */}
              <div className="sticky bottom-0 px-4 py-3 border-t border-white/5" style={{ background: 'inherit', borderRadius: '0 0 16px 16px' }}>
                <button
                  onClick={dismiss}
                  className="w-full py-2 rounded-lg text-xs font-bold font-['Tajawal'] text-sky-400 bg-sky-500/10 hover:bg-sky-500/15 transition-colors"
                >
                  فهمت ✓
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>,
    document.body
  )
}
