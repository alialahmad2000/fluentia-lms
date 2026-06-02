import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Headphones, Mic2, Repeat, Languages, Check } from 'lucide-react'

// Reading editorial rebuild — secondary tools, presented as a CENTERED MODAL.
// Was a right-side drawer that could sit visually adjacent to / behind the
// fixed sidebar on desktop; converted to a centered, properly elevated modal
// (backdrop blur, focus trap, Escape/backdrop/X close) so it reads as a
// deliberate dialog on every viewport. Everything that used to crowd the top of
// the article (full-audio, karaoke, A-B repeat, speed) is demoted here behind a
// single ⚙️ button. Activating audio mounts the existing post-megafix
// SmartAudioPlayer (karaoke + speed + A-B + skip live inside it), so those
// advanced features aren't dead buttons — they're in the player.
const GOLD = 'var(--ds-accent-primary, #e9b949)'

function ToolRow({ icon: Icon, label, sub, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-right transition-colors"
      style={{
        background: active ? 'rgba(233,185,73,0.10)' : 'transparent',
        border: `1px solid ${active ? 'rgba(233,185,73,0.35)' : 'var(--ds-border-subtle, rgba(255,255,255,0.06))'}`,
      }}
    >
      <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', color: active ? GOLD : 'var(--ds-text-secondary, #94a3b8)' }}>
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-['Tajawal']" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>{label}</span>
        {sub && <span className="block text-[11px] font-['Tajawal']" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>{sub}</span>}
      </span>
      {active && <Check size={16} style={{ color: GOLD }} />}
    </button>
  )
}

export default function ReadingTools({ open, onClose, audioActive, onToggleAudio, arabicActive, onToggleArabic }) {
  const panelRef = useRef(null)

  // Escape to close + focus trap while open. Hooks run unconditionally; the
  // effect body short-circuits when the modal is closed.
  useEffect(() => {
    if (!open) return undefined

    const panel = panelRef.current
    // Move focus into the modal (first interactive element) so the keyboard
    // user lands inside the dialog, not behind it.
    const focusables = () =>
      panel
        ? Array.from(
            panel.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => !el.disabled && el.offsetParent !== null)
        : []
    const first = focusables()[0]
    if (first) first.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const items = focusables()
        if (items.length === 0) return
        const firstEl = items[0]
        const lastEl = items[items.length - 1]
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault()
          lastEl.focus()
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 z-[110]"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[111] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="أدوات القراءة"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              dir="rtl"
              className="pointer-events-auto w-[min(90vw,480px)] max-h-[min(80vh,600px)] overflow-y-auto"
              style={{
                background: 'var(--ds-bg-elevated, var(--ds-surface-1, #11131c))',
                border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
                borderRadius: 16,
                padding: '22px',
                boxShadow: '0 32px 64px -16px rgba(0,0,0,0.6)',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontStyle: 'italic', fontSize: 20, color: 'var(--ds-text-primary, #f8fafc)' }}>
                  أدوات القراءة
                </h3>
                <button type="button" onClick={onClose} aria-label="إغلاق" className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                  <X size={18} />
                </button>
              </div>
              <div className="h-px w-full my-3" style={{ background: 'var(--ds-border-subtle, rgba(255,255,255,0.08))' }} />

              <div className="space-y-2.5">
                <ToolRow
                  icon={Headphones}
                  label="الاستماع للمقال كاملاً"
                  sub="الكاريوكي · السرعة · تكرار A-B · التنقّل — كلها داخل المشغّل"
                  active={audioActive}
                  onClick={onToggleAudio}
                />
                <ToolRow
                  icon={Languages}
                  label="الترجمة العربية الكاملة"
                  sub="عرض النص بالعربية أسفل كل فقرة"
                  active={arabicActive}
                  onClick={onToggleArabic}
                />
              </div>

              <p className="mt-5 text-[11px] leading-relaxed font-['Tajawal']" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                <Mic2 size={11} className="inline ms-1" /> وضع الإملاء و
                <Repeat size={11} className="inline mx-1" /> قراءة الظل متاحان من شريط المشغّل بعد تشغيل الاستماع.
              </p>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
