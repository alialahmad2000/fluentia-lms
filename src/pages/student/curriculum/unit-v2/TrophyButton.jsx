import { Trophy } from 'lucide-react'
import { motion } from 'framer-motion'
import { CINEMATIC_TOKENS as V1, useCinematicMotion } from '../_premiumPrimitives'

/* ═══════════════════════════════════════════════
   TrophyButton — unit page header action
   Props: { rank, onClick }
   ═══════════════════════════════════════════════ */
export default function TrophyButton({ rank, onClick }) {
  const { reduced } = useCinematicMotion()

  return (
    <motion.button
      onClick={onClick}
      aria-label="عرض نجم الوحدة والترتيب"
      whileHover={reduced ? {} : { scale: 1.05 }}
      whileTap={reduced ? {} : { scale: 0.97 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        position: 'relative',
        width: 44,
        height: 44,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: V1.bgElevated,
        border: `1px solid ${V1.accentGoldStrong}`,
        boxShadow: V1.glowGold,
        cursor: 'pointer',
        flexShrink: 0,
        outline: 'none',
        fontFamily: "'Tajawal', sans-serif",
      }}
    >
      <Trophy size={24} style={{ color: V1.accentGold }} strokeWidth={1.8} />

      {rank != null && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            background: V1.accentGoldStrong,
            color: '#0a0a0f',
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'Tajawal', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 5px',
            lineHeight: 1,
            border: `1.5px solid ${V1.bg}`,
            letterSpacing: '-0.01em',
          }}
        >
          #{rank}
        </span>
      )}
    </motion.button>
  )
}
