import { useMemo } from 'react'

/**
 * Floating decorative particles — adds cosmic depth to backgrounds.
 * Uses pure CSS animations (GPU-composited) instead of framer-motion JS animations.
 * This is critical for mobile performance — 20 JS-driven motion.div loops caused jank.
 */
export default function FloatingParticles({ count = 20, className = '' }) {
  const particles = useMemo(() => {
    const colors = [
      'var(--accent-sky)',
      'var(--accent-violet)',
      'var(--accent-gold)',
      'var(--accent-emerald)',
    ]
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 3,
      color: colors[i % colors.length],
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 5,
      opacity: 0.15 + Math.random() * 0.25,
    }))
  }, [count])

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: p.opacity,
            animation: `floatParticle ${p.duration}s ease-in-out ${p.delay}s infinite`,
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  )
}
