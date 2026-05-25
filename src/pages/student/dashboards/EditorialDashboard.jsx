import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Flame,
  Sparkles,
  Video,
  Layers,
  Quote,
} from 'lucide-react'

/* ------------------------------------------------------------------ *
 * Fluentia LMS — Student Dashboard, VARIANT "EDITORIAL"
 * Pure VIEW component. Receives { data, isLoading, error, profile }.
 * NEVER fetches. Every widget has an empty state. RTL-aware.
 * ------------------------------------------------------------------ */

/* ---- design tokens (consume only, never invent) ---- */
const PAPER = 'var(--ds-paper, var(--ds-bg-base, #0a0512))'
const GOLD = 'var(--ds-accent-primary, #e9b949)'
const INK = 'var(--ds-text-primary, #f8fafc)'
const INK_2 = 'var(--ds-text-secondary, #94a3b8)'
const INK_3 = 'var(--ds-text-tertiary, #64748b)'

/* ---- fonts (already loaded; use via inline fontFamily) ---- */
const F_DISPLAY = "'Cormorant Garamond', 'Playfair Display', serif"
const F_MONO = "'Space Grotesk', monospace"
const F_BODY = "'Readex Pro', sans-serif"
const F_AR = "'Tajawal', sans-serif"

/* ------------------------------------------------------------------ *
 * Editorial copy helpers (all in-file; no runtime AI)
 * ------------------------------------------------------------------ */
function editorialStreak(days) {
  const d = Number(days) || 0
  if (d <= 0) return 'Today is a quiet page. Open it.'
  if (d < 3) return 'A second day. Then a third.'
  if (d < 7) return 'A week is forming.'
  if (d < 30) return 'The ritual is yours now.'
  return 'Longer than most people last with anything.'
}

/* Turn the peer-activity array into a single prose paragraph. */
function activityProse(activity) {
  if (!Array.isArray(activity) || activity.length === 0) return null
  const verbFor = (a) => {
    switch (a?.type) {
      case 'streak':
        return 'extended a streak'
      case 'achievement':
        return 'earned an achievement'
      case 'level_up':
        return 'moved up a level'
      case 'unit':
      case 'lesson':
        return 'finished a lesson'
      case 'xp':
        return 'pushed ahead'
      default:
        return 'made progress'
    }
  }
  const parts = activity.slice(0, 4).map((a) => {
    const who = a?.actor_name || 'A classmate'
    return `${who} ${verbFor(a)}`
  })
  return parts.join('. ') + '.'
}

/* Short, friendly relative time for trainer-note / activity timestamps. */
function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `قبل ${mins} د`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `قبل ${hrs} س`
  const days = Math.round(hrs / 24)
  return `قبل ${days} ي`
}

/* Riyadh-time formatter for the next class. */
function riyadhTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  try {
    return d.toLocaleString('ar-SA', {
      timeZone: 'Asia/Riyadh',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
  }
}

/* Compact countdown to a future ISO time. */
function countdown(iso) {
  if (!iso) return ''
  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) return ''
  const diff = target - Date.now()
  if (diff <= 0) return 'الآن'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `بعد ${mins} دقيقة`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `بعد ${hrs} ساعة`
  const days = Math.round(hrs / 24)
  return `بعد ${days} يوم`
}

/* ------------------------------------------------------------------ *
 * Small presentational primitives
 * ------------------------------------------------------------------ */
function Hairline({ style }) {
  return (
    <div
      aria-hidden
      style={{
        height: 1,
        width: '100%',
        background: `linear-gradient(90deg, ${GOLD}66, ${GOLD}1a 60%, transparent)`,
        ...style,
      }}
    />
  )
}

function SectionLabel({ children }) {
  return (
    <div
      dir="ltr"
      style={{
        fontFamily: F_MONO,
        fontSize: 13,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: GOLD,
      }}
    >
      {children}
    </div>
  )
}

/* A 2-column editorial row: ~90px small-caps left rail + content. */
function RailRow({ label, children }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '90px 1fr',
        gap: 16,
        alignItems: 'baseline',
        padding: '14px 0',
        borderBottom: `1px solid ${INK_3}26`,
      }}
    >
      <div
        dir="ltr"
        style={{
          fontFamily: F_MONO,
          fontSize: 11,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: INK_3,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Skeleton (reserves layout to keep CLS ≤ 0.05)
 * ------------------------------------------------------------------ */
function Bar({ w = '100%', h = 16, mt = 0, radius = 4 }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        marginTop: mt,
        borderRadius: radius,
        background: `${INK_3}1f`,
      }}
    />
  )
}

