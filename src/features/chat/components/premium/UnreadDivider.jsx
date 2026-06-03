import { motion } from 'framer-motion'
import { fadeRise } from '../../lib/motion'

// "New messages" marker — shown before the first message that arrived since
// the student last read this conversation.
export default function UnreadDivider() {
  return (
    <motion.div {...fadeRise} className="flex items-center gap-3 my-5 px-6" style={{ direction: 'rtl' }}>
      <div
        className="flex-1 h-px"
        style={{ background: 'linear-gradient(to left, color-mix(in srgb, var(--ds-accent-primary) 55%, transparent), transparent)' }}
      />
      <span
        className="shrink-0 select-none px-3 py-1 rounded-full text-[11.5px] font-semibold"
        style={{
          fontFamily: 'Tajawal, sans-serif',
          color: 'var(--ds-accent-primary)',
          background: 'color-mix(in srgb, var(--ds-accent-primary) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--ds-accent-primary) 35%, transparent)',
          letterSpacing: '0.02em',
        }}
      >
        رسائل جديدة
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: 'linear-gradient(to right, color-mix(in srgb, var(--ds-accent-primary) 55%, transparent), transparent)' }}
      />
    </motion.div>
  )
}
