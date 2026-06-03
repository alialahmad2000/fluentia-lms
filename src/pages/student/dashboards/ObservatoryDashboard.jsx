import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Zap, Flame, TrendingUp, RefreshCw, Sparkles, Play } from 'lucide-react'

import { useAuthStore } from '../../../stores/authStore'
import StudentDashboardSkeleton from '../../../components/skeletons/StudentDashboardSkeleton'
import UserAvatar from '../../../components/common/UserAvatar'
import AnimatedNumber from '../../../components/ui/AnimatedNumber'

import { AmbientField, SectionLabel, Band, APPLE_EASE } from './_premiumShell'
import './premiumDashboard.css'

import { getGreeting } from '../../../utils/dateHelpers'
import { firstNameFrom } from '../../../utils/names'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../../lib/constants'

/* Real, self-gating widgets (each owns its own query + empty/loading state). */
import DailyProgressWidget from '../../../components/student/dashboard/DailyProgressWidget'
import WeeklyProgressWidget from '../../../components/student/dashboard/WeeklyProgressWidget'
import StreakWidget from '../../../components/student/StreakWidget'
import TeamCard from '../../../components/student/TeamCard'
import NextClassWidget from '../dashboard/widgets/NextClassWidget'
import MysteryBox from '../../../components/gamification/MysteryBox'
import LiveLevelActivityFeed from '../../../components/student/dashboard/LiveLevelActivityFeed'
import RetentionDashboardSection from '../../../components/retention/RetentionDashboardSection'

/* ══════════════════════════════════════════════════════════════════════ *
 * Fluentia LMS — STUDENT DASHBOARD VARIANT  ·  "Observatory / المرصد"
 *
 * A striking CENTERED composition. A large level-ring (the student's level
 * + avatar at its heart) is the focal point; the key stats + the primary
 * action ORBIT it — flung to the four diagonal corners with hairline
 * connectors on desktop (≥1024px), and folded into a tidy 2×2 grid directly
 * beneath the ring on phones (so the satellites can NEVER clip or overlap on
 * a 360px screen). Below the centrepiece: the real, self-gating widget grid.
 *
 * No props (reads the store). All hooks at top. Real fields + real widgets
 * + real routes only — nothing faked.
 * ══════════════════════════════════════════════════════════════════════ */

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

/* ── The big centred XP-progress ring (the Observatory's eye) ─────────── */
function ObservatoryRing({ level, title, progress, profile, reduced }) {
  const R = 78
  const C = 2 * Math.PI * R
  const pct = Math.max(0, Math.min(progress, 100))
  const offset = C * (1 - pct / 100)

  return (
    <div className="obs-ring">
      {/* soft radial bloom behind the ring */}
      <span aria-hidden="true" className="obs-ring__bloom" />

      <svg
        viewBox="0 0 180 180"
        width="100%"
        height="100%"
        role="img"
        aria-label={`المستوى ${level} — ${title}`}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <defs>
          <linearGradient id="obsRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ds-accent-primary)" />
            <stop offset="55%" stopColor="var(--ds-accent-gold, var(--ds-accent-primary))" />
            <stop offset="100%" stopColor="var(--ds-accent-secondary, var(--ds-accent-primary))" />
          </linearGradient>
        </defs>
        <g transform="rotate(-90 90 90)">
          <circle cx="90" cy="90" r={R} fill="none" stroke="var(--ds-surface-3)" strokeWidth="12" />
          <motion.circle
            cx="90"
            cy="90"
            r={R}
            fill="none"
            stroke="url(#obsRingGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: offset }}
            transition={reduced ? { duration: 0 } : { delay: 0.4, duration: 1.2, ease: 'easeOut' }}
            style={{ filter: 'drop-shadow(0 0 8px var(--ds-accent-primary-glow))' }}
          />
        </g>
      </svg>

      {/* the heart of the ring: avatar + big level number + title */}
      <div className="obs-ring__core">
        {profile ? (
          <div className="obs-ring__avatar" aria-hidden="true">
            <UserAvatar user={profile} size={42} rounded="full" />
          </div>
        ) : null}
        <span className="obs-ring__eyebrow">المستوى</span>
        <span className="obs-ring__level font-data">{level}</span>
        <span className="obs-ring__title truncate">{title}</span>
      </div>
    </div>
  )
}

