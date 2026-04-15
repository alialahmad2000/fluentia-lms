import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { ADMIN_UUIDS, THEMES, DEFAULT_THEME } from './constants'
import { applyTheme as applyThemeHelper, saveThemePreference } from './applyTheme'
import { supabase } from '@/lib/supabase'
import { SectionHeader } from './components'
import { PrimaryButton, SecondaryButton } from './components/Buttons'
import PremiumCard from './components/PremiumCard'
import StatOrb from './components/StatOrb'

// ── Flash confirmation overlay ──
const flash = () => {
  const overlay = document.createElement('div')
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99998;
    background: var(--ds-accent-primary, #38bdf8);
    opacity: 0.15;
    pointer-events: none;
    transition: opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
  `
  document.body.appendChild(overlay)
  requestAnimationFrame(() => { overlay.style.opacity = '0' })
  setTimeout(() => overlay.remove(), 500)
}

// ── Prominent centered toast ──
const showThemeToast = (themeLabel) => {
  const toast = document.createElement('div')
  toast.textContent = `🎨 تم تطبيق: ${themeLabel}`
  toast.style.cssText = `
    position: fixed;
    top: 84px;
    left: 50%;
    transform: translateX(-50%) translateY(-20px);
    background: var(--ds-bg-elevated, #0a1428);
    color: var(--ds-text-primary, #f8fafc);
    border: 1px solid var(--ds-border-strong, rgba(125, 211, 252, 0.45));
    padding: 12px 24px;
    border-radius: 9999px;
    font-family: 'Tajawal', sans-serif;
    font-weight: 600;
    font-size: 15px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 32px var(--ds-accent-primary-glow, rgba(56,189,248,0.35));
    z-index: 100000;
    opacity: 0;
    transition: opacity 240ms ease-out, transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
    direction: rtl;
  `
  document.body.appendChild(toast)
  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateX(-50%) translateY(0)'
  })
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(-50%) translateY(-20px)'
    setTimeout(() => toast.remove(), 280)
  }, 1800)
}

export default function ThemeSwitcher() {
  const user = useAuthStore((s) => s.user)
  const [showInfo, setShowInfo] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [, forceUpdate] = useState(0)

  const applyTheme = useCallback((themeId) => {
    applyThemeHelper(themeId)

    const theme = THEMES.find((t) => t.id === themeId)
    flash()
    showThemeToast(theme?.label || themeId)
    forceUpdate((n) => n + 1)

    // Also persist to DB for admin
    if (user?.id) saveThemePreference(supabase, user.id, themeId)
  }, [user?.id])

  // Gate: only admin UUIDs — AFTER all hooks
  if (!user?.id || !ADMIN_UUIDS.includes(user.id)) return null

  const currentTheme = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME

  return (
    <>
      {/* ── Switcher container: bottom-right ── */}
      <div
        className="ds-theme-switcher"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          left: 'auto',
          top: 'auto',
          zIndex: 99999,
          pointerEvents: 'auto',
        }}
      >
        {/* ── Preview panel (above swatches) ── */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mb-3 overflow-y-auto"
              style={{
                width: 320,
                maxHeight: '60vh',
                borderRadius: 'var(--radius-lg, 20px)',
                background: 'var(--ds-bg-overlay, rgba(10, 20, 40, 0.85))',
                backdropFilter: 'blur(16px) saturate(160%)',
                WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                padding: 20,
              }}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="cursor-pointer"
                style={{
                  position: 'absolute',
                  top: 12,
                  left: 12,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px solid var(--ds-border-subtle)',
                  background: 'var(--ds-surface-1)',
                  color: 'var(--ds-text-secondary)',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  zIndex: 1,
                }}
              >
                ×
              </button>

              <div className="space-y-4" style={{ position: 'relative' }}>
                <SectionHeader kicker="معاينة" title="مرحباً بك في طلاقة" subtitle="هكذا تبدو العناصر بهذا الثيم" />

                <PremiumCard accent="primary" hover={false}>
                  <h3 style={{ color: 'var(--ds-text-primary)', fontSize: 16, fontWeight: 700, margin: 0 }}>الوحدة الثالثة</h3>
                  <p style={{ color: 'var(--ds-text-secondary)', fontSize: 14, margin: '4px 0 0' }}>عوالم حولنا — رحلة عبر الطبيعة</p>
                </PremiumCard>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <StatOrb label="XP اليوم" value={240} glow="primary" />
                  <StatOrb label="الأيام المتتالية" value={7} glow="gold" />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <PrimaryButton size="sm">ابدأ التعلم</PrimaryButton>
                  <SecondaryButton size="sm">لاحقاً</SecondaryButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Swatch row ── */}
        <div
          className="flex items-center"
          style={{
            gap: 10,
            padding: 10,
            borderRadius: 9999,
            background: 'rgba(10, 20, 40, 0.85)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          {/* Admin label */}
          <span className="text-[10px] font-bold font-['Tajawal'] shrink-0 hidden sm:inline" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>أدمن</span>

          {THEMES.map((theme) => {
            const isActive = currentTheme === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => applyTheme(theme.id)}
                title={theme.label}
                className={`relative flex items-center justify-center cursor-pointer ${isActive ? 'ds-swatch-active' : ''}`}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  border: isActive ? '2px solid var(--ds-accent-primary, #38bdf8)' : '2px solid transparent',
                  background: 'transparent',
                  padding: 0,
                  transition: 'border-color 200ms ease',
                }}
              >
                {/* Three color dots */}
                <div className="flex gap-1">
                  {theme.colors.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: c,
                      }}
                    />
                  ))}
                </div>

                {/* Checkmark */}
                {isActive && (
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      top: -2,
                      right: -2,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'var(--ds-accent-primary, #38bdf8)',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7.2L8 2.8" stroke="var(--ds-text-inverse, #0a1428)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}

          {/* Preview toggle */}
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="cursor-pointer"
            style={{
              height: 36,
              paddingInline: 12,
              borderRadius: 9999,
              border: '1px solid rgba(255,255,255,0.12)',
              background: showPreview ? 'var(--ds-accent-primary, #38bdf8)' : 'transparent',
              color: showPreview ? 'var(--ds-text-inverse, #0a1428)' : 'var(--ds-text-tertiary, #64748b)',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Tajawal', sans-serif",
              transition: 'all 200ms ease',
            }}
          >
            معاينة
          </button>

          {/* Info trigger */}
          <button
            type="button"
            onClick={() => setShowInfo((p) => !p)}
            className="cursor-pointer"
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: 'var(--ds-text-tertiary, #64748b)',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            ?
          </button>
        </div>

        {/* Info tooltip */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="mt-2 px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'var(--ds-bg-elevated, #0a1428)',
                border: '1px solid var(--ds-border-subtle)',
                color: 'var(--ds-text-secondary)',
                maxWidth: 280,
                boxShadow: 'var(--ds-shadow-md)',
                fontFamily: "'Tajawal', sans-serif",
                direction: 'rtl',
              }}
            >
              أدمن — اختبار الثيمات. الطلاب يغيرون المظهر من الهيدر.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Swatch pulse + mobile repositioning ── */}
      <style>{`
        @keyframes ds-swatch-pulse {
          0%, 100% { box-shadow: 0 0 0 0 var(--ds-accent-primary-glow, rgba(56,189,248,0.5)); }
          50%      { box-shadow: 0 0 0 8px transparent; }
        }
        .ds-swatch-active {
          animation: ds-swatch-pulse 2s ease-in-out infinite;
        }
        @media (max-width: 768px) {
          .ds-theme-switcher {
            bottom: calc(80px + env(safe-area-inset-bottom) + 16px) !important;
            right: 16px !important;
          }
        }
      `}</style>
    </>
  )
}
