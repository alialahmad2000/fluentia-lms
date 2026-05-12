import { motion } from 'framer-motion'
import { Mic, MessageSquare } from 'lucide-react'
import { fadeRise } from '../../lib/motion'

export default function PremiumEmptyState({ onStartVoice, onStartText }) {
  return (
    <motion.div
      {...fadeRise}
      className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center"
      style={{ direction: 'rtl', minHeight: 320 }}
    >
      {/* Breathing gradient orb */}
      <div className="relative w-32 h-32 mb-2">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--ds-accent-primary) 20%, transparent), transparent 70%)',
            animation: 'pulse 3s ease-in-out infinite',
          }}
        />
        <div
          className="absolute inset-4 rounded-full"
          style={{
            background: 'radial-gradient(circle, color-mix(in srgb, var(--ds-accent-gold) 15%, transparent), transparent 70%)',
            animation: 'pulse 4s ease-in-out infinite 1s',
          }}
        />
        <div
          className="absolute inset-8 rounded-full flex items-center justify-center"
          style={{
            background: 'var(--ds-surface-glass)',
            border: '1px solid var(--ds-border-subtle)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <MessageSquare size={28} style={{ color: 'var(--ds-accent-primary)', opacity: 0.8 }} />
        </div>
      </div>

      <div>
        <h3
          className="text-xl font-bold mb-2"
          style={{
            fontFamily: 'Tajawal, sans-serif',
            fontWeight: 700,
            color: 'var(--ds-text-primary)',
          }}
        >
          ابدأ المحادثة الأولى
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{
            fontFamily: 'Tajawal, sans-serif',
            color: 'var(--ds-text-secondary)',
            lineHeight: 1.7,
          }}
        >
          شارك صوتاً، سؤالاً، أو تأملاً من الحصة
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onStartVoice}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-medium transition-all hover:scale-105"
          style={{
            background: 'color-mix(in srgb, var(--ds-accent-primary) 15%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ds-accent-primary) 30%, transparent)',
            color: 'var(--ds-accent-primary)',
            fontFamily: 'Tajawal, sans-serif',
          }}
        >
          <Mic size={16} />
          سجل صوتية
        </button>
        <button
          onClick={onStartText}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-medium transition-all hover:scale-105"
          style={{
            background: 'var(--ds-surface-glass)',
            border: '1px solid var(--ds-border-subtle)',
            color: 'var(--ds-text-primary)',
            fontFamily: 'Tajawal, sans-serif',
          }}
        >
          <MessageSquare size={16} />
          اكتب رسالة
        </button>
      </div>
    </motion.div>
  )
}
