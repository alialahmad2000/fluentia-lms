import { useState, useRef, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const DEFAULT_READING_PREFS = {
  word_assistance_enabled: true,
  quick_translation_on_hover_tap: true,
  detailed_menu_on_click_longpress: true,
  show_page_help_hints: true,
}

const EXCLUDED_PATHS = ['/login', '/signup', '/auth', '/onboarding', '/record', '/forgot-password', '/reset-password', '/test', '/testimonials', '/parent', '/partners', '/verify']

export default function ResetPageButton() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [showReadingPrefsPrompt, setShowReadingPrefsPrompt] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const lastClickRef = useRef(0)
  const confirmTimerRef = useRef(null)
  const location = useLocation()

  // Don't render on excluded paths
  const isExcluded = EXCLUDED_PATHS.some(p => location.pathname.startsWith(p))

  useEffect(() => () => {
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
  }, [])

  // Close confirm on navigation
  useEffect(() => {
    setShowConfirm(false)
    setShowReadingPrefsPrompt(false)
  }, [location.pathname])

  if (isExcluded) return null

  const performReset = () => {
    setIsSpinning(true)
    setShowConfirm(false)

    // 1. Reset zoom
    try {
      document.body.style.zoom = '1'
      document.documentElement.style.zoom = '1'
    } catch {}

    // 2. Remove font-size overrides
    document.documentElement.style.fontSize = ''
    document.body.style.fontSize = ''

    // 3. Scroll top
    window.scrollTo({ top: 0, behavior: 'smooth' })

    // 4. Dispatch global reset event
    window.dispatchEvent(new CustomEvent('fluentia:reset-page'))

    // 5. Clear text selection
    try {
      window.getSelection?.()?.removeAllRanges()
    } catch {}

    // 6. Close any escape-key-dismissible UI
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    // 7. Toast
    setShowToast(true)
    setTimeout(() => setShowToast(false), 1200)
    setTimeout(() => setIsSpinning(false), 500)

    // 8. Reading prefs prompt (conditional)
    const isReadingPage = /\/curriculum\/unit\//.test(location.pathname)
    if (isReadingPage) {
      try {
        const raw = localStorage.getItem('fluentia_reading_prefs')
        if (raw) {
          const prefs = JSON.parse(raw)
          const isDefault = Object.keys(DEFAULT_READING_PREFS).every(
            (k) => prefs[k] === DEFAULT_READING_PREFS[k]
          )
          if (!isDefault) {
            setTimeout(() => setShowReadingPrefsPrompt(true), 400)
          }
        }
      } catch {}
    }
  }

  const handleClick = (e) => {
    const now = Date.now()
    const doubleClick = now - lastClickRef.current < 1500
    lastClickRef.current = now

    if (e.shiftKey || doubleClick) {
      performReset()
      return
    }

    setShowConfirm(true)
    if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    confirmTimerRef.current = setTimeout(() => setShowConfirm(false), 4000)
  }

  const resetReadingPrefs = () => {
    localStorage.setItem('fluentia_reading_prefs', JSON.stringify(DEFAULT_READING_PREFS))
    setShowReadingPrefsPrompt(false)
    window.dispatchEvent(new CustomEvent('fluentia:reading-prefs-changed'))
  }

  return (
    <>
      {/* Inline keyframes for spin-once animation */}
      <style>{`
        @keyframes fluentia-spin-once { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .animate-spin-once { animation: fluentia-spin-once 0.5s linear 1; }
      `}</style>

      {/* Reset button — inline (lives in header toolbar) */}
      <div className="relative">
        <button
          onClick={handleClick}
          aria-label="إعادة تعيين الصفحة"
          className="flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer group"
          style={{
            background: 'var(--surface-raised, var(--ds-surface-1, rgba(255,255,255,0.04)))',
            borderColor: 'var(--border-subtle, var(--ds-border-subtle, rgba(255,255,255,0.08)))',
          }}
          title="إعادة تعيين الصفحة"
        >
          <RotateCcw
            className={`w-4 h-4 transition-colors ${isSpinning ? 'animate-spin-once' : ''}`}
            style={{ color: 'var(--accent-sky, var(--ds-accent-primary, #38bdf8))' }}
          />
        </button>

        {/* Confirmation popover (anchored to button) */}
        {showConfirm && (
          <div
            className="absolute top-full end-0 mt-2 z-[9999] bg-slate-900/95 backdrop-blur-md
                       border border-slate-700 rounded-xl p-4 shadow-2xl w-[260px]"
            dir="rtl"
          >
            <p className="text-sm text-slate-200 mb-3 leading-relaxed font-['Tajawal']">
              إعادة تعيين الصفحة لحالتها الافتراضية؟
            </p>
            <div className="flex gap-2">
              <button
                onClick={performReset}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium
                           px-3 py-1.5 rounded-lg text-sm transition-colors font-['Tajawal']"
              >
                نعم
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300
                           px-3 py-1.5 rounded-lg text-sm transition-colors font-['Tajawal']"
              >
                إلغاء
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-['Tajawal']">
              نصيحة: اضغط الزر مرتين بسرعة للتصفير الفوري.
            </p>
          </div>
        )}

        {/* Reading prefs restore prompt (anchored below confirm) */}
        {showReadingPrefsPrompt && (
          <div
            className="absolute top-full end-0 mt-2 z-[9999] bg-slate-900/95 backdrop-blur-md
                       border border-amber-500/40 rounded-xl p-4 shadow-2xl w-[300px]"
            dir="rtl"
          >
            <p className="text-sm text-slate-200 mb-3 leading-relaxed font-['Tajawal']">
              لاحظت أنك غيّرت إعدادات مساعدات القراءة.
              هل تريد إعادتها للوضع الافتراضي؟
            </p>
            <div className="flex gap-2">
              <button
                onClick={resetReadingPrefs}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium
                           px-3 py-1.5 rounded-lg text-sm transition-colors font-['Tajawal']"
              >
                نعم، أعدها
              </button>
              <button
                onClick={() => setShowReadingPrefsPrompt(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300
                           px-3 py-1.5 rounded-lg text-sm transition-colors font-['Tajawal']"
              >
                لا، احتفظ بإعداداتي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Success toast — kept as a centered flash since it's a global status message */}
      {showToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999]
                     bg-emerald-500/15 border border-emerald-500/40 backdrop-blur-md
                     text-emerald-200 px-4 py-2 rounded-lg text-sm font-['Tajawal']"
          dir="rtl"
        >
          ✓ تم تصفير الصفحة
        </div>
      )}
    </>
  )
}
