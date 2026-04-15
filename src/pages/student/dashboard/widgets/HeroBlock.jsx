import { motion, useReducedMotion } from 'framer-motion'
import { Zap, Flame, Trophy } from 'lucide-react'
import GlassPanel from '../../../../design-system/components/GlassPanel'
import AnimatedNumber from '../../../../components/ui/AnimatedNumber'
import { getGreeting } from '../../../../utils/dateHelpers'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../../../lib/constants'
import { firstNameFrom } from '../../../../utils/names'

function getLevel(xp) {
  for (let i = GAMIFICATION_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= GAMIFICATION_LEVELS[i].xp) return GAMIFICATION_LEVELS[i]
  }
  return GAMIFICATION_LEVELS[0]
}

function getNextLevel(xp) {
  for (const lvl of GAMIFICATION_LEVELS) {
    if (xp < lvl.xp) return lvl
  }
  return null
}

// Skeleton
export function HeroSkeleton() {
  return (
    <GlassPanel padding="lg" className="relative overflow-hidden">
      <div className="space-y-4 animate-pulse">
        <div className="h-7 w-48 rounded-lg" style={{ background: 'var(--ds-surface-2)' }} />
        <div className="h-4 w-32 rounded" style={{ background: 'var(--ds-surface-2)' }} />
        <div className="flex gap-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-24 rounded-xl" style={{ background: 'var(--ds-surface-2)' }} />
          ))}
        </div>
        <div className="h-2 w-full rounded-full mt-3" style={{ background: 'var(--ds-surface-2)' }} />
      </div>
    </GlassPanel>
  )
}

export default function HeroBlock({ profile, studentData, loading }) {
  const reducedMotion = useReducedMotion()

  if (loading) return <HeroSkeleton />

  const firstName = firstNameFrom(profile?.full_name) || profile?.display_name || ''
  const xp = studentData?.xp_total || 0
  const streak = studentData?.current_streak || 0
  const currentLevel = getLevel(xp)
  const nextLevel = getNextLevel(xp)
  const xpRange = nextLevel ? (nextLevel.xp - currentLevel.xp) : 0
  const xpProgress = nextLevel && xpRange > 0 ? ((xp - currentLevel.xp) / xpRange) * 100 : 100
  const academicLevel = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]
  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas

  const fadeUp = reducedMotion
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }

  return (
    <GlassPanel padding="lg" glow className="relative overflow-hidden">
      <div className="relative">
        {/* Greeting */}
        <motion.h1
          {...fadeUp}
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: 'var(--ds-text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
            marginBottom: 4,
          }}
        >
          {getGreeting()}، {firstName}
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.05 }}
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--ds-text-secondary)',
          }}
        >
          {pkg.name_ar} &middot; {academicLevel.name_ar} ({academicLevel.cefr})
        </motion.p>

        {/* Badges row */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          className="flex flex-wrap items-center gap-3 mt-5"
        >
          {/* XP Badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--ds-surface-2)' }}
          >
            <Zap size={16} strokeWidth={1.5} style={{ color: 'var(--ds-accent-primary)' }} />
            <span
              className="text-sm font-bold font-data"
              style={{ color: 'var(--ds-accent-primary)' }}
            >
              <AnimatedNumber value={xp} /> XP
            </span>
          </div>

          {/* Streak Badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--ds-surface-2)' }}
          >
            <Flame
              size={16}
              strokeWidth={1.5}
              className={streak >= 3 ? 'fire-pulse' : ''}
              style={{ color: 'var(--ds-accent-gold, var(--ds-accent-warning))' }}
            />
            <span
              className="text-sm font-bold font-data"
              style={{ color: 'var(--ds-accent-gold, var(--ds-accent-warning))' }}
            >
              <AnimatedNumber value={streak} duration={0.6} /> يوم
            </span>
          </div>

          {/* Level Badge */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--ds-surface-2)' }}
          >
            <Trophy size={16} strokeWidth={1.5} style={{ color: 'var(--ds-accent-secondary)' }} />
            <span
              className="text-sm font-bold"
              style={{ color: 'var(--ds-accent-secondary)' }}
            >
              {currentLevel.title_ar}
            </span>
          </div>
        </motion.div>

        {/* XP Progress bar */}
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.15 }}
          className="mt-4 max-w-md"
        >
          <div className="flex justify-between mb-1">
            <span className="text-[11px] font-data" style={{ color: 'var(--ds-text-tertiary)' }}>
              المستوى {currentLevel.level}
            </span>
            <span className="text-[11px] font-data" style={{ color: 'var(--ds-text-tertiary)' }}>
              {nextLevel ? nextLevel.title_ar : 'MAX'}
            </span>
          </div>
          <div
            className="rounded-full overflow-hidden"
            style={{
              height: 6,
              background: 'var(--ds-surface-2)',
            }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--ds-accent-primary)' }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(xpProgress, 100)}%` }}
              transition={reducedMotion ? { duration: 0 } : { delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      </div>
    </GlassPanel>
  )
}
