import { AnimatePresence, motion } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'

export default function PersonalizedReadingDrawer({ variant, bucket, isOpen, onClose }) {
  const BucketIcon = bucket?.icon ?? Sparkles

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
            className="fixed inset-y-0 end-0 z-50 w-full max-w-[640px] flex flex-col"
            style={{ background: 'var(--vm-surface,#0f0a1f)', borderLeft: '1px solid rgba(255,255,255,0.1)', boxShadow: '-12px 0 48px rgba(0,0,0,0.6)' }}
            dir="rtl"
            role="dialog"
            aria-modal="true"
          >
            <header className="flex items-start justify-between gap-3 p-5 sm:p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide font-['Tajawal']"
                    style={{ background: 'rgba(212,165,116,0.2)', color: 'var(--vm-accent,#d4a574)' }}>
                    <BucketIcon className="h-3 w-3" />
                    {bucket?.labelAr ?? 'نسخة مخصّصة'}
                  </span>
                  {variant.cefr_level && (
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>
                      {variant.cefr_level}
                    </span>
                  )}
                  <span className="text-[11px] font-['Tajawal']" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {variant.word_count} كلمة
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold leading-tight" dir="ltr" style={{ color: 'var(--text-primary,#fff)', textAlign: 'start' }}>
                  {variant.title}
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

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
              <div
                className="leading-[1.9] text-[15px] sm:text-base whitespace-pre-wrap"
                dir="ltr"
                style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'start' }}
              >
                {variant.body}
              </div>
            </div>

            <footer className="px-5 sm:px-6 py-4 text-xs text-center font-['Tajawal']"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
              نسخة إضافية — مكملّة للقراءة الأصلية في الحصة
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
