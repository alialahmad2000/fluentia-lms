import { motion, AnimatePresence } from 'framer-motion'
import { X, Headphones, Mic2, Repeat, Languages, Check } from 'lucide-react'

// Reading editorial rebuild — secondary tools drawer. Everything that used to
// crowd the top of the article (full-audio, karaoke, A-B repeat, speed) is
// demoted here behind a single ⚙️ button. Activating audio mounts the existing
// post-megafix SmartAudioPlayer (karaoke + speed + A-B + skip live inside it),
// so those advanced features aren't dead buttons — they're in the player.
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
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110]" style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%', y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            dir="rtl"
            className="fixed z-[111] top-0 bottom-0 right-0 w-[min(360px,90vw)] overflow-y-auto"
            style={{
              background: 'var(--ds-bg-elevated, var(--ds-surface-1, #11131c))',
              borderLeft: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))',
              padding: '20px',
              boxShadow: '-24px 0 64px -20px rgba(0,0,0,0.5)',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", fontStyle: 'italic', fontSize: 20, color: 'var(--ds-text-primary, #f8fafc)' }}>
                أدوات القراءة
              </h3>
              <button type="button" onClick={onClose} aria-label="إغلاق" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
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
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
