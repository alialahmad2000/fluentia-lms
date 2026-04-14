import { motion } from 'framer-motion'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { CINEMATIC_TOKENS as V1, useCinematicMotion } from '../_premiumPrimitives'

/* ═══════════════════════════════════════════════
   SmartNextStepCTA
   Props: { nextStep, onNavigate }
   nextStep = { key, action, label } | null
   ═══════════════════════════════════════════════ */
export default function SmartNextStepCTA({ nextStep, onNavigate }) {
  const { reduced } = useCinematicMotion()

  if (!nextStep) return null

  const isReview = nextStep.action === 'review'
  const Icon = isReview ? Sparkles : ArrowLeft

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <motion.button
        onClick={() => onNavigate(nextStep.key)}
        whileHover={reduced ? {} : { scale: 1.02, boxShadow: `0 0 32px rgba(245,200,66,0.45), 0 8px 24px rgba(0,0,0,0.4)` }}
        whileTap={reduced ? {} : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
          maxWidth: '400px',
          padding: '16px 28px',
          background: V1.goldGradient,
          border: `1px solid ${V1.accentGoldStrong}`,
          borderRadius: '16px',
          color: '#1a1a00',
          fontFamily: 'Tajawal, sans-serif',
          fontSize: '18px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: `0 0 20px rgba(245,200,66,0.25), 0 4px 16px rgba(0,0,0,0.3)`,
          direction: 'rtl',
          whiteSpace: 'nowrap',
          transition: 'box-shadow 0.2s ease',
        }}
        aria-label={nextStep.label}
      >
        <Icon size={20} strokeWidth={2.5} />
        {nextStep.label}
      </motion.button>
    </div>
  )
}
