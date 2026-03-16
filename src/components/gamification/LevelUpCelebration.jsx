import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Pre-generate confetti particle configs so they stay stable across renders
function generateConfetti(count) {
  const colors = [
    '#38bdf8', // sky
    '#a78bfa', // violet
    '#fbbf24', // gold
    '#34d399', // emerald
    '#fb7185', // rose
    '#f97316', // orange
    '#818cf8', // indigo
  ]
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    width: 6 + Math.random() * 8,
    height: 6 + Math.random() * 12,
    color: colors[i % colors.length],
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 2,
    rotation: Math.random() * 360,
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
  }))
}

export default function LevelUpCelebration({ level, onDismiss }) {
  const confetti = useMemo(() => generateConfetti(40), [])

  // Auto-dismiss after 2.5 seconds
  useEffect(() => {
    if (level == null) return
    const timer = setTimeout(() => {
      onDismiss?.()
    }, 2500)
    return () => clearTimeout(timer)
  }, [level, onDismiss])

  return (
    <AnimatePresence>
      {level != null && (
        <motion.div
          key="level-up-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          onClick={onDismiss}
          dir="rtl"
        >
          {/* Dark semi-transparent backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Confetti particles */}
          {confetti.map((p) => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                top: 0,
                left: p.left,
                width: p.width,
                height: p.height,
                backgroundColor: p.color,
                borderRadius: p.borderRadius,
                opacity: 0,
                transform: `rotate(${p.rotation}deg)`,
                animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
                zIndex: 201,
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Center badge with level number */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 0.9, 1], opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{
              duration: 0.7,
              times: [0, 0.5, 0.75, 1],
              ease: 'easeOut',
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-[202] flex flex-col items-center gap-4"
          >
            {/* Glowing level badge */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(251, 191, 36, 0.3)',
                  '0 0 60px rgba(251, 191, 36, 0.5)',
                  '0 0 20px rgba(251, 191, 36, 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-32 h-32 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.1))',
                border: '3px solid rgba(251, 191, 36, 0.5)',
              }}
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', damping: 8 }}
                className="text-5xl font-bold"
                style={{ color: 'var(--accent-gold, #fbbf24)' }}
              >
                {level}
              </motion.span>
            </motion.div>

            {/* Celebration text */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-xl font-bold text-center"
              style={{ color: 'var(--text-primary, #fff)' }}
            >
              مبروك! وصلت المستوى {level}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
