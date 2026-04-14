import { motion } from 'framer-motion'

const ARABIC_RE = /[\u0600-\u06FF]/

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function SectionHeader({ kicker, title, subtitle, align = 'start' }) {
  const isArabic = ARABIC_RE.test(title || '')
  const textAlign = align === 'center' ? 'center' : undefined

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      style={{ textAlign, marginBlockEnd: 'var(--space-6)' }}
    >
      {kicker && (
        <motion.p
          custom={0}
          variants={staggerItem}
          style={{
            fontSize: 13,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--ds-accent-primary)',
            marginBlockEnd: 'var(--space-2)',
          }}
        >
          {kicker}
        </motion.p>
      )}

      {title && (
        <motion.h2
          custom={1}
          variants={staggerItem}
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontWeight: 800,
            lineHeight: 1.2,
            color: 'var(--ds-text-primary)',
            fontFamily: isArabic ? "'Tajawal', sans-serif" : "'Playfair Display', serif",
            marginBlockEnd: subtitle ? 'var(--space-2)' : 0,
          }}
        >
          {title}
        </motion.h2>
      )}

      {subtitle && (
        <motion.p
          custom={2}
          variants={staggerItem}
          style={{
            fontSize: 16,
            color: 'var(--ds-text-secondary)',
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  )
}