/* ── A single orbiting stat (tile beneath on mobile, corner on desktop) ── */
function Satellite({ pos, icon, value, suffix, label, accent }) {
  return (
    <div className={`obs-sat obs-sat--${pos}`} data-accent={accent ? 'true' : undefined}>
      <span className="obs-sat__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="obs-sat__body">
        <span className="obs-sat__value font-data">
          {typeof value === 'number' ? <AnimatedNumber value={value} duration={1} /> : value}
          {suffix ? <span className="obs-sat__suffix">{suffix}</span> : null}
        </span>
        <span className="obs-sat__label truncate">{label}</span>
      </span>
    </div>
  )
}

export default function ObservatoryDashboard() {
  /* ── ALL HOOKS AT TOP (React #310 safe) ── */
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const reduced = useReducedMotion()

  /* ── DERIVED VALUES ── */
  const firstName = firstNameFrom(profile?.full_name) || profile?.display_name || ''
  const xp = studentData?.xp_total || 0
  const streak = studentData?.current_streak || 0
  const currentLevel = getLevel(xp)
  const nextLevel = getNextLevel(xp)
  const xpRange = nextLevel ? nextLevel.xp - currentLevel.xp : 0
  const xpProgress = nextLevel && xpRange > 0 ? ((xp - currentLevel.xp) / xpRange) * 100 : 100
  const xpToNext = nextLevel ? Math.max(0, nextLevel.xp - xp) : 0
  const progressRounded = Math.round(xpProgress)

  const academicLevel = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]
  const pkg = PACKAGES[studentData?.package] || PACKAGES.asas
  const group = studentData?.groups
  const schedule = group?.schedule

  /* ── GUARD ── */
  if (!profile) return <StudentDashboardSkeleton />

  const rise = reduced ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } }

  return (
    <div className="pd-root">
      <AmbientField />

      <div className="space-y-8" style={{ position: 'relative', zIndex: 1 }}>
        {/* ════════════ THE OBSERVATORY (signature centrepiece) ════════════ */}
        <motion.section
          initial={reduced ? false : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduced ? undefined : { duration: 0.7, ease: APPLE_EASE }}
          className="obs-stage"
          aria-label="ملخّص المرصد"
        >
          {/* time-aware greeting + first name, above the ring */}
          <motion.p
            {...rise}
            transition={reduced ? undefined : { duration: 0.5, ease: APPLE_EASE }}
            className="obs-greeting"
          >
            <Sparkles size={13} strokeWidth={2} style={{ color: 'var(--ds-accent-primary)' }} />
            {getGreeting()}
          </motion.p>
          <motion.h1
            {...rise}
            transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.05 }}
            className="obs-name"
          >
            {firstName ? `أهلاً بعودتك، ${firstName}` : 'أهلاً بعودتك'}
          </motion.h1>
          <motion.p
            {...rise}
            transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.1 }}
            className="obs-sub"
          >
            {pkg.name_ar}
            <span className="obs-sub__dot">·</span>
            {academicLevel.name_ar}
            <span className="obs-sub__cefr">({academicLevel.cefr})</span>
          </motion.p>

          {/* the orbit field: ring at centre, 4 satellites around it */}
          <div className="obs-orbit">
            {/* hairline connector lines/dots (desktop only, decorative) */}
            <span aria-hidden="true" className="obs-orbit__lines">
              <span className="obs-line obs-line--ts" />
              <span className="obs-line obs-line--te" />
              <span className="obs-line obs-line--bs" />
              <span className="obs-line obs-line--be" />
            </span>

            <motion.div
              {...rise}
              transition={reduced ? undefined : { duration: 0.6, ease: APPLE_EASE, delay: 0.12 }}
              className="obs-orbit__center"
            >
              <ObservatoryRing
                level={currentLevel.level}
                title={currentLevel.title_ar}
                progress={xpProgress}
                profile={profile}
                reduced={reduced}
              />
            </motion.div>

            {/* satellites: a clean 2×2 grid on mobile, flung to corners ≥1024px */}
            <div className="obs-sats">
              <Satellite
                pos="ts"
                icon={<Zap size={18} strokeWidth={1.9} style={{ color: 'var(--ds-accent-primary)' }} />}
                value={xp}
                suffix="XP"
                label="نقاط الخبرة"
              />
              <Satellite
                pos="te"
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
              />
              <Satellite
                pos="bs"
                icon={<TrendingUp size={18} strokeWidth={1.9} style={{ color: 'var(--ds-accent-secondary, var(--ds-accent-primary))' }} />}
                value={progressRounded}
                suffix="٪"
                label={nextLevel ? `نحو ${nextLevel.title_ar}` : 'أعلى مستوى'}
              />
              {/* action satellite → /student/srs */}
              <Link to="/student/srs" className="obs-sat obs-sat--be obs-sat--action">
                <span className="obs-sat__icon" aria-hidden="true">
                  <RefreshCw size={18} strokeWidth={2} style={{ color: 'var(--ds-accent-primary)' }} />
                </span>
                <span className="obs-sat__body">
                  <span className="obs-sat__value obs-sat__value--cta">مراجعة اليوم</span>
                  <span className="obs-sat__label truncate">ابدئي جلسة سريعة</span>
                </span>
              </Link>
            </div>
          </div>

          {/* next-level helper line */}
          <motion.p
            {...rise}
            transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.18 }}
            className="obs-hint"
          >
            {nextLevel ? (
              <>
                باقٍ{' '}
                <span className="font-data obs-hint__num">{xpToNext.toLocaleString('en-US')}</span>{' '}
                نقطة للوصول إلى <span className="obs-hint__lvl">{nextLevel.title_ar}</span>
              </>
            ) : (
              'بلغتِ أعلى مستوى — استمرّي في التألّق ✦'
            )}
          </motion.p>

          {/* prominent gold CTA → /student/curriculum */}
          <motion.div
            {...rise}
            transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay: 0.22 }}
            whileHover={reduced ? undefined : { scale: 1.03 }}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            className="obs-cta-wrap"
          >
            <Link to="/student/curriculum" className="pd-cta obs-cta">
              <Play size={17} strokeWidth={2.4} fill="currentColor" />
              <span style={{ position: 'relative', zIndex: 1 }}>متابعة التعلّم</span>
            </Link>
          </motion.div>
        </motion.section>

        {/* engagement-first retention surfaces (self-gates → may render null) */}
        <RetentionDashboardSection />

        {/* ════════════ THE REAL WIDGET GRID ════════════ */}
        <Band delay={0.02}>
          <SectionLabel>لمحة سريعة</SectionLabel>
          <div className="obs-grid">
            <div className="obs-grid__cell obs-grid__cell--wide">
              <DailyProgressWidget studentId={profile.id} />
            </div>
            <div className="obs-grid__cell">
              <StreakWidget profileId={profile.id} />
            </div>
            <div className="obs-grid__cell">
              <TeamCard groupId={studentData?.group_id} />
            </div>
            <div className="obs-grid__cell obs-grid__cell--wide">
              <WeeklyProgressWidget studentId={profile.id} />
            </div>
            <div className="obs-grid__cell">
              <NextClassWidget group={group} schedule={schedule} />
            </div>
            <div className="obs-grid__cell">
              <MysteryBox />
            </div>
          </div>
        </Band>

        {/* academy pulse — live activity across the level (full-width) */}
        <Band delay={0.04}>
          <SectionLabel>نبض الأكاديمية</SectionLabel>
          <LiveLevelActivityFeed studentId={profile.id} />
        </Band>

        {/* bottom breathing room (mobile bar spacer handled by LayoutShell) */}
        <div className="h-2" aria-hidden="true" />
      </div>

      {/* ── scoped Observatory styles (tokenized; mobile-first) ──────────── */}
      <style>{`
        /* centred stage */
        .obs-stage {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: var(--space-5) 0 var(--space-3);
        }
        .obs-greeting {
          display: inline-flex; align-items: center; gap: 6px;
          margin: 0; font-size: 12.5px; font-weight: 600; letter-spacing: 0.04em;
          color: var(--ds-text-tertiary);
        }
        .obs-name {
          margin: 8px 0 0; font-weight: 800; letter-spacing: -0.02em; line-height: 1.18;
          font-size: clamp(24px, 6vw, 38px); color: var(--ds-text-primary);
        }
        .obs-sub {
          margin: 10px 0 0; font-size: 13.5px; font-weight: 600; color: var(--ds-text-secondary);
        }
        .obs-sub__dot { color: var(--ds-text-tertiary); margin: 0 8px; }
        .obs-sub__cefr { color: var(--ds-text-tertiary); margin-inline-start: 6px; font-weight: 500; }

        /* orbit field */
        .obs-orbit {
          position: relative;
          margin: var(--space-6) auto 0;
          max-width: 760px;
        }
        .obs-orbit__center {
          display: flex; align-items: center; justify-content: center;
        }
        .obs-orbit__lines { display: none; }

        /* the ring */
        .obs-ring {
          position: relative;
          width: clamp(184px, 46vw, 248px);
          aspect-ratio: 1 / 1;
          display: grid; place-items: center;
        }
        .obs-ring__bloom {
          position: absolute; inset: -16%;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 45%, var(--ds-accent-primary-glow), transparent 64%);
          opacity: 0.7; pointer-events: none; z-index: 0;
        }
        .obs-ring__core {
          position: absolute; inset: 0; z-index: 2;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; gap: 1px;
        }
        .obs-ring__avatar {
          margin-bottom: 6px;
          border-radius: 999px;
          box-shadow: 0 0 0 2px var(--ds-surface-1), 0 6px 18px -8px var(--ds-accent-primary-glow);
        }
        .obs-ring__eyebrow {
          font-size: 10px; font-weight: 600; letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--ds-text-tertiary);
        }
        .obs-ring__level {
          font-size: clamp(40px, 12vw, 56px); font-weight: 800; line-height: 1;
          color: var(--ds-text-primary); margin-top: 1px;
        }
        .obs-ring__title {
          font-size: 12px; font-weight: 600; color: var(--ds-accent-primary);
          margin-top: 4px; max-width: 84%;
        }

        /* satellites — DEFAULT (mobile): a clean 2×2 grid beneath the ring */
        .obs-sats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: var(--space-5);
        }
        .obs-sat {
          display: flex; align-items: center; gap: 12px;
          text-align: start;
          padding: 14px;
          background: var(--ds-surface-2);
          border: 1px solid var(--ds-border-subtle);
          border-radius: var(--radius-lg);
          box-shadow: var(--ds-shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.05);
          min-width: 0;
          text-decoration: none;
          transition: transform 220ms var(--ease-out, ease),
                      border-color 220ms var(--ease-out, ease),
                      box-shadow 220ms var(--ease-out, ease);
        }
        .obs-sat__icon {
          display: flex; align-items: center; justify-content: center; flex: 0 0 auto;
          width: 38px; height: 38px; border-radius: 12px;
          background: var(--ds-surface-3);
        }
        .obs-sat__body { display: flex; flex-direction: column; min-width: 0; line-height: 1; }
        .obs-sat__value {
          font-size: 20px; font-weight: 700; color: var(--ds-text-primary); line-height: 1;
        }
        .obs-sat__value--cta { font-size: 15px; font-weight: 700; }
        .obs-sat__suffix {
          font-size: 12px; margin-inline-start: 4px; color: var(--ds-text-tertiary); font-weight: 600;
        }
        .obs-sat__label {
          font-size: 11.5px; margin-top: 6px; color: var(--ds-text-tertiary); font-weight: 500;
        }
        /* the action satellite reads as a precious chip */
        .obs-sat--action {
          background: linear-gradient(135deg,
            color-mix(in srgb, var(--ds-accent-primary) 16%, var(--ds-surface-2)),
            var(--ds-surface-2));
          border-color: color-mix(in srgb, var(--ds-accent-primary) 30%, var(--ds-border-subtle));
        }
        .obs-sat--action .obs-sat__value--cta { color: var(--ds-accent-primary); }
        .obs-sat--action:hover {
          transform: translateY(-3px);
          border-color: var(--ds-accent-primary);
          box-shadow: var(--ds-shadow-md), 0 14px 30px -16px var(--ds-accent-primary-glow);
        }

        /* next-level hint + CTA */
        .obs-hint {
          margin: var(--space-5) 0 0; font-size: 12.5px; color: var(--ds-text-tertiary); font-weight: 500;
        }
        .obs-hint__num { color: var(--ds-accent-primary); font-weight: 700; }
        .obs-hint__lvl { color: var(--ds-text-secondary); font-weight: 600; }
        .obs-cta-wrap { margin-top: var(--space-5); display: flex; justify-content: center; }
        .obs-cta {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 34px; min-height: 50px; font-size: 15px; font-weight: 700;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--ds-accent-primary), var(--ds-accent-gold, var(--ds-accent-primary)));
          color: var(--ds-text-inverse); text-decoration: none;
          box-shadow: 0 20px 42px -16px var(--ds-accent-primary-glow);
        }

        /* the real widget grid (mobile: single column) */
        .obs-grid { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
        .obs-grid__cell { min-width: 0; }
        .obs-grid__cell > * { width: 100%; }

        @media (min-width: 640px) {
          .obs-grid { grid-template-columns: repeat(2, 1fr); }
          .obs-grid__cell--wide { grid-column: 1 / -1; }
        }

        /* ── DESKTOP (≥1024px): satellites orbit the ring at the corners ── */
        @media (min-width: 1024px) {
          .obs-orbit {
            max-width: 880px;
            min-height: 360px;
            display: grid;
            place-items: center;
          }
          .obs-orbit__center { grid-area: 1 / 1; }

          /* satellites become absolutely-positioned corner cards */
          .obs-sats {
            grid-area: 1 / 1;
            display: block;
            margin-top: 0;
            position: absolute; inset: 0;
            pointer-events: none;
          }
          .obs-sat {
            position: absolute;
            width: 188px;
            pointer-events: auto;
          }
          .obs-sat--ts { inset-block-start: 6px; inset-inline-start: 0; }
          .obs-sat--te { inset-block-start: 6px; inset-inline-end: 0; }
          .obs-sat--bs { inset-block-end: 6px; inset-inline-start: 0; }
          .obs-sat--be { inset-block-end: 6px; inset-inline-end: 0; }

          /* connector lines from the centre toward each corner */
          .obs-orbit__lines {
            display: block;
            position: absolute; inset: 0; z-index: 0; pointer-events: none;
          }
          .obs-line {
            position: absolute; top: 50%; left: 50%;
            width: 120px; height: 1px; transform-origin: 0 50%;
            background: linear-gradient(90deg,
              color-mix(in srgb, var(--ds-accent-primary) 45%, transparent),
              transparent);
            opacity: 0.5;
          }
          .obs-line::after {
            content: ''; position: absolute; inset-inline-end: 0; top: 50%;
            width: 5px; height: 5px; margin-top: -2.5px; border-radius: 50%;
            background: var(--ds-accent-primary);
            box-shadow: 0 0 8px 1px var(--ds-accent-primary-glow);
          }
          .obs-line--ts { transform: rotate(214deg); }
          .obs-line--te { transform: rotate(326deg); }
          .obs-line--bs { transform: rotate(146deg); }
          .obs-line--be { transform: rotate(34deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .obs-ring__bloom { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
