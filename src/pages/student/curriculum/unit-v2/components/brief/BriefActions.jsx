import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

export default function BriefActions({ onStart, onSkip, mode }) {
  const isReplay = mode === 'replay'
  const primaryLabel = isReplay ? 'متابعة الوحدة ←' : 'ابدأ الرحلة ←'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: 'clamp(14px, 3vw, 18px) 24px',
          borderRadius: '16px',
          background: 'var(--ds-accent-gold)',
          color: 'var(--ds-text-inverse, #0b0f18)',
          fontSize: 'clamp(15px, 3vw, 18px)',
          fontWeight: 900,
          fontFamily: "'Tajawal', sans-serif",
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          boxShadow: '0 4px 24px rgba(233, 185, 73, 0.35)',
        }}
      >
        <ArrowLeft size={20} />
        {primaryLabel}
      </motion.button>

      {onSkip && (
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--ds-text-tertiary)',
            fontSize: '13px',
            fontFamily: "'Tajawal', sans-serif",
            padding: '8px 16px',
            textDecoration: 'underline',
            textDecorationStyle: 'dotted',
          }}
        >
          تخطَّ الإيجاز
        </button>
      )}
    </div>
  )
}
