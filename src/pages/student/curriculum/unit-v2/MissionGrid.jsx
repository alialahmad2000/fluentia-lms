import { motion } from 'framer-motion'
import { CINEMATIC_TOKENS as V1, useCinematicMotion } from '../_premiumPrimitives'
import MissionCard from './MissionCard'

const staggerParent = {
  animate: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

export default function MissionGrid({ activities = [], onSelect }) {
  const { reduced } = useCinematicMotion()

  return (
    <div style={{ width: '100%' }}>
      {/* ── Section title ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '24px',
          direction: 'rtl',
        }}
      >
        {/* Decorative gold diamond */}
        <span
          style={{
            fontSize: '14px',
            color: 'var(--cinematic-accent-gold)',
            lineHeight: 1,
            filter: 'drop-shadow(0 0 4px var(--cinematic-accent-gold-soft))',
          }}
        >
          ◆
        </span>

        <h2
          style={{
            margin: 0,
            fontSize: '28px',
            fontFamily: "'Playfair Display', serif",
            fontWeight: 700,
            color: V1.textPrimary,
            lineHeight: 1.2,
          }}
        >
          رحلتك في هذه الوحدة
        </h2>
      </div>

      {/* ── Card grid ── */}
      <motion.div
        variants={reduced ? undefined : staggerParent}
        initial="initial"
        animate="animate"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
          width: '100%',
        }}
      >
        {activities.map((activity, index) => (
          <MissionCard
            key={activity.key}
            activity={activity}
            index={index}
            onSelect={onSelect}
          />
        ))}
      </motion.div>
    </div>
  )
}
