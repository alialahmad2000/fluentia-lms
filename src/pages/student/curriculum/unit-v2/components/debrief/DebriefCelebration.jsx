import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { safeCelebrate } from '@/lib/celebrations'

export default function DebriefCelebration({ data }) {
  const { unit, level } = data

  useEffect(() => {
    try { safeCelebrate('unit_complete') } catch {}
  }, [])

  return (
    <div dir="rtl" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '24px', textAlign: 'center', padding: '20px 0',
    }}>
      {/* Trophy */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.1 }}
        style={{ fontSize: 'clamp(72px, 15vw, 100px)', lineHeight: 1 }}
      >
        🏆
      </motion.div>

      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          fontSize: '12px', fontWeight: 700, letterSpacing: '2px',
          color: 'var(--cinematic-accent-gold, #fbbf24)',
          textTransform: 'uppercase',
        }}
      >
        أنجزتِ الوحدة ✦ {level?.cefr}
      </motion.div>

      {/* Unit number */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        style={{
          margin: 0,
          fontFamily: "'Playfair Display', 'Amiri', serif",
          fontSize: 'clamp(28px, 6vw, 48px)',
          fontWeight: 900,
          lineHeight: 1.2,
          background: 'linear-gradient(135deg, #f5c842, #fde68a, #f59e0b)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        الوحدة {unit?.unit_number}: {unit?.theme_ar || unit?.theme_en}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{ margin: 0, color: 'rgba(248,250,252,0.6)', fontSize: '16px' }}
      >
        استحقّيتِ هذه اللحظة 🌟
      </motion.p>
    </div>
  )
}
