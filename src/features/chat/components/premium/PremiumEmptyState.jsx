import { motion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import { fadeRise } from '../../lib/motion'

export default function PremiumEmptyState() {
  return (
    <motion.div
      {...fadeRise}
      className="h-full flex flex-col items-center justify-center gap-5 px-8 text-center"
      style={{ direction: 'rtl' }}
    >
      {/* Single breathing orb */}
      <div className="relative" style={{ width: 104, height: 104 }}>
        <div
          className="chat-breathe absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--ds-accent-gold) 26%, transparent), transparent 66%)',
          }}
        />
        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            inset: '26%',
            background: 'color-mix(in srgb, var(--ds-bg-elevated) 70%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ds-accent-gold) 28%, transparent)',
            backdropFilter: 'blur(10px)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.12), 0 8px 24px -8px color-mix(in srgb, var(--ds-accent-gold) 30%, transparent)',
          }}
        >
          <MessageSquare size={22} style={{ color: 'var(--ds-accent-gold)', opacity: 0.85 }} />
        </div>
      </div>

      <div className="max-w-xs">
        <h3
          className="mb-1.5"
          style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--ds-text-primary)', letterSpacing: '0.01em' }}
        >
          ابدأ المحادثة الأولى
        </h3>
        <p
          style={{ fontFamily: 'Tajawal, sans-serif', fontWeight: 400, fontSize: 14, color: 'var(--ds-text-secondary)', lineHeight: 1.75 }}
        >
          شارك صوتاً، سؤالاً، أو تأمّلاً من الحصة — اكتب رسالتك بالأسفل لتبدأ.
        </p>
      </div>
    </motion.div>
  )
}
