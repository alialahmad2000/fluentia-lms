import { AnimatePresence, motion } from 'framer-motion'
import { X, Volume2 } from 'lucide-react'

export default function DialectExplanationDrawer({ explanation, isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-y-0 end-0 z-50 w-full max-w-[520px] flex flex-col"
            style={{ background: 'var(--vm-surface, #0f0a1f)', borderLeft: '1px solid rgba(255,255,255,0.1)', boxShadow: '-12px 0 48px rgba(0,0,0,0.6)' }}
            dir="rtl"
            role="dialog"
            aria-modal="true"
          >
            <header className="flex items-start justify-between gap-3 p-5 sm:p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
                    style={{ background: 'rgba(212,165,116,0.2)', color: 'var(--vm-accent, #d4a574)' }}>
                    نجدي
                  </span>
                  {explanation.cefr_level && (
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                      {explanation.cefr_level}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold leading-tight" style={{ color: 'var(--text-primary, #fff)' }}>
                  {explanation.concept_title}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="shrink-0 rounded-xl p-2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.6)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="mx-5 sm:mx-6 mt-4 mb-2 flex items-center gap-3 rounded-xl p-3"
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                <Volume2 className="h-4 w-4" />
              </div>
              <div className="flex-1 text-sm">
                {explanation.audio_url_najdi ? (
                  <audio controls src={explanation.audio_url_najdi} className="w-full">
                    متصفحك ما يدعم تشغيل الصوت
                  </audio>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>الصوت قريباً — بصوت علي 🎙️</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
              <div className="leading-[1.9] text-[15px] sm:text-base whitespace-pre-wrap font-['Tajawal']"
                style={{ color: 'rgba(255,255,255,0.9)' }}>
                {explanation.explanation_najdi}
              </div>
            </div>

            <footer className="px-5 sm:px-6 py-4 text-xs text-center font-['Tajawal']"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              شرح مكتوب خصيصاً لطلاب Fluentia · أكاديمية طلاقة
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
