import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Play,
  ChevronDown,
  ChevronLeft,
  BookOpen,
  RefreshCw,
  SpellCheck,
  Mic,
  Layers,
  TrendingUp,
  Flame,
  GraduationCap,
  CalendarClock,
  Radio,
  Zap,
  CheckCircle2,
  Lock,
  MapPin,
  BookMarked,
  Sparkles,
} from 'lucide-react'

import { useAuthStore } from '../../../stores/authStore'
import { useG } from '../../../i18n/gender'
import StudentDashboardSkeleton from '../../../components/skeletons/StudentDashboardSkeleton'

import { AmbientField, APPLE_EASE, SectionLabel } from './_premiumShell'
import './premiumDashboard.css'

import { getGreeting } from '../../../utils/dateHelpers'
import { firstNameFrom } from '../../../utils/names'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../../lib/constants'
import StatOrb from '../../../design-system/components/StatOrb'
import { useLevelJourney } from './useLevelJourney'

/* Real, self-gating widgets — each owns its own query / realtime + empty state. */
import DailyProgressWidget from '../../../components/student/dashboard/DailyProgressWidget'
import WeeklyProgressWidget from '../../../components/student/dashboard/WeeklyProgressWidget'
import StreakWidget from '../../../components/student/StreakWidget'
import NextClassWidget from '../dashboard/widgets/NextClassWidget'
import SrsReviewCard from '../../../components/gamification/SrsReviewCard'
import LevelExitTestCard from '../../../components/gamification/LevelExitTestCard'
import MysteryBox from '../../../components/gamification/MysteryBox'
import LiveLevelActivityFeed from '../../../components/student/dashboard/LiveLevelActivityFeed'
import RetentionDashboardSection from '../../../components/retention/RetentionDashboardSection'

/* ══════════════════════════════════════════════════════════════════════ *
 * Fluentia LMS — STUDENT HOME  ·  "رحلتك" (Your Journey)
 *
 * A CINEMATIC, image-rich home that mirrors the energy of the curriculum
 * the owner loves: a full-bleed Ken-Burns hero painted with the student's
 * REAL next-unit cover art, then a horizontal "Journey Track" — every unit
 * in the level as a living image card with progress, a glowing "أنت هنا"
 * pin, completed / locked states — then a momentum constellation and
 * image-backed discover tiles. Everything below is the live data set; the
 * collapsible analytics sections are preserved verbatim. Nothing is faked.
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

/* time-of-day colour wash painted over the hero image — the home "changes"
   with the hour (dawn gold → midday cyan → dusk amber → night violet) */
function getTimeWash() {
  const h = new Date().getHours()
  if (h < 6) return 'radial-gradient(120% 95% at 50% 0%, rgba(99,102,178,0.55), transparent 62%)'
  if (h < 12) return 'radial-gradient(120% 95% at 72% 0%, rgba(252,211,77,0.5), transparent 62%)'
  if (h < 17) return 'radial-gradient(120% 95% at 62% 0%, rgba(56,189,248,0.46), transparent 62%)'
  if (h < 20) return 'radial-gradient(120% 95% at 66% 0%, rgba(251,146,60,0.52), transparent 62%)'
  return 'radial-gradient(120% 95% at 50% 0%, rgba(139,92,246,0.5), transparent 62%)'
}

/* the verified-live destinations, as image/gradient-backed discover tiles */
const DISCOVER = [
  { to: '/student/curriculum', label: 'التعلّم', sub: 'كل الوحدات', icon: BookOpen, hue: '56,189,248' },
  { to: '/student/srs', label: 'المراجعة', sub: 'كلماتك اليوم', icon: RefreshCw, hue: '167,139,250' },
  { to: '/student/speaking-hub', label: 'المحادثة', sub: 'تحدّث وتدرّب', icon: Mic, hue: '251,113,133' },
  { to: '/student/spelling-lab', label: 'الإملاء', sub: 'اختبر تهجئتك', icon: SpellCheck, hue: '52,211,153' },
  { to: '/student/flashcards', label: 'المفردات', sub: 'بطاقاتك', icon: Layers, hue: '34,211,238' },
  { to: '/library', label: 'المكتبة', sub: 'روايات بلغتين', icon: BookMarked, hue: '224,177,94' },
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
          <circle cx="33" cy="33" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="5" />
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
      <div className="absolute inset-0 flex items-center justify-center" style={{ textAlign: 'center' }}>
        <span
          className="font-data"
          style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#fff' }}
        >
          {level}
        </span>
      </div>
    </div>
  )
}

