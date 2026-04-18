import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { ACTIVITY_LABELS_AR } from '@/pages/student/curriculum/unit-v2/missions/missionConstants'

/**
 * Thin banner shown above each activity page linking it to the unit's bigger story.
 * Usage: <ContextRibbon unit={unit} activityType="reading" />
 * Silently hidden when unit has no generated ribbons yet.
 */
export default function ContextRibbon({ unit, activityType }) {
  const text = unit?.activity_ribbons?.[activityType]
  if (!text) return null

  const label = ACTIVITY_LABELS_AR[activityType] || activityType

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      dir="rtl"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 18px',
        borderRadius: '14px',
        background: 'linear-gradient(90deg, rgba(56,189,248,0.07), rgba(251,191,36,0.04))',
        border: '1px solid rgba(255,255,255,0.07)',
        fontFamily: "'Tajawal', sans-serif",
        marginBottom: '20px',
      }}
    >
      <Sparkles size={15} color="var(--cinematic-accent-gold, #fbbf24)" style={{ flexShrink: 0 }} />
      <div style={{ fontSize: '14px', lineHeight: 1.55 }}>
        <span style={{ fontWeight: 800, color: 'var(--cinematic-accent-cyan, #22d3ee)' }}>{label}:</span>{' '}
        <span style={{ color: 'rgba(248,250,252,0.7)' }}>{text}</span>
      </div>
    </motion.div>
  )
}
