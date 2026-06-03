import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, Flame, Trophy, Play } from 'lucide-react'
import AnimatedNumber from '../../../components/ui/AnimatedNumber'
import GlassPanel from '../../../design-system/components/GlassPanel'
import { getGreeting } from '../../../utils/dateHelpers'
import { firstNameFrom } from '../../../utils/names'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../../lib/constants'
import { APPLE_EASE } from './_premiumShell'

/* ------------------------------------------------------------------ *
 * PremiumHero — the production dashboard's opening movement.
 * Apple-grade glass hero that breathes, built on the SAME real data the
 * legacy HeroBlock used (xp_total, current_streak, academic_level,
 * package + the gamification-level ladder). No placeholders.
 * ------------------------------------------------------------------ */

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

function Stat({ icon, value, suffix, label, pulse }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5"
      style={{
        background: 'var(--ds-surface-2)',
        border: '1px solid var(--ds-border-subtle)',
        flex: '0 0 auto',
      }}
    >
      <span
        className="flex items-center justify-center rounded-xl"
        style={{ width: 30, height: 30, background: 'var(--ds-surface-3)', flex: '0 0 auto' }}
      >
        {icon}
      </span>
      <span className="flex flex-col leading-none">
        <span
          className="font-data font-bold leading-none"
          style={{ fontSize: 17, color: 'var(--ds-text-primary)' }}
        >
          {typeof value === 'number' ? <AnimatedNumber value={value} duration={pulse ? 0.6 : 1} /> : value}
          {suffix ? <span style={{ fontSize: 12, marginInlineStart: 3, color: 'var(--ds-text-tertiary)' }}>{suffix}</span> : null}
        </span>
        <span style={{ fontSize: 11, marginTop: 4, color: 'var(--ds-text-tertiary)', fontWeight: 500 }}>
          {label}
        </span>
      </span>
    </div>
  )
}

export default function PremiumHero({ profile, studentData }) {
  const reduced = useReducedMotion()

  const firstName = firstNameFrom(profile?.full_name) || profile?.display_name || ''
  const xp = studentData?.xp_total || 0
  const streak = studentData?.current_streak || 0
  const currentLevel = getLevel(xp)
  const nextLevel = getNextLevel(xp)
  const xpRange = nextLevel ? nextLevel.xp - currentLevel.xp : 0
  const xpProgress = nextLevel && xpRange > 0 ? ((xp - currentLevel.xp) / xpRange) * 100 : 100
  const academicLevel = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]
  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas

  const rise = reduced
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduced ? undefined : { duration: 0.7, ease: APPLE_EASE }}
      style={{ position: 'relative', zIndex: 1 }}
    >
      <GlassPanel padding="lg" glow className="relative overflow-hidden">
        {/* soft inner highlight along the top edge */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            insetInline: 0,
            top: 0,
            height: 1,
            background:
              'linear-gradient(90deg, transparent, var(--ds-border-strong), transparent)',
            opacity: 0.7,
          }}
        />

        {/* Greeting + identity */}
        <motion.p
          {...rise}
          transition={reduced ? undefined : { duration: 0.5, ease: APPLE_EASE }}
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text-tertiary)', margin: 0 }}
        >
          {getGreeting()}
        </motion.p>
        <motion.h1
          {...rise}
          transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.05 }}
          style={{
            fontSize: 'clamp(26px, 6vw, 34px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: 'var(--ds-text-primary)',
            margin: '6px 0 0',
          }}
        >
          {firstName ? `أهلاً بعودتك، ${firstName}` : 'أهلاً بعودتك'}
        </motion.h1>
        <motion.p
          {...rise}
          transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.1 }}
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--ds-text-secondary)', margin: '8px 0 0' }}
        >
          {pkg.name_ar} <span style={{ color: 'var(--ds-text-tertiary)' }}>·</span> {academicLevel.name_ar} ({academicLevel.cefr})
        </motion.p>

        {/* Real stat chips */}
        <motion.div
          {...rise}
          transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.15 }}
          className="flex flex-wrap gap-2.5"
          style={{ marginTop: 'var(--space-5)' }}
        >
          <Stat
            icon={<Zap size={16} strokeWidth={1.75} style={{ color: 'var(--ds-accent-primary)' }} />}
            value={xp}
            suffix="XP"
            label="نقاط الخبرة"
          />
          <Stat
            icon={
              <Flame
                size={16}
                strokeWidth={1.75}
                className={streak >= 3 ? 'fire-pulse' : ''}
                style={{ color: 'var(--ds-accent-gold, var(--ds-accent-warning))' }}
              />
            }
            value={streak}
            suffix="يوم"
            label="سلسلة متصلة"
            pulse
          />
          <Stat
            icon={<Trophy size={16} strokeWidth={1.75} style={{ color: 'var(--ds-accent-secondary)' }} />}
            value={currentLevel.title_ar}
            label={`المستوى ${currentLevel.level}`}
          />
        </motion.div>

        {/* Level progress + primary CTA */}
        <motion.div
          {...rise}
          transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.2 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
          style={{ marginTop: 'var(--space-5)' }}
        >
          <div className="w-full sm:max-w-md">
            <div className="flex justify-between mb-1.5">
              <span className="font-data" style={{ fontSize: 11, color: 'var(--ds-text-tertiary)' }}>
                {currentLevel.title_ar}
              </span>
              <span className="font-data" style={{ fontSize: 11, color: 'var(--ds-text-tertiary)' }}>
                {nextLevel ? nextLevel.title_ar : 'أعلى مستوى'}
              </span>
            </div>
            <div
              className="rounded-full overflow-hidden"
              style={{ height: 6, background: 'var(--ds-surface-2)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, var(--ds-accent-primary), var(--ds-accent-gold, var(--ds-accent-primary)))',
                  boxShadow: '0 0 12px var(--ds-accent-primary-glow)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                transition={reduced ? { duration: 0 } : { delay: 0.35, duration: 0.9, ease: 'easeOut' }}
              />
            </div>
          </div>

          <motion.div
            whileHover={reduced ? undefined : { scale: 1.03 }}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            transition={{ duration: 0.25, ease: APPLE_EASE }}
            className="shrink-0"
          >
            <Link
              to="/student/curriculum"
              className="inline-flex items-center gap-2 rounded-full font-bold"
              style={{
                padding: '12px 26px',
                minHeight: 44,
                fontSize: 15,
                background: 'var(--ds-accent-primary)',
                color: 'var(--ds-text-inverse)',
                textDecoration: 'none',
                boxShadow: '0 16px 32px -14px var(--ds-accent-primary-glow)',
              }}
            >
              <Play size={17} strokeWidth={2.4} fill="currentColor" />
              متابعة التعلّم
            </Link>
          </motion.div>
        </motion.div>
      </GlassPanel>
    </motion.div>
  )
}
