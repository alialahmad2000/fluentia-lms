import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

import { useAuthStore } from '../../../stores/authStore'
import { useG } from '../../../i18n/gender'
import StudentDashboardSkeleton from '../../../components/skeletons/StudentDashboardSkeleton'
import { GAMIFICATION_LEVELS, ACADEMIC_LEVELS, PACKAGES } from '../../../lib/constants'
import { getGreeting } from '../../../utils/dateHelpers'
import { firstNameFrom } from '../../../utils/names'
import GlassPanel from '../../../design-system/components/GlassPanel'

import { AmbientField, Band, APPLE_EASE } from './_premiumShell'
import './premiumDashboard.css'

/* Real, self-gating widgets woven beside the path. */
import StreakWidget from '../../../components/student/StreakWidget'
import TeamCard from '../../../components/student/TeamCard'
import DailyProgressWidget from '../../../components/student/dashboard/DailyProgressWidget'
import SrsReviewCard from '../../../components/gamification/SrsReviewCard'
import RetentionDashboardSection from '../../../components/retention/RetentionDashboardSection'

/* ═══════════════════════════════════════════════════════════════════════
 * Fluentia LMS — STUDENT DASHBOARD VARIANT  ·  "Journey Map / الرحلة"
 *
 * The dashboard is reimagined as a vertical winding LEARNING PATH the
 * student climbs. A glowing gold spine runs down the page; "stations"
 * (nodes) alternate left/right of it, the CURRENT step glowing with an
 * "أنت هنا · تابع" tag. Streak / team / progress live as cards woven beside
 * the path. It reads like an immersive journey, not a data grid.
 *
 * No props — reads the store itself (exactly like PremiumDashboard). Every
 * number/text comes from real fields/widgets; every link is a live route.
 * RTL throughout, mobile-first (great at 360px, capped ≤1100px on desktop).
 * ═══════════════════════════════════════════════════════════════════════ */

/* ── Level math (per shared spec) ─────────────────────────────────────── */
function getLevel(xp) {
  let current = GAMIFICATION_LEVELS[0]
  for (const entry of GAMIFICATION_LEVELS) {
    if (entry.xp <= xp) current = entry
    else break
  }
  return current
}
function getNextLevel(xp) {
  return GAMIFICATION_LEVELS.find((e) => e.xp > xp) || null
}

