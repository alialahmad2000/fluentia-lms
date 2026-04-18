import { motion } from 'framer-motion'

export default function BriefHero({ unit, level, prefersReducedMotion }) {
  const levelNum = level?.level_number ?? ''
  const levelName = level?.name_ar ?? ''
  const cefr = level?.cefr ?? ''

  return (
    <div style={{ textAlign: 'center', paddingBottom: 'clamp(24px, 4vw, 40px)', borderBottom: '1px solid var(--ds-border-subtle)' }}>
      {/* Cover image or unit number bubble */}
      {unit.cover_image_url ? (
        <motion.div
          initial={prefersReducedMotion ? {} : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
          style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}
        >
          <img
            src={unit.cover_image_url}
            alt={unit.theme_ar}
            style={{
              width: 'clamp(80px, 16vw, 140px)',
              height: 'clamp(80px, 16vw, 140px)',
              borderRadius: '24px',
              objectFit: 'cover',
              border: '2px solid var(--ds-border-strong)',
              boxShadow: 'var(--ds-shadow-glow)',
            }}
          />
        </motion.div>
      ) : (
        <motion.div
          initial={prefersReducedMotion ? {} : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            margin: '0 auto 20px',
            width: 'clamp(72px, 14vw, 120px)',
            height: 'clamp(72px, 14vw, 120px)',
            borderRadius: '24px',
            background: 'var(--ds-surface-2)',
            border: '2px solid var(--ds-border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'clamp(28px, 6vw, 48px)',
            fontWeight: 900,
            color: 'var(--ds-accent-gold)',
          }}
        >
          {unit.unit_number}
        </motion.div>
      )}

      {/* Level chip */}
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-block',
          padding: '4px 14px',
          borderRadius: '99px',
          background: 'var(--ds-surface-2)',
          border: '1px solid var(--ds-border-strong)',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--ds-accent-gold)',
          fontFamily: "'Inter', sans-serif",
          letterSpacing: '0.5px',
        }}>
          {cefr} — L{levelNum}
        </span>
        {levelName && (
          <span style={{
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: '99px',
            background: 'var(--ds-surface-1)',
            border: '1px solid var(--ds-border-subtle)',
            fontSize: '12px',
            color: 'var(--ds-text-secondary)',
          }}>
            {levelName}
          </span>
        )}
      </div>

      {/* Unit title */}
      <h1 style={{
        fontFamily: "'Playfair Display', 'Amiri', serif",
        fontSize: 'clamp(22px, 5vw, 38px)',
        fontWeight: 700,
        color: 'var(--ds-text-primary)',
        lineHeight: 1.2,
        marginBottom: '8px',
      }}>
        الوحدة {unit.unit_number}: {unit.theme_ar || unit.theme_en}
      </h1>

      {unit.description_ar && (
        <p style={{ fontSize: 'clamp(13px, 2.5vw, 16px)', color: 'var(--ds-text-secondary)', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
          {unit.description_ar}
        </p>
      )}
    </div>
  )
}
