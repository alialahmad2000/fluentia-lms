import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

  return createPortal(
    <>
      {/* Inline keyframes for spin-once animation */}
      <style>{`
        @keyframes fluentia-spin-once { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .animate-spin-once { animation: fluentia-spin-once 0.5s linear 1; }
      `}</style>

      {/* Reset button — bottom-right (insetInlineStart = right in RTL) */}
      <button
        onClick={handleClick}
        aria-label="إعادة تعيين الصفحة"
        className="fixed bottom-4 z-[9998] w-11 h-11 md:w-12 md:h-12
                   rounded-full bg-slate-900/80 backdrop-blur-md
                   border border-slate-700 hover:border-amber-400/60
                   hover:bg-slate-800/90 transition-all
                   flex items-center justify-center
                   shadow-lg shadow-black/40
                   group"
        style={{ insetInlineStart: '16px' }}
        title="إعادة تعيين الصفحة"
      >
        <RotateCcw
          className={`w-5 h-5 text-slate-300 group-hover:text-amber-400 transition-colors
                      ${isSpinning ? 'animate-spin-once' : ''}`}
        />
      </button>

      {/* Confirmation popover */}
      {showConfirm && (
        <div
          className="fixed bottom-20 z-[9999] bg-slate-900/95 backdrop-blur-md
                     border border-slate-700 rounded-xl p-4 shadow-2xl
                     w-[260px]"
          style={{ insetInlineStart: '16px' }}
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

      {/* Success toast */}
      {showToast && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999]
                     bg-emerald-500/15 border border-emerald-500/40 backdrop-blur-md
                     text-emerald-200 px-4 py-2 rounded-lg text-sm font-['Tajawal']"
          dir="rtl"
        >
          ✓ تم تصفير الصفحة
        </div>
      )}

      {/* Reading prefs restore prompt */}
      {showReadingPrefsPrompt && (
        <div
          className="fixed bottom-36 z-[9999] bg-slate-900/95 backdrop-blur-md
                     border border-amber-500/40 rounded-xl p-4 shadow-2xl
                     w-[300px]"
          style={{ insetInlineStart: '16px' }}
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
    </>,
    document.body
  )
}
