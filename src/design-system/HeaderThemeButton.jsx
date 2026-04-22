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
  const impersonation = useAuthStore((s) => s.impersonation)
  const isImpersonating = !!impersonation
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

  // ATELIER: theme switching disabled — single identity.
  return null
}
