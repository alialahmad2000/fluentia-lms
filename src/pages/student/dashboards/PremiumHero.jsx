import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, Flame, Sparkles, Play } from 'lucide-react'
import AnimatedNumber from '../../../components/ui/AnimatedNumber'
import GlassPanel from '../../../design-system/components/GlassPanel'
import { getGreeting } from '../../../utils/dateHelpers'
import { firstNameFrom } from '../../../utils/names'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../../lib/constants'
import { APPLE_EASE } from './_premiumShell'

/* ------------------------------------------------------------------ *
 * PremiumHero — the production dashboard's opening movement.
 * Editorial glass hero built on the SAME real data the legacy block used
 * (xp_total, current_streak, academic_level, package + the gamification
 * level ladder). The level emblem (a true XP-progress ring) is the focal
 * point; everything else orbits it calmly. No placeholders.
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

/* Circular XP-progress ring with the gamification level at its heart. */
function LevelRing({ level, title, progress, reduced }) {
  const R = 64
  const C = 2 * Math.PI * R
  const pct = Math.max(0, Math.min(progress, 100))
  const offset = C * (1 - pct / 100)

  return (
    <div
      className="relative shrink-0"
      style={{ width: 'clamp(116px, 30vw, 152px)', aspectRatio: '1 / 1' }}
    >
      <svg viewBox="0 0 160 160" width="100%" height="100%" role="img" aria-label={`المستوى ${level}`}>
        <defs>
          <linearGradient id="pdRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ds-accent-primary)" />
            <stop offset="100%" stopColor="var(--ds-accent-gold, var(--ds-accent-secondary))" />
          </linearGradient>
        </defs>
        <g transform="rotate(-90 80 80)">
          <circle cx="80" cy="80" r={R} fill="none" stroke="var(--ds-surface-3)" strokeWidth="11" />
          <motion.circle
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke="url(#pdRingGrad)"
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: offset }}
            transition={reduced ? { duration: 0 } : { delay: 0.35, duration: 1.1, ease: 'easeOut' }}
            style={{ filter: 'drop-shadow(0 0 6px var(--ds-accent-primary-glow))' }}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', color: 'var(--ds-text-tertiary)', textTransform: 'uppercase' }}>
          المستوى
        </span>
        <span
          className="font-data"
          style={{ fontSize: 'clamp(30px, 8vw, 40px)', fontWeight: 800, lineHeight: 1, color: 'var(--ds-text-primary)', marginTop: 2 }}
        >
          {level}
        </span>
        <span
          className="truncate"
          style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-accent-primary)', marginTop: 4, maxWidth: '88%' }}
        >
          {title}
        </span>
      </div>
    </div>
  )
}