/* ── Scoped styles for the path (spine + nodes + markers) ─────────────── */
const PATH_CSS = `
.jp-wrap {
  position: relative;
  max-width: 1100px;
  margin-inline: auto;
}

/* The glowing spine — a gradient line running down the inline-start edge on
   mobile, re-centred to 50% on desktop. */
.jp-spine {
  position: absolute;
  top: 0;
  bottom: 0;
  inset-inline-start: 21px;          /* aligned to the node markers' centre */
  width: 3px;
  border-radius: var(--radius-full);
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--ds-accent-primary) 80%, transparent) 0%,
    color-mix(in srgb, var(--ds-accent-gold) 55%, transparent) 38%,
    color-mix(in srgb, var(--ds-accent-secondary) 30%, transparent) 72%,
    transparent 100%);
  box-shadow: 0 0 16px var(--ds-accent-primary-glow);
  pointer-events: none;
}
.jp-spine::after {              /* soft inner glow on the line */
  content: '';
  position: absolute;
  inset: -2px -3px;
  border-radius: var(--radius-full);
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--ds-accent-primary) 30%, transparent), transparent 70%);
  filter: blur(6px);
}

/* Each station: a marker pinned to the spine + a card offset to one side. */
.jp-station {
  position: relative;
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: var(--space-4);
  align-items: start;
  padding-block: var(--space-3);
}

/* Marker column */
.jp-marker-col {
  position: relative;
  width: 44px;
  display: flex;
  justify-content: center;
  padding-top: 2px;
}
.jp-marker {
  position: relative;
  z-index: 1;
  width: 38px;
  height: 38px;
  border-radius: var(--radius-full);
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  font-weight: 800;
  font-size: 14px;
  line-height: 1;
  border: 1.5px solid var(--ds-border-strong);
  background: var(--ds-surface-2);
  color: var(--ds-text-secondary);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), var(--ds-shadow-sm);
  transition: transform 240ms var(--ease-out, ease), box-shadow 240ms var(--ease-out, ease);
}
.jp-marker--done {
  border-color: color-mix(in srgb, var(--ds-accent-gold) 60%, transparent);
  background: linear-gradient(150deg,
    color-mix(in srgb, var(--ds-accent-gold) 28%, var(--ds-surface-2)),
    var(--ds-surface-2));
  color: var(--ds-accent-gold);
}
.jp-marker--current {
  width: 44px;
  height: 44px;
  border-color: color-mix(in srgb, var(--ds-accent-primary) 70%, transparent);
  background: linear-gradient(150deg,
    color-mix(in srgb, var(--ds-accent-primary) 40%, var(--ds-surface-3)),
    var(--ds-surface-3));
  color: var(--ds-text-inverse);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.25),
    0 0 0 4px color-mix(in srgb, var(--ds-accent-primary) 16%, transparent),
    0 0 26px var(--ds-accent-primary-glow);
  animation: jp-pulse 2.8s ease-in-out infinite;
}
.jp-marker--future { opacity: 0.6; }

@keyframes jp-pulse {
  0%, 100% { box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.25),
      0 0 0 4px color-mix(in srgb, var(--ds-accent-primary) 14%, transparent),
      0 0 22px var(--ds-accent-primary-glow); }
  50% { box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.25),
      0 0 0 7px color-mix(in srgb, var(--ds-accent-primary) 10%, transparent),
      0 0 34px var(--ds-accent-primary-glow); }
}

/* The "أنت هنا" tag floating above the current marker */
.jp-here {
  position: absolute;
  top: -16px;
  inset-inline-start: 50%;
  transform: translateX(50%);     /* RTL-safe centring */
  white-space: nowrap;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 2px 7px;
  border-radius: var(--radius-full);
  color: var(--ds-text-inverse);
  background: linear-gradient(90deg, var(--ds-accent-primary), var(--ds-accent-gold));
  box-shadow: 0 4px 14px var(--ds-accent-primary-glow);
}

/* Station card column */
.jp-card-col { min-width: 0; }
.jp-card-col > * { width: 100%; }

.jp-eyebrow {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.jp-eyebrow__title {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--ds-text-primary);
}
.jp-eyebrow__tag {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: var(--radius-full);
  border: 1px solid var(--ds-border-subtle);
  color: var(--ds-text-tertiary);
  background: var(--ds-surface-1);
}
.jp-eyebrow__tag--done {
  color: var(--ds-accent-gold);
  border-color: color-mix(in srgb, var(--ds-accent-gold) 45%, transparent);
}

/* Chips (discover row + ribbon stats) */
.jp-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: var(--radius-full);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ds-text-secondary);
  background: var(--ds-surface-2);
  border: 1px solid var(--ds-border-subtle);
  text-decoration: none;
  transition: transform 200ms var(--ease-out, ease),
              border-color 200ms var(--ease-out, ease),
              color 200ms var(--ease-out, ease);
}
.jp-chip:hover {
  transform: translateY(-2px);
  border-color: var(--ds-border-strong);
  color: var(--ds-text-primary);
}

/* Desktop: alternate cards left/right of a centred spine */
@media (min-width: 880px) {
  .jp-spine { inset-inline-start: 50%; transform: translateX(50%); }
  .jp-station {
    grid-template-columns: 1fr 44px 1fr;
    align-items: center;
    gap: var(--space-5);
    padding-block: var(--space-4);
  }
  .jp-marker-col { order: 2; grid-column: 2; }
  .jp-card-col   { order: 1; grid-column: 1; }
  .jp-card-col--end { order: 3; grid-column: 3; }
  /* spacer keeps the empty side balanced */
  .jp-spacer { display: block; }
}
@media (max-width: 879px) {
  .jp-spacer { display: none; }
}
`

/* ── A station row (marker pinned to spine + card offset to a side) ────── */
function Station({ index, total, label, tag, state, side, delay, children }) {
  const reduced = useReducedMotion()
  const isCurrent = state === 'current'
  const isDone = state === 'done'

  const markerClass = isCurrent
    ? 'jp-marker jp-marker--current'
    : isDone
      ? 'jp-marker jp-marker--done'
      : 'jp-marker jp-marker--future'

  const cardColClass = side === 'end' ? 'jp-card-col jp-card-col--end' : 'jp-card-col'

  const card = (
    <motion.div
      className={cardColClass}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      animate={reduced ? { opacity: 1 } : undefined}
      viewport={{ once: true, margin: '-60px' }}
      transition={reduced ? undefined : { duration: 0.55, ease: APPLE_EASE, delay }}
    >
      <div className="jp-eyebrow">
        <h3 className="jp-eyebrow__title">{label}</h3>
        {tag ? (
          <span className={`jp-eyebrow__tag${isDone ? ' jp-eyebrow__tag--done' : ''}`}>{tag}</span>
        ) : null}
      </div>
      {children}
    </motion.div>
  )

  return (
    <div className="jp-station">
      {card}
      <div className="jp-marker-col">
        {isCurrent ? <span className="jp-here">أنت هنا</span> : null}
        <span className={markerClass} aria-hidden="true">
          {isDone ? '✓' : index}
        </span>
      </div>
      {/* desktop balance spacer on the opposite side */}
      <div className="jp-spacer" aria-hidden="true" />
    </div>
  )
}

