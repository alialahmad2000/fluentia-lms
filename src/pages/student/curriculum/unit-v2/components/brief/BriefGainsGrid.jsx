import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

function formatTime(minutes) {
  if (minutes < 60) return `${minutes} دقيقة`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h} ساعة ${m} دق` : `${h} ساعة`
}

function CountUp({ target, duration = 1200, prefersReducedMotion }) {
  const [val, setVal] = useState(prefersReducedMotion ? target : 0)
  const rafRef = useRef()

  useEffect(() => {
    if (prefersReducedMotion) { setVal(target); return }
    const start = performance.now()
    function step(now) {
      const elapsed = now - start
      const pct = Math.min(elapsed / duration, 1)
      setVal(Math.round(pct * target))
      if (pct < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, prefersReducedMotion])

  return <>{val}</>
}

function StatCard({ icon, value, label, sub, delay, prefersReducedMotion }) {
  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      style={{
        background: 'var(--ds-surface-1)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: '16px',
        padding: 'clamp(14px, 3vw, 22px)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 'clamp(22px, 5vw, 32px)', marginBottom: '8px' }}>{icon}</div>
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 'clamp(20px, 4.5vw, 28px)',
        fontWeight: 900,
        color: 'var(--ds-accent-gold)',
        lineHeight: 1,
        marginBottom: '6px',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 'clamp(11px, 2vw, 13px)', color: 'var(--ds-text-secondary)', lineHeight: 1.4 }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--ds-text-tertiary)', marginTop: '3px' }}>{sub}</div>}
    </motion.div>
  )
}

export default function BriefGainsGrid({ stats, unit, prefersReducedMotion }) {
  const { vocabCount, readingsCount, listeningCount, totalXp, totalMinutes, readingWords } = stats

  const cards = [
    {
      icon: '📚',
      value: <><CountUp target={vocabCount} prefersReducedMotion={prefersReducedMotion} /> كلمة</>,
      label: 'مفردات جديدة',
    },
    {
      icon: '📖',
      value: readingsCount,
      label: `نص${readingsCount !== 1 ? 'وص' : ''}`,
      sub: readingWords > 0 ? `${readingWords.toLocaleString('ar')} كلمة إجمالاً` : null,
    },
    {
      icon: '🎧',
      value: listeningCount || '—',
      label: listeningCount ? 'تمرين استماع' : 'بدون استماع',
    },
    {
      icon: '⭐',
      value: <><CountUp target={totalXp} duration={1500} prefersReducedMotion={prefersReducedMotion} /> XP</>,
      label: 'نقاط متاحة',
    },
    {
      icon: '⏱️',
      value: formatTime(totalMinutes),
      label: 'الوقت التقريبي',
    },
    {
      icon: '🎯',
      value: unit.theme_en || '—',
      label: 'موضوع الوحدة',
    },
  ]

  return (
    <div>
      <div style={{
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--ds-text-tertiary)',
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        marginBottom: '14px',
        fontFamily: "'Tajawal', sans-serif",
      }}>
        ماذا ستكتسبين؟
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 'clamp(8px, 2vw, 14px)',
      }}>
        {cards.map((card, i) => (
          <StatCard key={i} {...card} delay={i * 0.07} prefersReducedMotion={prefersReducedMotion} />
        ))}
      </div>
    </div>
  )
}
