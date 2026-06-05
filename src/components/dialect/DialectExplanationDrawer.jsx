import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Volume2 } from 'lucide-react'

export default function DialectExplanationDrawer({ explanation, isOpen, onClose }) {
  // Render through a portal to <body> so the overlay escapes any transformed/
  // scaled ancestor (e.g. the admin "معاينة منهج الطالب" preview wrapper) — a
  // position:fixed element is otherwise trapped & clipped inside such a wrapper.
  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="relative z-[1001] w-full max-w-[560px] flex flex-col rounded-2xl overflow-hidden"
            style={{ maxHeight: 'min(88vh, 780px)', background: 'var(--vm-surface, #0f0a1f)', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
            dir="rtl"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 p-5 sm:p-6 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
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
                style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="mx-5 sm:mx-6 mt-4 mb-2 flex items-center gap-3 rounded-xl p-3 shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)' }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                <Volume2 className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 text-sm">
                {explanation.audio_url_najdi ? (
                  <audio controls src={explanation.audio_url_najdi} className="w-full">
                    متصفحك ما يدعم تشغيل الصوت
                  </audio>
                ) : (
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>الصوت قريباً — بصوت علي 🎙️</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
              {Array.isArray(explanation.explanation_sections) && explanation.explanation_sections.length > 0 ? (
                <div className="space-y-7">
                  {explanation.explanation_sections.map((sec, i) => (
                    <section key={i}>
                      {sec.label && (
                        <div className="flex items-center gap-2.5 mb-3">
                          <span className="h-4 w-1.5 rounded-full shrink-0" style={{ background: 'var(--vm-accent, #d4a574)' }} />
                          <h3 className="text-[15px] font-bold tracking-wide font-['Tajawal']" style={{ color: 'var(--vm-accent, #d4a574)' }}>
                            {sec.label}
                          </h3>
                        </div>
                      )}
                      {sec.body && (
                        <p className="leading-[2] text-[15px] sm:text-base whitespace-pre-wrap font-['Tajawal']" style={{ color: 'rgba(255,255,255,0.9)' }}>
                          {sec.body}
                        </p>
                      )}
                      {Array.isArray(sec.items) && sec.items.length > 0 && (
                        <div className="space-y-2.5">
                          {sec.items.map((it, j) => (
                            <div key={j} className="rounded-xl px-3.5 py-3"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              {it.en && (
                                <p dir="ltr" className="text-[15px] font-semibold mb-1 text-left break-words" style={{ color: '#fff' }}>
                                  {it.en}
                                </p>
                              )}
                              {it.ar && (
                                <p className="text-[13.5px] leading-relaxed font-['Tajawal']" style={{ color: 'rgba(255,255,255,0.62)' }}>
                                  {it.ar}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              ) : (
                <div className="leading-[1.9] text-[15px] sm:text-base whitespace-pre-wrap font-['Tajawal']"
                  style={{ color: 'rgba(255,255,255,0.9)' }}>
                  {explanation.explanation_najdi}
                </div>
              )}
            </div>

            <footer className="px-5 sm:px-6 py-4 text-xs text-center font-['Tajawal'] shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              شرح مكتوب خصيصاً لطلاب Fluentia · أكاديمية طلاقة
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