export default function JourneyDashboard() {
  /* ── ALL HOOKS AT TOP (React #310 safe) ── */
  const reduced = useReducedMotion()
  const g = useG()
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)

  // ── DERIVED VALUES (real fields only) ──
  const xp = studentData?.xp_total || 0
  const streak = studentData?.current_streak || 0
  const academicLevel = studentData?.academic_level
  const packageKey = studentData?.package

  const level = getLevel(xp)
  const nextLevel = getNextLevel(xp)
  const xpProgress = nextLevel
    ? Math.min(100, Math.max(0, Math.round(((xp - level.xp) / (nextLevel.xp - level.xp)) * 100)))
    : 100
  const xpToNext = nextLevel ? Math.max(0, nextLevel.xp - xp) : 0

  const academic = ACADEMIC_LEVELS[academicLevel] || null
  const pkg = PACKAGES[packageKey] || null

  const greeting = getGreeting()
  const firstName = firstNameFrom(profile?.display_name || profile?.full_name) || 'صديقي'

  // ── GUARD (after all hooks) ──
  if (!profile) return <StudentDashboardSkeleton />

  return (
    <div className="pd-root" dir="rtl">
      <AmbientField />
      <style>{PATH_CSS}</style>

      <div style={{ position: 'relative', zIndex: 1 }} className="space-y-7">
        {/* ── 1 · Slim top status ribbon ─────────────────────────────── */}
        <motion.header
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? undefined : { duration: 0.5, ease: APPLE_EASE }}
          className="jp-wrap"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: 11.5,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ds-text-tertiary)',
              }}
            >
              {greeting} · رحلتك
            </p>
            <h1
              style={{
                margin: '4px 0 0',
                fontSize: 'clamp(1.45rem, 5vw, 2rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                color: 'var(--ds-text-primary)',
              }}
            >
              {firstName}
            </h1>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="jp-chip">
              <span aria-hidden="true">⭐</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{xp.toLocaleString('en-US')}</span>
              <span style={{ color: 'var(--ds-text-tertiary)', fontWeight: 600 }}>نقطة</span>
            </span>
            <span className="jp-chip">
              <span aria-hidden="true">🔥</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{streak}</span>
              <span style={{ color: 'var(--ds-text-tertiary)', fontWeight: 600 }}>يوم</span>
            </span>
            <span
              className="jp-chip"
              style={{
                color: 'var(--ds-accent-gold)',
                borderColor: 'color-mix(in srgb, var(--ds-accent-gold) 40%, transparent)',
              }}
            >
              <span aria-hidden="true">🏅</span>
              <span>{level.title_ar}</span>
              <span style={{ color: 'var(--ds-text-tertiary)', fontWeight: 600 }}>· مستوى {level.level}</span>
            </span>
            {academic ? (
              <span className="jp-chip">
                <span>{academic.name_ar}</span>
                <span style={{ color: 'var(--ds-text-tertiary)', fontWeight: 600 }}>{academic.cefr}</span>
              </span>
            ) : null}
          </div>
        </motion.header>

        {/* Retention surfaces (self-gate → may render null). Placed near the
            top of the path so urgent nudges are seen first. */}
        <div className="jp-wrap">
          <RetentionDashboardSection />
        </div>

        {/* ── 2 · THE PATH (signature) ───────────────────────────────── */}
        <div className="jp-wrap" style={{ position: 'relative' }}>
          <div className="jp-spine" aria-hidden="true" />

          {/* (a) CURRENT — تابع رحلتك → /student/curriculum */}
          <Station index={1} total={6} label={g('تابع رحلتك', 'تابعي رحلتكِ')} tag="الخطوة الحالية" state="current" side="start" delay={0.02}>
            <GlassPanel padding="lg" glow hover>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ds-text-secondary)', lineHeight: 1.7 }}>
                {pkg ? `${pkg.name_ar} · ` : ''}
                {academic ? `${academic.name_ar} (${academic.cefr})` : g('تابع من حيث توقفت', 'تابعي من حيث توقفتِ')}
              </p>

              {/* level-progress to next gamification level */}
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 6,
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: 'var(--ds-text-tertiary)', fontWeight: 600 }}>
                    {nextLevel
                      ? `باقٍ ${xpToNext.toLocaleString('en-US')} نقطة إلى ${nextLevel.title_ar}`
                      : 'وصلت إلى أعلى مستوى'}
                  </span>
                  <span
                    style={{
                      color: 'var(--ds-accent-gold)',
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {xpProgress}%
                  </span>
                </div>
                <div
                  style={{
                    height: 9,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--ds-surface-3)',
                    border: '1px solid var(--ds-border-subtle)',
                    overflow: 'hidden',
                  }}
                  role="progressbar"
                  aria-valuenow={xpProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <motion.div
                    initial={reduced ? false : { width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={reduced ? undefined : { duration: 0.9, ease: APPLE_EASE, delay: 0.2 }}
                    style={{
                      height: '100%',
                      borderRadius: 'var(--radius-full)',
                      background:
                        'linear-gradient(90deg, var(--ds-accent-primary), var(--ds-accent-gold))',
                      boxShadow: '0 0 16px var(--ds-accent-primary-glow)',
                    }}
                  />
                </div>
              </div>

              <Link
                to="/student/curriculum"
                className="pd-cta"
                style={{
                  marginTop: 'var(--space-5)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 22px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 800,
                  fontSize: 14.5,
                  textDecoration: 'none',
                  color: 'var(--ds-text-inverse)',
                  background:
                    'linear-gradient(135deg, var(--ds-accent-primary), var(--ds-accent-gold))',
                  boxShadow: '0 10px 30px var(--ds-accent-primary-glow)',
                }}
              >
                {g('تابع التعلّم', 'تابعي التعلّم')}
                <span aria-hidden="true">←</span>
              </Link>
            </GlassPanel>
          </Station>

          {/* (b) مراجعة اليوم → SrsReviewCard (self-gates) */}
          <Station index={2} total={6} label="مراجعة اليوم" tag="يومي" state="future" side="end" delay={0.04}>
            <SrsReviewCard studentId={profile.id} />
          </Station>

          {/* (c) إيقاعك → StreakWidget */}
          <Station index={3} total={6} label="إيقاعك" tag={streak > 0 ? `${streak} يوم` : null} state={streak > 0 ? 'done' : 'future'} side="start" delay={0.04}>
            <StreakWidget profileId={profile.id} />
          </Station>

          {/* (d) مجموعتك → TeamCard */}
          <Station index={4} total={6} label="مجموعتك" tag="فريق" state="future" side="end" delay={0.04}>
            <TeamCard groupId={studentData?.group_id} />
          </Station>

          {/* (e) تقدّم اليوم → DailyProgressWidget */}
          <Station index={5} total={6} label="تقدّم اليوم" tag="اليوم" state="future" side="start" delay={0.04}>
            <DailyProgressWidget studentId={profile.id} />
          </Station>

          {/* (f) اكتشف → discover chips (real routes) */}
          <Station index={6} total={6} label="اكتشف" tag="المزيد" state="future" side="end" delay={0.04}>
            <GlassPanel padding="lg" hover>
              <p style={{ margin: '0 0 var(--space-4)', fontSize: 13, color: 'var(--ds-text-secondary)', lineHeight: 1.7 }}>
                وسّع رحلتك — تمارين ومهارات إضافية بانتظارك.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <Link to="/student/spelling-lab" className="jp-chip">
                  <span aria-hidden="true">✍️</span> مختبر الإملاء
                </Link>
                <Link to="/student/speaking-hub" className="jp-chip">
                  <span aria-hidden="true">🎙️</span> معمل التحدّث
                </Link>
                <Link to="/student/flashcards" className="jp-chip">
                  <span aria-hidden="true">🃏</span> البطاقات
                </Link>
                <Link to="/student/leaderboard" className="jp-chip">
                  <span aria-hidden="true">🏆</span> المتصدّرون
                </Link>
                <Link to="/student/mock-exam" className="jp-chip">
                  <span aria-hidden="true">📝</span> الاختبار التجريبي
                </Link>
              </div>
            </GlassPanel>
          </Station>

          {/* path end-cap: a small "the journey continues" flourish */}
          <Band delay={0.05}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                paddingInlineStart: 60,
                marginTop: 'var(--space-2)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--ds-accent-primary)',
                  boxShadow: '0 0 16px var(--ds-accent-primary-glow)',
                }}
              />
              <span style={{ fontSize: 12.5, color: 'var(--ds-text-tertiary)', fontWeight: 600 }}>
                كل خطوة تقرّبك أكثر — رحلتك مستمرّة.
              </span>
            </div>
          </Band>
        </div>

        {/* bottom breathing room (mobile bar spacer handled by LayoutShell) */}
        <div className="h-2" aria-hidden="true" />
      </div>
    </div>
  )
}