function Pill({ icon, value, suffix, label, pulse }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        background: 'var(--ds-surface-2)',
        border: '1px solid var(--ds-border-subtle)',
        flex: '1 1 0',
        minWidth: 0,
      }}
    >
      <span
        className="flex items-center justify-center rounded-xl shrink-0"
        style={{ width: 38, height: 38, background: 'var(--ds-surface-3)' }}
      >
        {icon}
      </span>
      <span className="flex flex-col leading-none min-w-0">
        <span className="font-data font-bold leading-none" style={{ fontSize: 20, color: 'var(--ds-text-primary)' }}>
          {typeof value === 'number' ? <AnimatedNumber value={value} duration={pulse ? 0.6 : 1} /> : value}
          {suffix ? <span style={{ fontSize: 12, marginInlineStart: 4, color: 'var(--ds-text-tertiary)', fontWeight: 600 }}>{suffix}</span> : null}
        </span>
        <span className="truncate" style={{ fontSize: 11.5, marginTop: 5, color: 'var(--ds-text-tertiary)', fontWeight: 500 }}>
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
  const xpToNext = nextLevel ? Math.max(0, nextLevel.xp - xp) : 0
  const academicLevel = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]
  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas

  const rise = reduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduced ? undefined : { duration: 0.7, ease: APPLE_EASE }}
      style={{ position: 'relative', zIndex: 1 }}
    >
      <GlassPanel padding="lg" glow className="relative overflow-hidden">
        {/* warm interior bloom in the inline-end / top corner */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            insetBlockStart: '-40%',
            insetInlineEnd: '-12%',
            width: 'min(70%, 460px)',
            height: '160%',
            background:
              'radial-gradient(circle at 70% 30%, var(--ds-accent-primary-glow), transparent 60%)',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        />
        {/* top hairline highlight */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            insetInline: 0,
            top: 0,
            height: 1,
            background: 'linear-gradient(90deg, transparent, var(--ds-border-strong), transparent)',
            opacity: 0.7,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Identity + level emblem */}
          <div className="flex items-center gap-4 sm:gap-7">
            <div className="min-w-0 flex-1">
              <motion.p
                {...rise}
                transition={reduced ? undefined : { duration: 0.5, ease: APPLE_EASE }}
                className="flex items-center gap-1.5"
                style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--ds-text-tertiary)', margin: 0 }}
              >
                <Sparkles size={13} strokeWidth={2} style={{ color: 'var(--ds-accent-primary)' }} />
                {getGreeting()}
              </motion.p>
              <motion.h1
                {...rise}
                transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.05 }}
                style={{
                  fontSize: 'clamp(25px, 6.2vw, 36px)',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.18,
                  color: 'var(--ds-text-primary)',
                  margin: '8px 0 0',
                }}
              >
                {firstName ? `أهلاً بعودتك، ${firstName}` : 'أهلاً بعودتك'}
              </motion.h1>
              <motion.p
                {...rise}
                transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.1 }}
                style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ds-text-secondary)', margin: '10px 0 0' }}
              >
                {pkg.name_ar}
                <span style={{ color: 'var(--ds-text-tertiary)', margin: '0 8px' }}>·</span>
                {academicLevel.name_ar}
                <span style={{ color: 'var(--ds-text-tertiary)', marginInlineStart: 6, fontWeight: 500 }}>({academicLevel.cefr})</span>
              </motion.p>
            </div>

            <motion.div
              {...rise}
              transition={reduced ? undefined : { duration: 0.6, ease: APPLE_EASE, delay: 0.12 }}
            >
              <LevelRing
                level={currentLevel.level}
                title={currentLevel.title_ar}
                progress={xpProgress}
                reduced={reduced}
              />
            </motion.div>
          </div>

          {/* Real metric pills */}
          <motion.div
            {...rise}
            transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.16 }}
            className="flex gap-3"
            style={{ marginTop: 'var(--space-5)' }}
          >
            <Pill
              icon={<Zap size={18} strokeWidth={1.9} style={{ color: 'var(--ds-accent-primary)' }} />}
              value={xp}
              suffix="XP"
              label="نقاط الخبرة"
            />
            <Pill
              icon={
                <Flame
                  size={18}
                  strokeWidth={1.9}
                  className={streak >= 3 ? 'fire-pulse' : ''}
                  style={{ color: 'var(--ds-accent-gold, var(--ds-accent-warning))' }}
                />
              }
              value={streak}
              suffix="يوم"
              label="سلسلة متّصلة"
              pulse
            />
          </motion.div>

          {/* CTA + next-level helper */}
          <motion.div
            {...rise}
            transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.2 }}
            className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ marginTop: 'var(--space-5)' }}
          >
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ds-text-tertiary)', fontWeight: 500 }}>
              {nextLevel ? (
                <>
                  باقٍ{' '}
                  <span className="font-data" style={{ color: 'var(--ds-accent-primary)', fontWeight: 700 }}>
                    {xpToNext.toLocaleString('en-US')}
                  </span>{' '}
                  نقطة للوصول إلى <span style={{ color: 'var(--ds-text-secondary)', fontWeight: 600 }}>{nextLevel.title_ar}</span>
                </>
              ) : (
                'بلغتِ أعلى مستوى — استمرّي في التألّق ✦'
              )}
            </p>

            <motion.div
              whileHover={reduced ? undefined : { scale: 1.03 }}
              whileTap={reduced ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.25, ease: APPLE_EASE }}
              className="shrink-0"
            >
              <Link
                to="/student/curriculum"
                className="pd-cta inline-flex items-center justify-center gap-2 rounded-full font-bold"
                style={{
                  padding: '13px 28px',
                  minHeight: 48,
                  fontSize: 15,
                  background: 'linear-gradient(135deg, var(--ds-accent-primary), var(--ds-accent-gold, var(--ds-accent-primary)))',
                  color: 'var(--ds-text-inverse)',
                  textDecoration: 'none',
                  boxShadow: '0 18px 38px -16px var(--ds-accent-primary-glow)',
                }}
              >
                <Play size={17} strokeWidth={2.4} fill="currentColor" />
                <span style={{ position: 'relative', zIndex: 1 }}>متابعة التعلّم</span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </GlassPanel>
    </motion.div>
  )
}
