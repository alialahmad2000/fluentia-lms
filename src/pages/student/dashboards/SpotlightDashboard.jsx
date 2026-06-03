import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Play,
  ChevronDown,
  BookOpen,
  RefreshCw,
  SpellCheck,
  Mic,
  Layers,
  Trophy,
  TrendingUp,
  Flame,
  GraduationCap,
  CalendarClock,
  Radio,
  Zap,
} from 'lucide-react'

import { useAuthStore } from '../../../stores/authStore'
import { useG } from '../../../i18n/gender'
import StudentDashboardSkeleton from '../../../components/skeletons/StudentDashboardSkeleton'

import { AmbientField, APPLE_EASE } from './_premiumShell'
import './premiumDashboard.css'

import { getGreeting } from '../../../utils/dateHelpers'
import { firstNameFrom } from '../../../utils/names'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../../lib/constants'
import GlassPanel from '../../../design-system/components/GlassPanel'
import { useNextLesson } from './useNextLesson'

/* Real, self-gating widgets — each owns its own query / realtime + empty state. */
import DailyProgressWidget from '../../../components/student/dashboard/DailyProgressWidget'
import WeeklyProgressWidget from '../../../components/student/dashboard/WeeklyProgressWidget'
import StreakWidget from '../../../components/student/StreakWidget'
import TeamCard from '../../../components/student/TeamCard'
import NextClassWidget from '../dashboard/widgets/NextClassWidget'
import SrsReviewCard from '../../../components/gamification/SrsReviewCard'
import LevelExitTestCard from '../../../components/gamification/LevelExitTestCard'
import MysteryBox from '../../../components/gamification/MysteryBox'
import LiveLevelActivityFeed from '../../../components/student/dashboard/LiveLevelActivityFeed'
import RetentionDashboardSection from '../../../components/retention/RetentionDashboardSection'

/* ══════════════════════════════════════════════════════════════════════ *
 * Fluentia LMS — STUDENT DASHBOARD VARIANT  ·  "Today Spotlight / تركيز اليوم"
 *
 * A focus-first, calm, premium take (Apple Fitness + Netflix "continue
 * watching"). ONE cinematic mission hero hands the student exactly one thing
 * to do; a slim horizontal chip rail gives quick paths; everything else lives
 * in elegant collapsible sections (collapsed by default) so the screen stays
 * intentional and uncluttered. Personal-coach energy, zero clutter.
 *
 * No props — reads the auth store itself (like PremiumDashboard). All data
 * paths and widgets are LIVE; nothing is faked.
 * ══════════════════════════════════════════════════════════════════════ */

/* ── gamification level math (mirrors PremiumHero) ── */
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

/* The live quick-action paths for the chip rail (verified-live routes only). */
const PATH_CHIPS = [
  { to: '/student/curriculum', label: 'التعلّم', icon: BookOpen },
  { to: '/student/srs', label: 'مراجعة', icon: RefreshCw },
  { to: '/student/spelling-lab', label: 'إملاء', icon: SpellCheck },
  { to: '/student/speaking-hub', label: 'محادثة', icon: Mic },
  { to: '/student/flashcards', label: 'مفردات', icon: Layers },
  { to: '/student/leaderboard', label: 'المتصدّرون', icon: Trophy },
]

/* ── compact corner level emblem: number + slim XP-to-next ring ── */
function LevelEmblem({ level, progress, reduced }) {
  const R = 26
  const C = 2 * Math.PI * R
  const pct = Math.max(0, Math.min(progress, 100))
  const offset = C * (1 - pct / 100)

  return (
    <div className="relative shrink-0" style={{ width: 66, height: 66 }}>
      <svg viewBox="0 0 66 66" width="66" height="66" role="img" aria-label={`المستوى ${level}`}>
        <defs>
          <linearGradient id="sdEmblemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ds-accent-primary)" />
            <stop offset="100%" stopColor="var(--ds-accent-gold, var(--ds-accent-secondary))" />
          </linearGradient>
        </defs>
        <g transform="rotate(-90 33 33)">
          <circle cx="33" cy="33" r={R} fill="none" stroke="var(--ds-surface-3)" strokeWidth="5" />
          <motion.circle
            cx="33"
            cy="33"
            r={R}
            fill="none"
            stroke="url(#sdEmblemGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: offset }}
            transition={reduced ? { duration: 0 } : { delay: 0.5, duration: 1, ease: 'easeOut' }}
            style={{ filter: 'drop-shadow(0 0 4px var(--ds-accent-primary-glow))' }}
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ textAlign: 'center' }}>
        <span
          style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', lineHeight: 1 }}
        >
          LVL
        </span>
        <span
          className="font-data"
          style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: 'var(--ds-text-primary)', marginTop: 1 }}
        >
          {level}
        </span>
      </div>
    </div>
  )
}

