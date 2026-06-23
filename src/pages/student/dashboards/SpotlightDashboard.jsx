import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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

import { APPLE_EASE } from './_premiumShell'
import './premiumDashboard.css'
import './atlasHome.css'

import { getGreeting } from '../../../utils/dateHelpers'
import { firstNameFrom } from '../../../utils/names'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../../lib/constants'
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
 * Fluentia LMS — STUDENT HOME  ·  "الأطلس الحيّ / The Living Atlas"
 *
 * The whole screen is a LIVING WORLD built from the student's OWN current
 * unit cover art — portaled full-bleed behind the nav, with depth layers, a
 * breathing aurora bloom, drifting motes and film grain. Nothing is a flat
 * background; everything moves on its own. The mission, the journey and the
 * destinations FLOAT inside the world; the analytics rise in a frosted
 * drawer. The world even CHANGES as the student advances (their next unit's
 * art becomes the room). All data is live; nothing is faked.
 * ══════════════════════════════════════════════════════════════════════ */

/* ── gamification level math ── */
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

/* time-of-day colour wash painted over the living world — the home changes
   mood with the hour (dawn gold → midday cyan → dusk amber → night violet) */
function getTimeWash() {
  const h = new Date().getHours()
  if (h < 6) return 'radial-gradient(120% 100% at 50% 0%, rgba(99,102,178,0.6), transparent 64%)'
  if (h < 12) return 'radial-gradient(120% 100% at 72% 0%, rgba(252,211,77,0.52), transparent 64%)'
  if (h < 17) return 'radial-gradient(120% 100% at 62% 0%, rgba(56,189,248,0.5), transparent 64%)'
  if (h < 20) return 'radial-gradient(120% 100% at 66% 0%, rgba(251,146,60,0.55), transparent 64%)'
  return 'radial-gradient(120% 100% at 50% 0%, rgba(139,92,246,0.54), transparent 64%)'
}

/* the verified-live destinations, as frosted image/gradient discover tiles */
const DISCOVER = [
  { to: '/student/curriculum', label: 'التعلّم', sub: 'كل الوحدات', icon: BookOpen, hue: '56,189,248' },
  { to: '/student/srs', label: 'المراجعة', sub: 'كلماتك اليوم', icon: RefreshCw, hue: '167,139,250' },
  { to: '/student/speaking-hub', label: 'المحادثة', sub: 'تحدّث وتدرّب', icon: Mic, hue: '251,113,133' },
  { to: '/student/spelling-lab', label: 'الإملاء', sub: 'اختبر تهجئتك', icon: SpellCheck, hue: '52,211,153' },
  { to: '/student/flashcards', label: 'المفردات', sub: 'بطاقاتك', icon: Layers, hue: '34,211,238' },
  { to: '/library', label: 'المكتبة', sub: 'روايات بلغتين', icon: BookMarked, hue: '224,177,94' },
]

/* ── the living world: portaled full-bleed + chrome-bleed body class ── */
function AtlasWorld({ coverUrl, wash }) {
  useEffect(() => {
    document.body.classList.add('home-immersive')
    return () => document.body.classList.remove('home-immersive')
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className={`atlas-world${coverUrl ? '' : ' atlas-world--empty'}`} aria-hidden="true">
      {coverUrl ? <div className="atlas-world__far" style={{ backgroundImage: `url(${coverUrl})` }} /> : null}
      <div className="atlas-world__near" style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined} />
      <div className="atlas-world__wash" style={{ background: wash }} />
      <div className="atlas-world__bloom" />
      <div className="atlas-world__motes" />
      <div className="atlas-world__scrim" />
      <div className="atlas-world__grain" />
    </div>,
    document.body
  )
}

