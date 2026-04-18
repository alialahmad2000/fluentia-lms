import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

export default function BriefPromise({ outcomes }) {
  if (!outcomes?.length) return null

  return (
    <div style={{
      background: 'var(--ds-surface-1)',
      border: '1px solid var(--ds-border-strong)',
      borderRadius: 'var(--radius-lg, 16px)',
      padding: 'clamp(20px, 4vw, 32px)',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--ds-accent-gold)',
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        marginBottom: '16px',
        fontFamily: "'Tajawal', sans-serif",
      }}>
        بعد هذه الوحدة، ستكونين قادرة على:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {outcomes.map((outcome, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}
          >
            <div style={{
              flexShrink: 0,
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'rgba(233, 185, 73, 0.15)',
              border: '1px solid var(--ds-accent-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '1px',
            }}>
              <Check size={12} style={{ color: 'var(--ds-accent-gold)' }} />
            </div>
            <span style={{ fontSize: 'clamp(13px, 2.5vw, 15px)', color: 'var(--ds-text-primary)', lineHeight: 1.6 }}>
              {outcome}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
