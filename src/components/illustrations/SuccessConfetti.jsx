import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Lightweight confetti burst — triggers on mount, auto-removes after animation.
 * Use for XP gains, task completions, achievements.
 */
export default function SuccessConfetti({ trigger = true, duration = 2000, particleCount = 24 }) {
  const [visible, setVisible] = useState(trigger)

  useEffect(() => {
    if (trigger) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), duration)
      return () => clearTimeout(timer)
    }
  }, [trigger, duration])

  const particles = useMemo(() => {
    const colors = ['#38bdf8', '#a78bfa', '#fbbf24', '#34d399', '#fb7185']
    return Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / particleCount) * 360
      const rad = (angle * Math.PI) / 180
      const distance = 60 + Math.random() * 80
      return {
        id: i,
        x: Math.cos(rad) * distance,
        y: Math.sin(rad) * distance - 40,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 4,
        rotation: Math.random() * 360,
        shape: i % 3, // 0=circle, 1=rect, 2=diamond
      }
    })
  }, [particleCount])

  return (
    <AnimatePresence>
      {visible && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 flex items-center justify-center">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
              animate={{
                x: p.x,
                y: p.y,
                scale: [0, 1.2, 0.8],
                opacity: [1, 1, 0],
                rotate: p.rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: duration / 1000, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                background: p.color,
                borderRadius: p.shape === 0 ? '50%' : p.shape === 2 ? '2px' : '1px',
                transform: p.shape === 2 ? 'rotate(45deg)' : undefined,
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
