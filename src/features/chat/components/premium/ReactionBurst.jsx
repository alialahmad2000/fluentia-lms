import { motion } from 'framer-motion'
import { ease } from '../../lib/motion'

// One-shot emoji particle burst fired when a user reacts (double-tap or via menu).
// The caller portals this and positions it; we render only a fragment of
// absolutely-positioned, pointer-events-none spans so nothing constrains the fan.
// ~7 particles fan UPWARD from (x, y); onDone fires once, on the first particle.
export default function ReactionBurst({ x, y, emoji = '❤️', onDone }) {
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => {
        const a = (Math.PI / 6) * i - Math.PI / 2
        return (
          <motion.span
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
            animate={{
              opacity: 0,
              x: Math.cos(a) * 42,
              y: Math.sin(a) * 42 - 18,
              scale: 1.1,
            }}
            transition={{ duration: 0.6, ease }}
            onAnimationComplete={i === 0 ? () => onDone?.() : undefined}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              fontSize: 16,
              lineHeight: 1,
              pointerEvents: 'none',
              userSelect: 'none',
              willChange: 'transform, opacity',
            }}
          >
            {emoji}
          </motion.span>
        )
      })}
    </>
  )
}
