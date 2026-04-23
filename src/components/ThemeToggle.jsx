import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun, Sparkles, ChevronDown, Check } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'

const THEMES = [
  {
    key: 'deep-space',
    label: 'الفضاء',
    labelEn: 'Deep Space',
    icon: Moon,
    colors: ['#060e1c', '#0a1225', '#38bdf8', '#818cf8'],
  },
  {
    key: 'frost-white',
    label: 'الجليد',
    labelEn: 'Frost White',
    icon: Sun,
    colors: ['#f8f9fc', '#ffffff', '#6366f1', '#8b5cf6'],
  },
  {
    key: 'aurora',
    label: 'الشفق',
    labelEn: 'Aurora',
    icon: Sparkles,
    colors: ['#0c0a1d', '#1a1538', '#a78bfa', '#38bdf8'],
  },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = THEMES.find(t => t.key === theme) || THEMES[0]

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-subtle)' }}
      >
        <current.icon size={14} style={{ color: 'var(--accent-sky)' }} />
        <span className="text-xs font-medium hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
          {current.label}
        </span>
        <ChevronDown size={10} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--text-tertiary)' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full end-0 mt-2 w-52 rounded-xl overflow-hidden z-50 p-2 space-y-1"
            style={{
              background: 'var(--color-dropdown-bg)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {THEMES.map((t) => {
              const isActive = theme === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => { setTheme(t.key); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer"
                  style={{
                    background: isActive ? 'var(--glass-card-active)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--glass-card-hover)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Color preview */}
                  <div className="flex gap-0.5 shrink-0">
                    {t.colors.map((c, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full"
                        style={{ background: c, border: '1px solid rgba(128,128,128,0.2)' }}
                      />
                    ))}
                  </div>

                  <div className="flex-1 text-right">
                    <p className="text-xs font-semibold">{t.label}</p>
                    <p className="text-[10px] opacity-60 font-inter">{t.labelEn}</p>
                  </div>

                  {isActive && <Check size={14} style={{ color: 'var(--accent-sky)' }} />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