/* ── compact level emblem: number + slim XP-to-next ring (floats in world) ── */
function LevelEmblem({ level, progress, reduced }) {
  const R = 26
  const C = 2 * Math.PI * R
  const pct = Math.max(0, Math.min(progress, 100))
  const offset = C * (1 - pct / 100)

  return (
    <div
      className="relative shrink-0 flex items-center justify-center rounded-full"
      style={{
        width: 80,
        height: 80,
        background: 'radial-gradient(circle at 50% 40%, rgba(8,12,24,0.55), rgba(8,12,24,0.15))',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <svg viewBox="0 0 66 66" width="66" height="66" role="img" aria-label={`المستوى ${level}`}>
        <defs>
          <linearGradient id="atlasEmblemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <g transform="rotate(-90 33 33)">
          <circle cx="33" cy="33" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="5" />
          <motion.circle
            cx="33"
            cy="33"
            r={R}
            fill="none"
            stroke="url(#atlasEmblemGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: offset }}
            transition={reduced ? { duration: 0 } : { delay: 0.5, duration: 1, ease: 'easeOut' }}
            style={{ filter: 'drop-shadow(0 0 5px rgba(56,189,248,0.6))' }}
          />
        </g>
      </svg>
      <span className="font-data absolute" style={{ fontSize: 25, fontWeight: 800, color: '#fff' }}>
        {level}
      </span>
    </div>
  )
}

/* ── floating stat chip ── */
function AtlasChip({ icon, value, suffix }) {
  return (
    <span className="atlas-chip">
      {icon}
      <span className="font-data font-bold" style={{ fontSize: 15, color: '#fff', lineHeight: 1 }}>
        {typeof value === 'number' ? value.toLocaleString('en-US') : value}
        {suffix ? (
          <span style={{ fontSize: 12, marginInlineStart: 3, color: 'rgba(255,255,255,0.62)', fontWeight: 600 }}>{suffix}</span>
        ) : null}
      </span>
    </span>
  )
}

/* ── floating section eyebrow ── */
function AtlasLabel({ children, hint }) {
  return (
    <div className="atlas-label">
      <span aria-hidden="true" />
      <h2>{children}</h2>
      <span className="rule" aria-hidden="true" />
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  )
}

/* ── one node in the Journey filmstrip (a real unit cover, with state) ── */
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
  const headingId = `atlas-sec-${title}`

  return (
    <section
      style={{
        /* inherit the world's material: frosted glass + a SOFT accent glow at
           the start edge instead of a hard admin-LMS 3px bar */
        background: 'rgba(12,16,28,0.42)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 'var(--radius-lg)',
        backdropFilter: 'blur(14px) saturate(125%)',
        WebkitBackdropFilter: 'blur(14px) saturate(125%)',
        boxShadow: `inset 7px 0 22px -12px ${soft.replace('0.13', '0.9')}, inset 2px 0 0 0 ${soft.replace('0.13', '0.5')}, 0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)`,
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

  const rise = reduced ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } }

  /* ── GUARD (after all hooks) ── */
  if (!profile) return <StudentDashboardSkeleton />

  /* ── RENDER ── */
  return (
    <div className="atlas-root">
      <AtlasWorld coverUrl={heroCover} wash={getTimeWash()} />

      <div className="atlas-stage space-y-10" style={{ maxWidth: 1180, margin: '0 auto' }}>
        {/* ════════ 1 · FLOATING HERO — the mission, lit by its own world ════════ */}
        <header className="atlas-hero">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <motion.p
                {...rise}
                transition={reduced ? undefined : { duration: 0.5, ease: APPLE_EASE }}
                className="atlas-sub"
                style={{ margin: 0 }}
              >
                {getGreeting()}
                {firstName ? <span style={{ color: '#fff', fontWeight: 700 }}>{` · ${firstName}`}</span> : null}
              </motion.p>

              <motion.p
                {...rise}
                transition={reduced ? undefined : { duration: 0.5, ease: APPLE_EASE, delay: 0.06 }}
                className="atlas-eyebrow"
                style={{ marginTop: 'clamp(14px,3vw,22px)' }}
              >
                <Sparkles size={13} strokeWidth={2.4} aria-hidden="true" />
                {allDone ? 'أتممت كل وحدات هذا المستوى' : g('مهمتك اليوم', 'مهمتكِ اليوم')}
                {!allDone && heroUnitNumber ? (
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{` · الوحدة ${heroUnitNumber}`}</span>
                ) : null}
              </motion.p>
            </div>

            <motion.div {...rise} transition={reduced ? undefined : { duration: 0.6, ease: APPLE_EASE, delay: 0.1 }}>
              <LevelEmblem level={currentLevel.level} progress={xpProgress} reduced={reduced} />
            </motion.div>
          </div>

          {/* the headline — the unit you're about to live, set as a movie title */}
          <motion.h1
            {...rise}
            transition={reduced ? undefined : { duration: 0.6, ease: APPLE_EASE, delay: 0.1 }}
            className="atlas-title"
          >
            {allDone ? g('أحسنت — رحلة مكتملة', 'أحسنتِ — رحلة مكتملة') : heroTitle}
          </motion.h1>

          <motion.p
            {...rise}
            transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.14 }}
            className="atlas-sub"
          >
            {pkg.name_ar}
            <span style={{ margin: '0 7px', opacity: 0.6 }}>·</span>
            {academicLevel.name_ar}
            <span style={{ marginInlineStart: 6, opacity: 0.7 }}>({academicLevel.cefr})</span>
          </motion.p>

          {/* floating momentum chips */}
          <motion.div
            {...rise}
            transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.16 }}
            className="flex flex-wrap gap-2.5"
            style={{ marginTop: 18 }}
          >
            <AtlasChip
              icon={<Flame size={15} strokeWidth={2} className={streak >= 3 ? 'fire-pulse' : ''} style={{ color: '#fbbf24' }} />}
              value={streak}
              suffix="يوم"
            />
            <AtlasChip icon={<Zap size={15} strokeWidth={2} style={{ color: '#7dd3fc' }} />} value={xp} suffix="XP" />
            {totalUnits > 0 ? (
              <AtlasChip
                icon={<CheckCircle2 size={15} strokeWidth={2} style={{ color: '#4ade80' }} />}
                value={completedUnits}
                suffix={`/ ${totalUnits}`}
              />
            ) : null}
          </motion.div>

          {/* CTA + next-level helper */}
          <motion.div
            {...rise}
            transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.18 }}
            className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ marginTop: 'clamp(20px,4vw,30px)' }}
          >
            <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.7)', fontWeight: 500, textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}>
              {nextLevel ? (
                <>
                  باقٍ{' '}
                  <span className="font-data" style={{ color: '#7dd3fc', fontWeight: 700 }}>
                    {xpToNext.toLocaleString('en-US')}
                  </span>{' '}
                  نقطة للوصول إلى <span style={{ color: '#fff', fontWeight: 600 }}>{nextLevel.title_ar}</span>
                </>
              ) : (
                g('بلغتَ أعلى مستوى — استمرّ في التألّق ✦', 'بلغتِ أعلى مستوى — استمرّي في التألّق ✦')
              )}
            </p>

            <Link to={heroTo} className="atlas-cta shrink-0">
              <Play size={18} strokeWidth={2.4} fill="currentColor" />
              <span style={{ position: 'relative', zIndex: 1 }}>
                {allDone ? g('راجع وحداتك', 'راجعي وحداتكِ') : g('واصل رحلتك', 'واصلي رحلتكِ')}
              </span>
            </Link>
          </motion.div>
        </header>

        {/* ════════ 2 · JOURNEY FILMSTRIP — the level, floating in the world ════════ */}
        {totalUnits > 0 ? (
          <motion.div {...rise} transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.05 }}>
            <AtlasLabel hint={journey.level?.name_ar ? `${journey.level.name_ar} · ${journey.level.cefr}` : undefined}>
              {g('رحلتك في هذا المستوى', 'رحلتكِ في هذا المستوى')}
            </AtlasLabel>

            <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.16)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${totalUnits ? (completedUnits / totalUnits) * 100 : 0}%` }}
                  viewport={{ once: true }}
                  transition={reduced ? { duration: 0 } : { duration: 1, delay: 0.2, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #4ade80, #22d3ee)' }}
                />
              </div>
              <span className="font-data" style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 8px rgba(0,0,0,0.7)' }}>
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

        {/* ════════ 3 · DISCOVER — frosted destinations floating in the world ════════ */}
        <motion.div {...rise} transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.05 }}>
          <AtlasLabel hint={g('اختر وجهتك', 'اختاري وجهتك')}>اكتشف</AtlasLabel>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {DISCOVER.map(({ to, label, sub, icon: Icon, hue }) => (
              <motion.div key={to} whileHover={reduced ? undefined : { y: -4 }} transition={{ duration: 0.24, ease: APPLE_EASE }}>
                <Link to={to} className="sd-disc" style={{ height: '100%' }}>
                  <div
                    className="sd-disc__glow"
                    style={{
                      background: `radial-gradient(130% 110% at 88% -10%, rgba(${hue},0.42), transparent 55%), linear-gradient(150deg, rgba(${hue},0.16), rgba(${hue},0.04) 60%, transparent)`,
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className="sd-disc__icon"
                    style={{
                      background: `rgba(${hue},0.2)`,
                      border: `1px solid rgba(${hue},0.36)`,
                      boxShadow: `0 5px 16px -4px rgba(${hue},0.45), inset 0 1px 0 rgba(255,255,255,0.14)`,
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

        {/* ════════ 4 · FROSTED DATA DRAWER — analytics rise over the world ════════ */}
        <div className="atlas-drawer">
          <div className="atlas-drawer__grip" aria-hidden="true" />

          <RetentionDashboardSection />

          <div className="space-y-3" style={{ marginTop: 12 }}>
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
        </div>

        <div className="h-2" aria-hidden="true" />
      </div>
    </div>
  )
}