/* ── compact real-stat chip for the hero (XP / streak) ── */
function HeroStat({ icon, value, suffix }) {
  return (
    <span
      className="inline-flex items-center gap-2"
      style={{
        padding: '8px 14px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--ds-surface-2)',
        border: '1px solid var(--ds-border-subtle)',
      }}
    >
      {icon}
      <span className="font-data font-bold" style={{ fontSize: 15, color: 'var(--ds-text-primary)', lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString('en-US') : value}
        {suffix ? (
          <span style={{ fontSize: 11, marginInlineStart: 3, color: 'var(--ds-text-tertiary)', fontWeight: 600 }}>
            {suffix}
          </span>
        ) : null}
      </span>
    </span>
  )
}

/* ── reusable collapsible accordion section (own hooks → rules-of-hooks safe) ── */
function Section({ title, icon: Icon, defaultOpen = false, children }) {
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(defaultOpen)
  const headingId = `sd-sec-${title}`

  return (
    <section
      style={{
        background: 'var(--ds-surface-1)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--ds-shadow-sm)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={headingId}
        className="flex w-full items-center gap-3"
        style={{
          padding: 'var(--space-4) var(--space-5)',
          minHeight: 60,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'start',
          color: 'var(--ds-text-primary)',
        }}
      >
        <span
          className="flex items-center justify-center rounded-xl shrink-0"
          style={{ width: 38, height: 38, background: 'var(--ds-surface-3)', border: '1px solid var(--ds-border-subtle)' }}
        >
          <Icon size={18} strokeWidth={1.9} style={{ color: 'var(--ds-accent-primary)' }} />
        </span>
        <span
          className="min-w-0 flex-1 truncate"
          style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.01em' }}
        >
          {title}
        </span>
        <motion.span
          aria-hidden="true"
          className="flex items-center justify-center shrink-0"
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.3, ease: APPLE_EASE }}
          style={{ color: 'var(--ds-text-tertiary)' }}
        >
          <ChevronDown size={20} strokeWidth={2} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={headingId}
            key="body"
            initial={reduced ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduced ? { opacity: 0, height: 0 } : { opacity: 0, height: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.4, ease: APPLE_EASE }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '0 var(--space-5) var(--space-5)',
                borderTop: '1px solid var(--ds-border-subtle)',
                paddingTop: 'var(--space-5)',
              }}
            >
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}

export default function SpotlightDashboard() {
  /* ── ALL HOOKS AT TOP (React #310 safe) ── */
  const reduced = useReducedMotion()
  const g = useG()
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const nextLesson = useNextLesson(profile?.id, studentData?.academic_level)

  /* ── DERIVED VALUES ── */
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

  const group = studentData?.groups
  const schedule = group?.schedule

  const rise = reduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

  /* ── GUARD (after all hooks) ── */
  if (!profile) return <StudentDashboardSkeleton />

  /* ── RENDER ── */
  return (
    <div className="pd-root">
      <AmbientField />

      <div className="space-y-6" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>
        {/* ════════ 1 · SPOTLIGHT HERO — the one mission ════════ */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduced ? undefined : { duration: 0.7, ease: APPLE_EASE }}
        >
          <GlassPanel padding="lg" glow className="relative overflow-hidden">
            {/* warm interior bloom */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                insetBlockStart: '-46%',
                insetInlineEnd: '-14%',
                width: 'min(78%, 520px)',
                height: '180%',
                background: 'radial-gradient(circle at 70% 30%, var(--ds-accent-primary-glow), transparent 62%)',
                opacity: 0.65,
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
              {/* greeting + corner level emblem */}
              <div className="flex items-start justify-between gap-4">
                <motion.p
                  {...rise}
                  transition={reduced ? undefined : { duration: 0.5, ease: APPLE_EASE }}
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-tertiary)', margin: 0 }}
                >
                  {getGreeting()}
                  {firstName ? <span style={{ color: 'var(--ds-text-secondary)' }}>{` · ${firstName}`}</span> : null}
                </motion.p>

                <motion.div
                  {...rise}
                  transition={reduced ? undefined : { duration: 0.6, ease: APPLE_EASE, delay: 0.1 }}
                >
                  <LevelEmblem level={currentLevel.level} progress={xpProgress} reduced={reduced} />
                </motion.div>
              </div>

              {/* eyebrow */}
              <motion.p
                {...rise}
                transition={reduced ? undefined : { duration: 0.5, ease: APPLE_EASE, delay: 0.06 }}
                className="flex items-center gap-1.5"
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'var(--ds-accent-primary)',
                  margin: 'var(--space-5) 0 0',
                }}
              >
                <span aria-hidden="true">✦</span>
                مهمة اليوم
                {nextLesson ? (
                  <span style={{ color: 'var(--ds-text-tertiary)', fontWeight: 600 }}>
                    {` · الوحدة ${nextLesson.unit_number}`}
                  </span>
                ) : null}
              </motion.p>

              {/* big title line — the actual next unit, or a warm fallback */}
              <motion.h1
                {...rise}
                transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.1 }}
                style={{
                  fontSize: 'clamp(28px, 7vw, 44px)',
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  lineHeight: 1.14,
                  color: 'var(--ds-text-primary)',
                  margin: '10px 0 0',
                }}
              >
                {nextLesson?.title_ar || g('تابع رحلتك', 'تابعي رحلتكِ')}
              </motion.h1>

              {/* package · level line */}
              <motion.p
                {...rise}
                transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.14 }}
                style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ds-text-secondary)', margin: '12px 0 0' }}
              >
                {pkg.name_ar}
                <span style={{ color: 'var(--ds-text-tertiary)', margin: '0 8px' }}>·</span>
                {academicLevel.name_ar}
                <span style={{ color: 'var(--ds-text-tertiary)', marginInlineStart: 6, fontWeight: 500 }}>
                  ({academicLevel.cefr})
                </span>
              </motion.p>

              {/* real momentum stats — streak + XP, at a glance */}
              <motion.div
                {...rise}
                transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.16 }}
                className="flex flex-wrap gap-2.5"
                style={{ marginTop: 'var(--space-4)' }}
              >
                <HeroStat
                  icon={
                    <Flame
                      size={15}
                      strokeWidth={2}
                      className={streak >= 3 ? 'fire-pulse' : ''}
                      style={{ color: 'var(--ds-accent-gold, var(--ds-accent-warning))' }}
                    />
                  }
                  value={streak}
                  suffix="يوم"
                />
                <HeroStat
                  icon={<Zap size={15} strokeWidth={2} style={{ color: 'var(--ds-accent-primary)' }} />}
                  value={xp}
                  suffix="XP"
                />
              </motion.div>

              {/* prominent gold CTA + next-level helper */}
              <motion.div
                {...rise}
                transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.18 }}
                className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between"
                style={{ marginTop: 'var(--space-6)' }}
              >
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ds-text-tertiary)', fontWeight: 500 }}>
                  {nextLevel ? (
                    <>
                      باقٍ{' '}
                      <span className="font-data" style={{ color: 'var(--ds-accent-primary)', fontWeight: 700 }}>
                        {xpToNext.toLocaleString('en-US')}
                      </span>{' '}
                      نقطة للوصول إلى{' '}
                      <span style={{ color: 'var(--ds-text-secondary)', fontWeight: 600 }}>{nextLevel.title_ar}</span>
                    </>
                  ) : (
                    g('بلغتَ أعلى مستوى — استمرّ في التألّق ✦', 'بلغتِ أعلى مستوى — استمرّي في التألّق ✦')
                  )}
                </p>

                <motion.div
                  whileHover={reduced ? undefined : { scale: 1.03 }}
                  whileTap={reduced ? undefined : { scale: 0.97 }}
                  transition={{ duration: 0.25, ease: APPLE_EASE }}
                  className="shrink-0"
                >
                  <Link
                    to={nextLesson?.to || '/student/curriculum'}
                    className="pd-cta inline-flex items-center justify-center gap-2 rounded-full font-bold"
                    style={{
                      padding: '14px 30px',
                      minHeight: 50,
                      fontSize: 15.5,
                      background:
                        'linear-gradient(135deg, var(--ds-accent-primary), var(--ds-accent-gold, var(--ds-accent-primary)))',
                      color: 'var(--ds-text-inverse)',
                      textDecoration: 'none',
                      boxShadow: '0 18px 38px -16px var(--ds-accent-primary-glow)',
                    }}
                  >
                    <Play size={17} strokeWidth={2.4} fill="currentColor" />
                    <span style={{ position: 'relative', zIndex: 1 }}>
                      {nextLesson ? 'متابعة الدرس' : 'متابعة التعلّم'}
                    </span>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </GlassPanel>
        </motion.div>

        {/* ════════ 2 · TODAY'S PATH — chip rail ════════ */}
        <motion.div
          {...rise}
          transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.05 }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
            <h2
              style={{
                margin: 0,
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--ds-text-secondary)',
              }}
            >
              مسار اليوم
            </h2>
            <span style={{ fontSize: 12, color: 'var(--ds-text-tertiary)', fontWeight: 500 }}>
              {g('اختر وجهتك', 'اختاري وجهتك')}
            </span>
          </div>

          <div
            className="scrollbar-hide flex gap-2.5 overflow-x-auto"
            style={{ paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}
          >
            {PATH_CHIPS.map(({ to, label, icon: Icon }) => (
              <motion.div
                key={to}
                whileHover={reduced ? undefined : { y: -3 }}
                whileTap={reduced ? undefined : { scale: 0.96 }}
                transition={{ duration: 0.2, ease: APPLE_EASE }}
                className="shrink-0"
              >
                <Link
                  to={to}
                  className="inline-flex items-center gap-2"
                  style={{
                    padding: '10px 16px',
                    minHeight: 44,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--ds-surface-2)',
                    border: '1px solid var(--ds-border-subtle)',
                    color: 'var(--ds-text-primary)',
                    textDecoration: 'none',
                    fontSize: 13.5,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    boxShadow: 'var(--ds-shadow-sm)',
                  }}
                >
                  <Icon size={16} strokeWidth={2} style={{ color: 'var(--ds-accent-primary)' }} />
                  {label}
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ════════ 3 · RETENTION (self-gates → may render null) ════════ */}
        <RetentionDashboardSection />

        {/* ════════ 4 · COLLAPSIBLE SECTIONS — the signature ════════ */}
        <div className="space-y-3">
          <Section title="تقدّمك" icon={TrendingUp} defaultOpen>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DailyProgressWidget studentId={profile.id} />
              <WeeklyProgressWidget studentId={profile.id} />
            </div>
          </Section>

          <Section title="إيقاعك ومجموعتك" icon={Flame}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <StreakWidget profileId={profile.id} />
              <TeamCard groupId={studentData?.group_id} />
            </div>
          </Section>

          <Section title="المراجعة والاختبارات" icon={GraduationCap}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SrsReviewCard studentId={profile.id} />
                <LevelExitTestCard studentId={profile.id} academicLevel={studentData?.academic_level} />
              </div>
              <MysteryBox />
            </div>
          </Section>

          <Section title="حصّتك القادمة" icon={CalendarClock}>
            <NextClassWidget group={group} schedule={schedule} />
          </Section>

          <Section title="نبض الأكاديمية" icon={Radio}>
            <LiveLevelActivityFeed studentId={profile.id} />
          </Section>
        </div>

        {/* bottom breathing room (mobile bar spacer handled by LayoutShell) */}
        <div className="h-2" aria-hidden="true" />
      </div>
    </div>
  )
}
