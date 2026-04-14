import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { ADMIN_UUIDS, THEMES, THEME_STORAGE_KEY, DEFAULT_THEME } from './constants'

export default function ThemeSwitcher() {
  const user = useAuthStore((s) => s.user)
  const [toast, setToast] = useState(null)
  const [showInfo, setShowInfo] = useState(false)

  // Gate: only admin UUIDs
  if (!user?.id || !ADMIN_UUIDS.includes(user.id)) return null

  const currentTheme = document.documentElement.getAttribute('data-theme') || DEFAULT_THEME

  const applyTheme = (themeId) => {
    document.documentElement.setAttribute('data-theme', themeId)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId)
    } catch {}

    const theme = THEMES.find((t) => t.id === themeId)
    setToast(`تم تطبيق: ${theme?.label || themeId}`)
    setTimeout(() => setToast(null), 2000)
  }

  return (
    <>
      <div
        className="fixed z-[9999]"
        style={{
          top: 16,
          left: 16,
          /* Mobile: bottom-right above tab bar */
        }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-full"
          style={{
            background: 'var(--ds-bg-overlay, rgba(10, 20, 40, 0.72))',
            backdropFilter: 'blur(16px) saturate(150%)',
            WebkitBackdropFilter: 'blur(16px) saturate(150%)',
            border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
            boxShadow: 'var(--ds-shadow-md, 0 8px 30px rgba(0,0,0,0.45))',
          }}
        >
          {THEMES.map((theme) => {
            const isActive = currentTheme === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => applyTheme(theme.id)}
                title={theme.label}
                className="relative flex items-center justify-center cursor-pointer"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: isActive ? '2px solid var(--ds-accent-primary, #38bdf8)' : '2px solid transparent',
                  background: 'transparent',
                  padding: 0,
                  transition: 'border-color 200ms ease',
                }}
              >
                {/* Three color dots */}
                <div className="flex gap-0.5">
                  {theme.colors.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: c,
                      }}
                    />
                  ))}
                </div>

                {/* Checkmark */}
                {isActive && (
                  <div
                    className="absolute -top-1 -right-1 flex items-center justify-center"
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: 'var(--ds-accent-primary, #38bdf8)',
                    }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3.2 5.8L6.5 2.2" stroke="var(--ds-text-inverse, #0a1428)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}

          {/* Info tooltip trigger */}
          <button
            type="button"
            onClick={() => setShowInfo((p) => !p)}
            className="cursor-pointer"
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
              background: 'transparent',
              color: 'var(--ds-text-tertiary, #64748b)',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginInlineStart: 4,
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
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-2 px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'var(--ds-bg-elevated, #0a1428)',
                border: '1px solid var(--ds-border-subtle)',
                color: 'var(--ds-text-secondary)',
                maxWidth: 260,
                boxShadow: 'var(--ds-shadow-md)',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              أنت تشاهد وضع المعاينة كأدمن — الطلاب لا يرون هذا.
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.25 }}
            className="fixed z-[10000] px-5 py-3 rounded-xl text-sm font-semibold"
            style={{
              bottom: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--ds-bg-elevated, #0a1428)',
              border: '1px solid var(--ds-border-subtle)',
              color: 'var(--ds-text-primary)',
              boxShadow: 'var(--ds-shadow-lg)',
              fontFamily: "'Tajawal', sans-serif",
              whiteSpace: 'nowrap',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile repositioning */}
      <style>{`
        @media (max-width: 768px) {
          .fixed.z-\\[9999\\] {
            top: auto !important;
            left: auto !important;
            bottom: 80px !important;
            right: 16px !important;
          }
        }
      `}</style>
    </>
  )
}