function EditorialSkeleton({ shell }) {
  return (
    <div style={shell.outer}>
      <div style={shell.inner}>
        <Bar w="180px" h={11} />
        <Bar w="55%" h={40} mt={28} />
        <Bar w="80%" h={80} mt={14} />
        <div style={{ marginTop: 28 }}>
          <Hairline />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr',
            gap: 24,
            marginTop: 28,
          }}
        >
          <Bar h={140} radius={12} />
          <Bar h={140} radius={12} />
        </div>
        <div style={{ marginTop: 32 }}>
          <Hairline />
        </div>
        <Bar w="120px" h={13} mt={28} />
        <Bar h={48} mt={16} />
        <Bar h={48} mt={8} />
        <Bar h={48} mt={8} />
        <div style={{ marginTop: 32 }}>
          <Hairline />
        </div>
        <Bar w="120px" h={13} mt={28} />
        <Bar h={60} mt={16} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Main component
 * ------------------------------------------------------------------ */
export default function EditorialDashboard({ data, isLoading, error, profile }) {
  const prefersReduced = useReducedMotion()

  /* --- ALL hooks before any conditional return --- */

  // Issue line + section motion variants are derived once.
  const issueLine = useMemo(() => {
    const now = new Date()
    // Editorial "issue number": month index (1-12), zero-padded.
    const issueNo = String(now.getMonth() + 1).padStart(2, '0')
    const monthYear = now
      .toLocaleDateString('en', { month: 'long', year: 'numeric' })
      .toUpperCase()
    return `ISSUE ${issueNo} · ${monthYear}`
  }, [])

  const motionConfig = useMemo(() => {
    if (prefersReduced) {
      return {
        container: {
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.08 } },
        },
        item: {
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { duration: 0.4 } },
        },
      }
    }
    return {
      container: {
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.08, delayChildren: 0.05 },
        },
      },
      item: {
        hidden: { opacity: 0, y: 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        },
      },
    }
  }, [prefersReduced])

  const prose = useMemo(() => activityProse(data?.activity), [data?.activity])

  const weekSeries = useMemo(() => {
    const s = data?.xp_week_series
    if (!Array.isArray(s) || s.length === 0) return []
    return s
  }, [data?.xp_week_series])

  const weekMax = useMemo(() => {
    if (weekSeries.length === 0) return 0
    return Math.max(1, ...weekSeries.map((d) => Number(d?.xp) || 0))
  }, [weekSeries])

  /* --- shared shell styling (used by skeleton + main) --- */
  const shell = {
    outer: {
      minHeight: '100vh',
      width: '100%',
      background: PAPER,
      backgroundImage: `radial-gradient(800px 800px at 100% 0%, ${GOLD}33, transparent 70%)`,
      backgroundRepeat: 'no-repeat',
      color: INK,
      padding: '40px 20px 96px',
    },
    inner: {
      maxWidth: '66rem',
      margin: '0 auto',
      width: '100%',
    },
  }

  /* --- loading: calm skeleton when no data yet --- */
  if (isLoading && !data) {
    return <EditorialSkeleton shell={shell} />
  }

  /* On error we STILL render the layout with empty states (no error screen). */
  const d = data || {}
  const identity = d.identity || {}
  const level = d.level || {}
  const streak = d.streak || {}
  const xp = d.xp || {}
  const nextClass = d.next_class || null
  const challenge = d.daily_challenge || null
  const ankiDue = Number(d.anki_due) || 0
  const motivation = d.motivation || {}
  const trainerNote = d.trainer_note || null

  const greeting = identity.greeting || 'أهلاً بك'
  const name = identity.name_ar || profile?.name_ar || profile?.full_name || 'الطالب'

  const streakDays = Number(streak.current) || 0
  const standfirst = editorialStreak(streakDays)

  // Second stat tile: prefer XP today, fall back to level percent.
  const hasXpToday = xp.today != null
  const secondStatLabel = hasXpToday ? 'XP TODAY' : 'LEVEL'
  const secondStatValue = hasXpToday
    ? String(Number(xp.today) || 0)
    : `${Number(level.percent) || 0}%`
  const secondStatNote = hasXpToday
    ? level.current
      ? `${level.current}${level.cefr ? ` · ${level.cefr}` : ''}`
      : 'Points earned since midnight.'
    : level.current || 'Your progress through the level.'

  const Item = (props) => (
    <motion.div variants={motionConfig.item} {...props} />
  )

  return (
    <div style={shell.outer}>
      <motion.div
        style={shell.inner}
        variants={motionConfig.container}
        initial="hidden"
        animate="show"
      >
        {/* 1. Micro-eyebrow */}
        <Item>
          <div
            dir="ltr"
            style={{
              fontFamily: F_MONO,
              fontSize: 11,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: GOLD,
            }}
          >
            {issueLine}
          </div>
        </Item>

        {/* 2. Greeting + name */}
        <Item>
          <h2
            dir="rtl"
            style={{
              margin: '22px 0 0',
              fontFamily: F_DISPLAY,
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(32px, 6vw, 44px)',
              lineHeight: 1.1,
              color: INK_2,
            }}
          >
            {greeting}
          </h2>
        </Item>
        <Item>
          <h1
            dir="rtl"
            style={{
              margin: '6px 0 0',
              fontFamily: F_DISPLAY,
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: 'clamp(64px, 12vw, 88px)',
              lineHeight: 0.95,
              color: INK,
            }}
          >
            {name}
          </h1>
        </Item>

        {/* 3. Hairline */}
        <Item>
          <div style={{ marginTop: 28 }}>
            <Hairline />
          </div>
        </Item>

        {/* 4. Two asymmetric stat tiles */}
        <Item>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)',
              gap: 'clamp(16px, 4vw, 40px)',
              marginTop: 28,
            }}
          >
            <StatTile
              icon={<Flame size={16} strokeWidth={1.75} color={GOLD} />}
              label="STREAK"
              value={String(streakDays)}
              unit={streakDays === 1 ? 'day' : 'days'}
              standfirst={standfirst}
              hover={!prefersReduced}
              footnote={
                streak.longest != null
                  ? `Longest: ${streak.longest} · Freezes: ${streak.freezes ?? 0}`
                  : null
              }
            />
            <StatTile
              icon={<Sparkles size={16} strokeWidth={1.75} color={GOLD} />}
              label={secondStatLabel}
              value={secondStatValue}
              unit={hasXpToday ? 'xp' : ''}
              standfirst={secondStatNote}
              hover={!prefersReduced}
              footnote={
                xp.total != null ? `Total ${Number(xp.total) || 0} XP` : null
              }
            />
          </div>
        </Item>

        {/* 5. TODAY rail */}
        <Item>
          <div style={{ marginTop: 36 }}>
            <Hairline />
          </div>
        </Item>
        <Item>
          <div style={{ marginTop: 28 }}>
            <SectionLabel>TODAY</SectionLabel>
            <div style={{ marginTop: 8 }}>
              {/* CLASS */}
              <RailRow label="Class">
                {nextClass ? (
                  <a
                    href={nextClass.meet_url || '/student/schedule'}
                    dir="rtl"
                    style={{
                      display: 'block',
                      textDecoration: 'none',
                      color: INK,
                      fontFamily: F_AR,
                      fontSize: 16,
                      lineHeight: 1.6,
                    }}
                  >
                    <Video
                      size={14}
                      strokeWidth={1.75}
                      color={GOLD}
                      style={{ verticalAlign: 'middle', marginInlineEnd: 6 }}
                    />
                    {nextClass.trainer_name || 'حصتك القادمة'} ·{' '}
                    {riyadhTime(nextClass.starts_at)}{' '}
                    <span style={{ color: INK_3 }}>
                      ({countdown(nextClass.starts_at)})
                    </span>
                  </a>
                ) : (
                  <span dir="rtl" style={{ color: INK_3, fontFamily: F_AR }}>
                    لا توجد حصة قادمة بعد.
                  </span>
                )}
              </RailRow>

              {/* CHALLENGE */}
              <RailRow label="Challenge">
                {challenge ? (
                  <a
                    href={`/student/challenges${
                      challenge.id ? `/${challenge.id}` : ''
                    }`}
                    dir="rtl"
                    style={{
                      display: 'block',
                      textDecoration: 'none',
                      color: INK,
                      fontFamily: F_AR,
                      fontSize: 16,
                      lineHeight: 1.6,
                    }}
                  >
                    {challenge.title_ar || 'تحدي اليوم'}{' '}
                    <span dir="ltr" style={{ color: INK_2, fontFamily: F_MONO, fontSize: 13 }}>
                      {challenge.type ? `${challenge.type} · ` : ''}+
                      {Number(challenge.xp) || 0} XP →
                    </span>
                  </a>
                ) : (
                  <span dir="rtl" style={{ color: INK_3, fontFamily: F_AR }}>
                    لا يوجد تحدٍّ اليوم. عُد غداً.
                  </span>
                )}
              </RailRow>

              {/* ANKI */}
              <RailRow label="Anki">
                {ankiDue > 0 ? (
                  <a
                    href="/student/srs"
                    dir="rtl"
                    style={{
                      display: 'block',
                      textDecoration: 'none',
                      color: INK,
                      fontFamily: F_AR,
                      fontSize: 16,
                      lineHeight: 1.6,
                    }}
                  >
                    <Layers
                      size={14}
                      strokeWidth={1.75}
                      color={GOLD}
                      style={{ verticalAlign: 'middle', marginInlineEnd: 6 }}
                    />
                    {ankiDue} كلمة بانتظارك{' '}
                    <span dir="ltr" style={{ color: INK_2, fontFamily: F_MONO, fontSize: 13 }}>
                      →
                    </span>
                  </a>
                ) : (
                  <span dir="rtl" style={{ color: INK_3, fontFamily: F_AR }}>
                    لا كلمات مستحقّة. مراجعتك متّسقة.
                  </span>
                )}
              </RailRow>
            </div>
          </div>
        </Item>

        {/* 6. THE CLASS — peer activity as prose */}
        <Item>
          <div style={{ marginTop: 36 }}>
            <Hairline />
          </div>
        </Item>
        <Item>
          <div style={{ marginTop: 28 }}>
            <SectionLabel>THE CLASS</SectionLabel>
            <p
              dir="ltr"
              style={{
                margin: '14px 0 0',
                fontFamily: F_BODY,
                fontSize: 'clamp(15px, 2.2vw, 18px)',
                lineHeight: 1.75,
                color: prose ? INK_2 : INK_3,
                maxWidth: '52ch',
              }}
            >
              {prose || "Your classmates' moments will appear here."}
            </p>
            {trainerNote?.body_ar ? (
              <p
                dir="rtl"
                style={{
                  margin: '16px 0 0',
                  fontFamily: F_AR,
                  fontSize: 15,
                  lineHeight: 1.8,
                  color: INK_2,
                  borderInlineStart: `2px solid ${GOLD}`,
                  paddingInlineStart: 14,
                }}
              >
                {trainerNote.body_ar}
                <span style={{ color: INK_3, fontSize: 12, display: 'block', marginTop: 4 }}>
                  من مدرّبك · {timeAgo(trainerNote.created_at)}
                </span>
              </p>
            ) : null}
          </div>
        </Item>

        {/* 7. THIS WEEK — minimal bar chart */}
        <Item>
          <div style={{ marginTop: 36 }}>
            <Hairline />
          </div>
        </Item>
        <Item>
          <div style={{ marginTop: 28 }}>
            <SectionLabel>THIS WEEK</SectionLabel>
            {weekSeries.length > 0 ? (
              <div
                dir="ltr"
                style={{
                  marginTop: 18,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${weekSeries.length}, 1fr)`,
                  gap: 'clamp(6px, 2vw, 16px)',
                  alignItems: 'end',
                  height: 160,
                }}
              >
                {weekSeries.map((dpt, i) => {
                  const val = Number(dpt?.xp) || 0
                  const pct = weekMax > 0 ? Math.round((val / weekMax) * 100) : 0
                  const isPeak = val === weekMax && val > 0
                  return (
                    <div
                      key={dpt?.day_label ?? i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        height: '100%',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: F_MONO,
                          fontSize: 10,
                          color: INK_3,
                          marginBottom: 6,
                        }}
                      >
                        {val}
                      </div>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: 36,
                          height: `${Math.max(pct, val > 0 ? 6 : 2)}%`,
                          minHeight: 2,
                          borderRadius: 3,
                          background: isPeak ? GOLD : `${INK_2}59`,
                          transition: prefersReduced ? 'none' : 'height 0.4s ease',
                        }}
                      />
                      <div
                        style={{
                          fontFamily: F_MONO,
                          fontSize: 10,
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          color: INK_3,
                          marginTop: 8,
                        }}
                      >
                        {dpt?.day_label ?? '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p
                dir="rtl"
                style={{
                  margin: '14px 0 0',
                  fontFamily: F_AR,
                  fontSize: 15,
                  color: INK_3,
                }}
              >
                سيظهر هنا أداؤك الأسبوعي بمجرد أن تبدأ.
              </p>
            )}
          </div>
        </Item>

        {/* 8. Motivation quote */}
        <Item>
          <div style={{ marginTop: 36 }}>
            <Hairline />
          </div>
        </Item>
        <Item>
          <div style={{ marginTop: 28, position: 'relative' }}>
            <Quote
              size={40}
              strokeWidth={1}
              color={`${GOLD}`}
              style={{
                position: 'absolute',
                insetInlineStart: -6,
                top: -10,
                opacity: 0.35,
                transform: 'scaleX(-1)',
              }}
              aria-hidden
            />
            {motivation.ar || motivation.en ? (
              <figure style={{ margin: 0, paddingInlineStart: 8 }}>
                {motivation.ar ? (
                  <blockquote
                    dir="rtl"
                    style={{
                      margin: 0,
                      fontFamily: F_AR,
                      fontStyle: 'italic',
                      fontSize: 'clamp(18px, 3vw, 22px)',
                      lineHeight: 1.7,
                      color: INK,
                    }}
                  >
                    {motivation.ar}
                  </blockquote>
                ) : null}
                {motivation.en ? (
                  <figcaption
                    dir="ltr"
                    style={{
                      marginTop: 10,
                      fontFamily: F_BODY,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: INK_3,
                    }}
                  >
                    {motivation.en}
                  </figcaption>
                ) : null}
              </figure>
            ) : (
              <p
                dir="rtl"
                style={{
                  margin: 0,
                  paddingInlineStart: 8,
                  fontFamily: F_AR,
                  fontStyle: 'italic',
                  fontSize: 20,
                  color: INK_3,
                }}
              >
                كل صفحة جديدة تبدأ بخطوة واحدة.
              </p>
            )}
          </div>
        </Item>
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Stat tile — big editorial number + standfirst
 * ------------------------------------------------------------------ */
function StatTile({ icon, label, value, unit, standfirst, footnote, hover }) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.005 } : undefined}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}
    >
      <div
        dir="ltr"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: F_MONO,
          fontSize: 11,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: INK_3,
        }}
      >
        {icon}
        {label}
      </div>
      <div
        dir="ltr"
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginTop: 6,
        }}
      >
        <span
          style={{
            fontFamily: F_MONO,
            fontWeight: 300,
            fontSize: 'clamp(64px, 13vw, 96px)',
            lineHeight: 0.92,
            color: INK,
            letterSpacing: '-2px',
          }}
        >
          {value}
        </span>
        {unit ? (
          <span
            style={{
              fontFamily: F_MONO,
              fontSize: 14,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              color: GOLD,
            }}
          >
            {unit}
          </span>
        ) : null}
      </div>
      <p
        dir="ltr"
        style={{
          margin: '8px 0 0',
          fontFamily: F_DISPLAY,
          fontStyle: 'italic',
          fontSize: 'clamp(15px, 2.4vw, 18px)',
          lineHeight: 1.4,
          color: INK_2,
          maxWidth: '34ch',
        }}
      >
        {standfirst}
      </p>
      {footnote ? (
        <div
          dir="ltr"
          style={{
            marginTop: 8,
            fontFamily: F_MONO,
            fontSize: 11,
            letterSpacing: '1px',
            color: INK_3,
          }}
        >
          {footnote}
        </div>
      ) : null}
    </motion.div>
  )
}
