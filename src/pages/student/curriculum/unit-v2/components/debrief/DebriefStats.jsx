import { useEffect, useRef } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'

function AnimatedCounter({ from = 0, to, duration = 1.2, suffix = '' }) {
  const val = useMotionValue(from)
  const ref = useRef(null)

  useEffect(() => {
    const ctrl = animate(val, to, {
      duration,
      ease: 'easeOut',
      onUpdate: v => {
        if (ref.current) ref.current.textContent = Math.round(v) + suffix
      },
    })
    return () => ctrl.stop()
  }, [to])

  return <span ref={ref}>{from}{suffix}</span>
}

function StatCard({ emoji, value, label, delay, color = '#fbbf24' }) {
  const prefersReduced = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: 'clamp(16px, 3vw, 24px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '8px', textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '36px' }}>{emoji}</div>
      <div style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 900, color }}>
        {prefersReduced
          ? `${value}`
          : <AnimatedCounter to={value} duration={1.2 + delay} />}
      </div>
      <div style={{ fontSize: '13px', color: 'rgba(248,250,252,0.6)', fontFamily: "'Tajawal', sans-serif" }}>
        {label}
      </div>
    </motion.div>
  )
}

export default function DebriefStats({ data }) {
  const { stats, streak } = data
  const cards = [
    { emoji: '📚', value: stats.vocabGained, label: 'كلمة جديدة في قاموسكِ', color: '#4ade80', delay: 0 },
    { emoji: '⚡', value: stats.unitXp, label: 'XP مكتسبة', color: '#fbbf24', delay: 0.15 },
    { emoji: '⏱️', value: stats.minutes, label: 'دقيقة تركيز', color: '#38bdf8', delay: 0.3 },
    streak > 0 && { emoji: '🔥', value: streak, label: `سلسلة ${streak} أيام`, color: '#fb923c', delay: 0.45 },
  ].filter(Boolean)

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 800, textAlign: 'center', color: 'rgba(248,250,252,0.95)' }}
      >
        ما حقّقتِه في هذه الوحدة
      </motion.h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '12px',
      }}>
        {cards.map(c => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>
    </div>
  )
}