/* ── dark-glass stat chip for the hero (legible over a bright image) ── */
function HeroStat({ icon, value, suffix }) {
  return (
    <span
      className="inline-flex items-center gap-2"
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        background: 'rgba(8,12,24,0.5)',
        border: '1px solid rgba(255,255,255,0.16)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {icon}
      <span className="font-data font-bold" style={{ fontSize: 15, color: '#fff', lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString('en-US') : value}
        {suffix ? (
          <span style={{ fontSize: 11, marginInlineStart: 3, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>
            {suffix}
          </span>
        ) : null}
      </span>
    </span>
  )
}

/* ── one node in the Journey Track (a real unit cover, with state) ── */
function JourneyNode({ unit, index, reduced }) {
  const cls =
    'sd-node' +
    (unit.status === 'current' ? ' sd-node--current' : '') +
    (unit.status === 'completed' ? ' sd-node--completed' : '') +
    (unit.status === 'locked' ? ' sd-node--locked' : '')

  const inner = (
    <>
      <div
        className="sd-node__media"
        style={unit.cover_image_url ? { backgroundImage: `url(${unit.cover_image_url})` } : { background: 'var(--ds-bg-elevated)' }}
      />
      <div className="sd-node__scrim" />
      <div className="sd-node__body">
        {unit.status === 'current' ? (
          <span className="sd-pill sd-pill--current">
            <MapPin size={11} strokeWidth={2.6} /> أنت هنا
          </span>
        ) : unit.status === 'completed' ? (
          <span className="sd-pill sd-pill--done">
            <CheckCircle2 size={11} strokeWidth={2.6} /> مكتملة
          </span>
        ) : unit.status === 'locked' ? (
          <span className="sd-pill sd-pill--locked">
            <Lock size={10} strokeWidth={2.6} /> قريباً
          </span>
        ) : (
          <span className="sd-pill sd-pill--locked">متاحة</span>
        )}

        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.05em' }}>
            الوحدة {unit.unit_number}
          </div>
          <div
            style={{
              fontSize: 14.5,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.25,
              marginTop: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textShadow: '0 1px 8px rgba(0,0,0,0.6)',
            }}
          >
            {unit.theme_ar || unit.theme_en}
          </div>
          {!unit.locked && unit.pct > 0 && unit.pct < 100 ? (
            <div className="sd-node__bar" aria-label={`${unit.pct}%`}>
              <span style={{ width: `${unit.pct}%` }} />
            </div>
          ) : null}
        </div>
      </div>
    </>
  )

  const motionProps = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 18, scale: 0.97 },
        whileInView: { opacity: 1, y: 0, scale: 1 },
        viewport: { once: true, margin: '0px 0px -40px' },
        transition: { delay: Math.min(index, 8) * 0.05, duration: 0.45, ease: APPLE_EASE },
      }

  if (unit.locked) {
    return (
      <motion.div className={cls} aria-disabled="true" {...motionProps}>
        {inner}
      </motion.div>
    )
  }
  return (
    <motion.div {...motionProps}>
      <Link to={unit.to} className={cls} style={{ display: 'block', textDecoration: 'none' }}>
        {inner}
      </Link>
    </motion.div>
  )
}

/* ── reusable collapsible accordion section (own hooks → rules-of-hooks safe) ── */
function Section({ title, icon: Icon, defaultOpen = false, hue = 'var(--ds-accent-primary)', soft = 'var(--ds-surface-3)', children }) {
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(defaultOpen)
  const headingId = `sd-sec-${title}`

  return (
    <section
      style={{
        background: 'var(--ds-surface-2)',
        border: '1px solid var(--ds-border-subtle)',
        borderInlineStartWidth: 3,
        borderInlineStartColor: hue,
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.4), 0 10px 26px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
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
          style={{ width: 38, height: 38, background: soft, border: `1px solid ${soft}` }}
        >
          <Icon size={18} strokeWidth={1.9} style={{ color: hue }} />
        </span>
        <span className="min-w-0 flex-1 truncate" style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.01em' }}>
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
  const journey = useLevelJourney(profile?.id, studentData?.academic_level)

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

  const units = journey.units || []
  const current = journey.current
  const totalUnits = units.length
  const completedUnits = journey.completedCount
  const allDone = totalUnits > 0 && completedUnits === totalUnits

  const heroCover = current?.cover_image_url || null
  const heroTitle = current?.theme_ar || g('تابع رحلتك', 'تابعي رحلتكِ')
  const heroUnitNumber = current?.unit_number
  const heroTo = current?.to || '/student/curriculum'

  const rise = reduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

  /* ── GUARD (after all hooks) ── */
  if (!profile) return <StudentDashboardSkeleton />

  /* ── RENDER ── */
  return (
    <div className="pd-root">
      <AmbientField />

      <div className="space-y-10" style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto' }}>
        {/* ════════ 1 · CINEMATIC HERO — the next unit, painted in its own art ════════ */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduced ? undefined : { duration: 0.7, ease: APPLE_EASE }}
          className="sd-hero"
        >
          <div
            className={`sd-hero__media${heroCover ? '' : ' sd-hero__media--empty'}`}
            style={heroCover ? { backgroundImage: `url(${heroCover})` } : undefined}
            aria-hidden="true"
          />
          <div className="sd-hero__wash" style={{ background: getTimeWash() }} aria-hidden="true" />
          <div className="sd-hero__scrim" aria-hidden="true" />
          <div className="sd-hero__grain" aria-hidden="true" />
          <div className="sd-hero__hair" aria-hidden="true" />

          {/* corner level emblem on a soft dark disc for legibility */}
          <motion.div
            {...rise}
            transition={reduced ? undefined : { duration: 0.6, ease: APPLE_EASE, delay: 0.1 }}
            style={{ position: 'absolute', top: 'clamp(16px,3vw,26px)', insetInlineEnd: 'clamp(16px,3vw,26px)', zIndex: 4 }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 78,
                height: 78,
                background: 'radial-gradient(circle at 50% 40%, rgba(8,12,24,0.55), rgba(8,12,24,0.18))',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
            >
              <LevelEmblem level={currentLevel.level} progress={xpProgress} reduced={reduced} />
            </div>
          </motion.div>

          <div className="sd-hero__body">
            {/* greeting */}
            <motion.p
              {...rise}
              transition={reduced ? undefined : { duration: 0.5, ease: APPLE_EASE }}
              style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.78)', margin: 0 }}
            >
              {getGreeting()}
              {firstName ? <span style={{ color: '#fff', fontWeight: 700 }}>{` · ${firstName}`}</span> : null}
            </motion.p>

            {/* eyebrow */}
            <motion.p
              {...rise}
              transition={reduced ? undefined : { duration: 0.5, ease: APPLE_EASE, delay: 0.06 }}
              className="flex items-center gap-1.5"
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ds-accent-gold, #fbbf24)',
                margin: 'clamp(12px,2vw,18px) 0 0',
                textShadow: '0 1px 6px rgba(0,0,0,0.5)',
              }}
            >
              <Sparkles size={13} strokeWidth={2.4} aria-hidden="true" />
              {allDone ? 'أتممت كل وحدات هذا المستوى' : 'مهمة اليوم'}
              {!allDone && heroUnitNumber ? (
                <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{` · الوحدة ${heroUnitNumber}`}</span>
              ) : null}
            </motion.p>

            {/* big title — the actual next unit */}
            <motion.h1
              {...rise}
              transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.1 }}
              style={{
                fontSize: 'clamp(30px, 7vw, 48px)',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                lineHeight: 1.12,
                color: '#fff',
                margin: '14px 0 0',
                textShadow: '0 2px 18px rgba(0,0,0,0.55)',
              }}
            >
              {allDone ? g('أحسنت — رحلة مكتملة', 'أحسنتِ — رحلة مكتملة') : heroTitle}
            </motion.h1>

            {/* package · level line — demoted to a quiet caption under the title */}
            <motion.p
              {...rise}
              transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.14 }}
              style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.58)', margin: '8px 0 0' }}
            >
              {pkg.name_ar}
              <span style={{ margin: '0 7px', opacity: 0.6 }}>·</span>
              {academicLevel.name_ar}
            </motion.p>

            {/* momentum chips */}
            <motion.div
              {...rise}
              transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.16 }}
              className="flex flex-wrap gap-2.5"
              style={{ marginTop: 'var(--space-4)' }}
            >
              <HeroStat
                icon={<Flame size={15} strokeWidth={2} className={streak >= 3 ? 'fire-pulse' : ''} style={{ color: '#fbbf24' }} />}
                value={streak}
                suffix="يوم"
              />
              <HeroStat icon={<Zap size={15} strokeWidth={2} style={{ color: '#7dd3fc' }} />} value={xp} suffix="XP" />
              {totalUnits > 0 ? (
                <HeroStat
                  icon={<CheckCircle2 size={15} strokeWidth={2} style={{ color: '#4ade80' }} />}
                  value={completedUnits}
                  suffix={`/ ${totalUnits}`}
                />
              ) : null}
            </motion.div>

            {/* gold CTA + next-level helper */}
            <motion.div
              {...rise}
              transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.18 }}
              className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between"
              style={{ marginTop: 'var(--space-5)' }}
            >
              <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                {nextLevel ? (
                  <>
                    باقٍ{' '}
                    <span className="font-data" style={{ color: '#7dd3fc', fontWeight: 700 }}>
                      {xpToNext.toLocaleString('en-US')}
                    </span>{' '}
                    نقطة للوصول إلى{' '}
                    <span style={{ color: '#fff', fontWeight: 600 }}>{nextLevel.title_ar}</span>
                  </>
                ) : (
                  g('بلغتَ أعلى مستوى — استمرّ في التألّق ✦', 'بلغتِ أعلى مستوى — استمرّي في التألّق ✦')
                )}
              </p>

              <motion.div
                whileHover={reduced ? undefined : { y: -2 }}
                whileTap={reduced ? undefined : { y: 0 }}
                transition={{ duration: 0.25, ease: APPLE_EASE }}
                className="shrink-0"
              >
                <Link
                  to={heroTo}
                  className="sd-cta inline-flex items-center justify-center gap-2 rounded-full font-bold"
                  style={{
                    padding: '14px 30px',
                    minHeight: 50,
                    fontSize: 15.5,
                    background: 'linear-gradient(160deg, #fcd34d 0%, #fbbf24 45%, #c4843a 100%)',
                    color: '#1a1206',
                    textDecoration: 'none',
                    boxShadow:
                      '0 1px 2px rgba(60,30,0,0.35), 0 18px 38px -14px rgba(251,191,36,0.55), inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                >
                  <Play size={17} strokeWidth={2.4} fill="currentColor" />
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {allDone ? g('راجع وحداتك', 'راجعي وحداتكِ') : g('واصل رحلتك', 'واصلي رحلتكِ')}
                  </span>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>

        {/* ════════ 2 · JOURNEY TRACK — the level as a cinematic campaign rail ════════ */}
        {totalUnits > 0 ? (
          <motion.div {...rise} transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.05 }}>
            <SectionLabel hint={journey.level?.name_ar ? `${journey.level.name_ar} · ${journey.level.cefr}` : undefined}>
              {g('رحلتك في هذا المستوى', 'رحلتكِ في هذا المستوى')}
            </SectionLabel>

            {/* level progress strip */}
            <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-3)' }}>
              <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--ds-surface-3)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${totalUnits ? (completedUnits / totalUnits) * 100 : 0}%` }}
                  viewport={{ once: true }}
                  transition={reduced ? { duration: 0 } : { duration: 1, delay: 0.2, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #4ade80, #22d3ee)' }}
                />
              </div>
              <span className="font-data" style={{ fontSize: 12, fontWeight: 700, color: 'var(--ds-text-secondary)', whiteSpace: 'nowrap' }}>
                {completedUnits}/{totalUnits}
              </span>
            </div>

            <div className="sd-track">
              {units.map((u, i) => (
                <JourneyNode key={u.id} unit={u} index={i} reduced={reduced} />
              ))}
            </div>
          </motion.div>
        ) : null}

        {/* ════════ 3 · DISCOVER — image/gradient-backed destinations ════════ */}
        <motion.div {...rise} transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.05 }}>
          <SectionLabel hint={g('اختر وجهتك', 'اختاري وجهتك')}>اكتشف</SectionLabel>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {DISCOVER.map(({ to, label, sub, icon: Icon, hue }) => (
              <motion.div key={to} whileHover={reduced ? undefined : { y: -4 }} transition={{ duration: 0.24, ease: APPLE_EASE }}>
                <Link to={to} className="sd-disc" style={{ height: '100%' }}>
                  <div
                    className="sd-disc__glow"
                    style={{
                      background: `radial-gradient(130% 110% at 88% -10%, rgba(${hue},0.40), transparent 55%), linear-gradient(150deg, rgba(${hue},0.15), rgba(${hue},0.04) 60%, transparent)`,
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className="sd-disc__icon"
                    style={{
                      background: `rgba(${hue},0.18)`,
                      border: `1px solid rgba(${hue},0.34)`,
                      boxShadow: `0 5px 16px -4px rgba(${hue},0.4), inset 0 1px 0 rgba(255,255,255,0.14)`,
                    }}
                  >
                    <Icon size={21} strokeWidth={2} style={{ color: `rgb(${hue})` }} />
                  </span>
                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ds-text-primary)', lineHeight: 1.2 }}>{label}</div>
                      <div style={{ fontSize: 12, color: 'var(--ds-text-secondary)', fontWeight: 500, marginTop: 3 }}>{sub}</div>
                    </div>
                    <ChevronLeft size={18} strokeWidth={2.4} style={{ color: `rgba(${hue},0.8)`, flexShrink: 0 }} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ════════ 4 · MOMENTUM — animated stat constellation ════════ */}
        <motion.div {...rise} transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.05 }}>
          <div
            className="mx-auto flex flex-wrap items-start justify-center gap-x-10 gap-y-6 sm:justify-around"
            style={{
              maxWidth: 560,
              padding: 'var(--space-6) var(--space-5)',
              background: 'var(--ds-surface-1)',
              border: '1px solid var(--ds-border-subtle)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <StatOrb label="أيام متتالية" value={streak} icon={<Flame size={20} />} glow="gold" />
            <StatOrb label="نقاط الخبرة" value={xp} icon={<Zap size={20} />} glow="primary" />
            <StatOrb
              label="وحدات مكتملة"
              value={completedUnits}
              icon={<GraduationCap size={20} />}
              glow="success"
              caption={totalUnits ? `من ${totalUnits}` : undefined}
            />
          </div>
        </motion.div>

        {/* ════════ 5 · RETENTION (self-gates → may render null) ════════ */}
        <RetentionDashboardSection />

        {/* ════════ 6 · COLLAPSIBLE SECTIONS — the data deck ════════ */}
        <div className="space-y-3">
          <Section title="تقدّمك" icon={TrendingUp} hue="#38bdf8" soft="rgba(56,189,248,0.13)" defaultOpen>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DailyProgressWidget studentId={profile.id} />
              <WeeklyProgressWidget studentId={profile.id} />
            </div>
          </Section>

          <Section title="إيقاعك" icon={Flame} hue="#fb923c" soft="rgba(251,146,60,0.13)">
            <div className="grid grid-cols-1 gap-4">
              <StreakWidget profileId={profile.id} />
            </div>
          </Section>

          <Section title="المراجعة والاختبارات" icon={GraduationCap} hue="#a78bfa" soft="rgba(167,139,250,0.13)">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SrsReviewCard studentId={profile.id} />
                <LevelExitTestCard studentId={profile.id} academicLevel={studentData?.academic_level} />
              </div>
              <MysteryBox />
            </div>
          </Section>

          <Section title="حصّتك القادمة" icon={CalendarClock} hue="#34d399" soft="rgba(52,211,153,0.13)">
            <NextClassWidget group={group} schedule={schedule} />
          </Section>

          <Section title="نبض الأكاديمية" icon={Radio} hue="#22d3ee" soft="rgba(34,211,238,0.13)">
            <LiveLevelActivityFeed studentId={profile.id} />
          </Section>
        </div>

        {/* bottom breathing room (mobile bar spacer handled by LayoutShell) */}
        <div className="h-2" aria-hidden="true" />
      </div>
    </div>
  )
}
