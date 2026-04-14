import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sparkles, Sun, Settings, Check } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { THEMES, DEFAULT_THEME } from './constants'
import { applyTheme, saveThemePreference } from './applyTheme'

const THEME_ICONS = {
  'night': Moon,
  'aurora-cinematic': Sparkles,
  'minimal': Sun,
}

// Reuse flash + toast from ThemeSwitcher pattern
const flash = () => {
  const el = document.createElement('div')
  el.style.cssText = `
    position:fixed;inset:0;z-index:99998;
    background:var(--ds-accent-primary,#38bdf8);
    opacity:0.12;pointer-events:none;
    transition:opacity 400ms cubic-bezier(0.22,1,0.36,1);
  `
  document.body.appendChild(el)
  requestAnimationFrame(() => { el.style.opacity = '0' })
  setTimeout(() => el.remove(), 480)
}

const showToast = (msg) => {
  const t = document.createElement('div')
  t.textContent = msg
  t.style.cssText = `
    position:fixed;top:80px;left:50%;
    transform:translateX(-50%) translateY(-16px);
    background:var(--ds-bg-elevated,#0b0f18);
    color:var(--ds-text-primary,#f8fafc);
    border:1px solid var(--ds-border-strong,rgba(251,191,36,0.55));
    padding:10px 22px;border-radius:9999px;
    font-family:'Tajawal',sans-serif;font-weight:600;font-size:14px;
    box-shadow:0 10px 36px rgba(0,0,0,0.5);
    z-index:100000;opacity:0;
    transition:opacity 220ms ease-out,transform 220ms cubic-bezier(0.22,1,0.36,1);
    pointer-events:none;direction:rtl;
  `
  document.body.appendChild(t)
  requestAnimationFrame(() => {
    t.style.opacity = '1'
    t.style.transform = 'translateX(-50%) translateY(0)'
  })
  setTimeout(() => {
    t.style.opacity = '0'
    t.style.transform = 'translateX(-50%) translateY(-16px)'
    setTimeout(() => t.remove(), 260)
  }, 1600)
}

export default function HeaderThemeButton() {
  const user = useAuthStore((s) => s.user)
  const isImpersonating = useAuthStore((s) => s.isImpersonating())
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(() =>
    document.documentElement.getAttribute('data-theme') || DEFAULT_THEME
  )
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on ESC
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const handleSelect = useCallback(async (themeId) => {
    const theme = THEMES.find(t => t.id === themeId)
    applyTheme(themeId)
    setCurrent(themeId)
    flash()
    showToast(`🎨 تم تطبيق: ${theme?.label || themeId}`)
    setTimeout(() => setOpen(false), 280)

    // Save to DB — only if NOT impersonating
    const effectiveUserId = isImpersonating ? null : user?.id
    if (effectiveUserId) {
      const result = await saveThemePreference(supabase, effectiveUserId, themeId)
      if (result.error) {
        showToast('تم الحفظ محلياً')
      }
    }
  }, [user?.id, isImpersonating])

  const CurrentIcon = THEME_ICONS[current] || Moon

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        style={{
          background: 'var(--surface-raised, var(--ds-surface-1, rgba(255,255,255,0.04)))',
          borderColor: 'var(--border-subtle, var(--ds-border-subtle, rgba(255,255,255,0.08)))',
        }}
        aria-label="تغيير المظهر"
      >
        <CurrentIcon size={16} style={{ color: 'var(--accent-sky, var(--ds-accent-primary, #38bdf8))' }} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full end-0 mt-2 w-60 rounded-xl overflow-hidden z-50"
            style={{
              background: 'var(--color-dropdown-bg, var(--ds-bg-elevated, #0b0f18))',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid var(--border-default, var(--ds-border-subtle, rgba(255,255,255,0.1)))',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
            dir="rtl"
          >
            {/* Header */}
            <div className="px-4 pt-3 pb-2 flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-tertiary, var(--ds-text-tertiary, #64748b))' }}>
                🎨 اختر المظهر
              </span>
            </div>

            <div style={{ height: 1, background: 'var(--border-subtle, var(--ds-border-subtle, rgba(255,255,255,0.06)))' }} />

            {/* Options */}
            <div className="p-1.5">
              {THEMES.map((theme) => {
                const Icon = THEME_ICONS[theme.id] || Moon
                const isActive = current === theme.id
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelect(theme.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 cursor-pointer"
                    style={{
                      background: isActive ? 'var(--glass-card-active, var(--ds-surface-2, rgba(255,255,255,0.06)))' : 'transparent',
                      color: isActive ? 'var(--text-primary, var(--ds-text-primary, #f8fafc))' : 'var(--text-secondary, var(--ds-text-secondary, #cbd5e1))',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--glass-card-hover, var(--ds-surface-1, rgba(255,255,255,0.04)))' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Color dots */}
                    <div className="flex gap-0.5 shrink-0">
                      {theme.colors.map((c, i) => (
                        <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                      ))}
                    </div>

                    <Icon size={16} className="shrink-0" />
                    <span className="flex-1 text-right text-[13px] font-medium font-['Tajawal']">{theme.label}</span>

                    {isActive && <Check size={14} style={{ color: 'var(--accent-sky, var(--ds-accent-primary, #38bdf8))' }} />}
                  </button>
                )
              })}
            </div>

            <div style={{ height: 1, background: 'var(--border-subtle, var(--ds-border-subtle, rgba(255,255,255,0.06)))' }} />

            {/* Settings link */}
            <a
              href={user ? '/student/profile' : '#'}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium transition-colors duration-150 font-['Tajawal']"
              style={{ color: 'var(--text-tertiary, var(--ds-text-tertiary, #64748b))' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary, var(--ds-text-secondary, #cbd5e1))'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary, var(--ds-text-tertiary, #64748b))'}
            >
              <Settings size={12} />
              المزيد في الإعدادات
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
