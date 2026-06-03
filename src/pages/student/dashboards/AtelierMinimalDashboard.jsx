import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useG } from '../../../i18n/gender'

/* ------------------------------------------------------------------ *
 * Fluentia LMS — Student Dashboard, VARIANT "ATELIER-MINIMAL"
 * Bauhaus meets Arabic editorial. Strict grid, no decoration.
 * Typography does all the work — the page reads as ONE document.
 * Velvet Midnight tokens at their quietest: gold = 1px hairlines only.
 * Pure VIEW component. Receives { data, isLoading, error, profile }.
 * NEVER fetches. Every widget has an empty state. RTL-primary.
 * ------------------------------------------------------------------ */

/* ---- design tokens (consume only, never invent) ---- */
const PAPER = 'var(--ds-paper, var(--ds-bg-base, #0a0512))'
const GOLD = 'var(--ds-accent-primary, #e9b949)'
const INK = 'var(--ds-text-primary, #f8fafc)'
const INK_2 = 'var(--ds-text-secondary, #94a3b8)'
const INK_3 = 'var(--ds-text-tertiary, var(--ds-text-muted, #64748b))'

/* ---- fonts (already loaded; use via inline fontFamily) ---- */
const F_AR = "'Amiri', serif"        // wordmark / name / section heads / quote
const F_BODY = "'Readex Pro', sans-serif" // body + rows
const F_MONO = "'Space Grotesk', monospace" // big numerals (light)

/* ------------------------------------------------------------------ *
 * Pure helpers (no runtime fetch, no side effects)
 * ------------------------------------------------------------------ */

/* Arabic calendar date for the top row. */
function arabicToday() {
  try {
    return new Date().toLocaleDateString('ar-SA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return ''
  }
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
    return ''
  }
}

/* Short Arabic relative time for the peer-activity rows. */
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

/* Turn one activity row into a short Arabic action summary. */
function activitySummary(a) {
  switch (a?.type) {
    case 'streak':
      return 'مدّت سلسلتها'
    case 'achievement':
      return 'حصلت على إنجاز'
    case 'level_up':
      return 'انتقلت لمستوى أعلى'
    case 'unit':
    case 'lesson':
      return 'أنهت درساً'
    case 'xp':
      return a?.xp ? `كسبت ${a.xp} نقطة` : 'تقدّمت'
    default:
      return 'تقدّمت'
  }
}

/* ------------------------------------------------------------------ *
 * Motion — quiet. Hairlines draw left→right, cascading.
 * ------------------------------------------------------------------ */
function useMotion(reduced) {
  return useMemo(() => {
    if (reduced) {
      return {
        doc: { initial: { opacity: 1 }, animate: { opacity: 1 } },
        // hairline appears instantly
        hair: () => ({ initial: { scaleX: 1 }, animate: { scaleX: 1 }, transition: { duration: 0 } }),
      }
    }
    return {
      doc: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.2, ease: 'easeOut' },
      },
      hair: (i) => ({
        initial: { scaleX: 0 },
        animate: { scaleX: 1 },
        transition: { duration: 0.4, ease: 'easeOut', delay: 0.1 * (i || 0) },
      }),
    }
  }, [reduced])
}

/* Reusable 1px gold hairline that draws left→right (origin = inline-end for RTL). */
function Hairline({ index, M }) {
  return (
    <motion.div
      aria-hidden="true"
      style={{
        height: 1,
        background: GOLD,
        opacity: 0.55,
        transformOrigin: 'right center',
        margin: '2.75rem 0',
      }}
      {...M.hair(index)}
    />
  )
}

/* Amiri section head + short underline beneath it. */
function SectionHead({ children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h2
        style={{
          fontFamily: F_AR,
          fontSize: '1.25rem', // ~20px desktop
          color: INK_3,
          margin: 0,
          fontWeight: 700,
        }}
      >
        {children}
      </h2>
      <div
        aria-hidden="true"
        style={{ width: 60, height: 1, background: GOLD, opacity: 0.55, marginTop: 8 }}
      />
    </div>
  )
}

/* A single "اليوم" row: text + mid-dots, optional trailing action link. */
function TodayRow({ text, actionLabel, href }) {
  return (
    <div
      dir="rtl"
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.55rem 0',
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontFamily: F_BODY,
          fontSize: '0.95rem',
          color: INK_2,
          lineHeight: 1.6,
        }}
      >
        {text}
      </span>
      {actionLabel ? (
        <a
          href={href || '#'}
          className="atelier-link"
          style={{
            fontFamily: F_BODY,
            fontSize: '0.85rem',
            color: INK,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'color 150ms ease',
          }}
        >
          {actionLabel}
        </a>
      ) : null}
    </div>
  )
}

/* Empty-row placeholder for the "اليوم" section. */
function TodayEmpty({ text }) {
  return (
    <div dir="rtl" style={{ padding: '0.55rem 0' }}>
      <span style={{ fontFamily: F_BODY, fontSize: '0.95rem', color: INK_3, lineHeight: 1.6 }}>
        {text}
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * The component
 * ------------------------------------------------------------------ */
export default function AtelierMinimalDashboard({ data, isLoading, error, profile }) {
  /* ---- ALL hooks BEFORE any conditional return ---- */
  const reduced = useReducedMotion()
  const g = useG()
  const M = useMotion(reduced)

  const today = useMemo(() => arabicToday(), [])

  const identity = data?.identity || null
  const name = identity?.name_ar || profile?.name_ar || profile?.full_name || ''

  const levelLabel = useMemo(() => {
    const lvl = data?.level
    if (!lvl) return ''
    const parts = []
    if (lvl.current) parts.push(`المستوى ${lvl.current}`)
    if (lvl.cefr) parts.push(lvl.cefr)
    return parts.join(' · ')
  }, [data?.level])

  /* Three "اليوم" rows, each with its own empty fallback. */
  const todayRows = useMemo(() => {
    const rows = []
    const nc = data?.next_class
    if (nc && (nc.starts_at || nc.trainer_name)) {
      const t = riyadhTime(nc.starts_at)
      const bits = ['صف اليوم']
      if (t) bits.push(t)
      if (nc.trainer_name) bits.push(`مع ${nc.trainer_name}`)
      rows.push({
        key: 'class',
        text: bits.join(' · '),
        actionLabel: 'انضمي →',
        href: nc.meet_url || '#',
      })
    } else {
      rows.push({ key: 'class', empty: true, text: 'لا يوجد صف مجدول اليوم' })
    }

    const ch = data?.daily_challenge
    if (ch && ch.title_ar) {
      const mins = ch.xp ? Math.max(1, Math.round(ch.xp / 5)) : null
      const bits = ['تحدي اليوم', ch.title_ar]
      if (mins) bits.push(`${mins} دقائق`)
      rows.push({ key: 'challenge', text: bits.join(' · '), actionLabel: g('ابدأ →', 'ابدئي →'), href: '#' })
    } else {
      rows.push({ key: 'challenge', empty: true, text: 'لا يوجد تحدٍّ لليوم بعد' })
    }

    const due = Number(data?.anki_due) || 0
    if (due > 0) {
      rows.push({
        key: 'anki',
        text: `${due} كلمات في Anki جاهزة للمراجعة`,
        actionLabel: g('راجع →', 'راجعي →'),
        href: '#',
      })
    } else {
      rows.push({ key: 'anki', empty: true, text: 'لا كلمات للمراجعة الآن' })
    }
    return rows
  }, [data?.next_class, data?.daily_challenge, data?.anki_due, g])

  const streakValue = Number(data?.streak?.current) || 0

  const teamName = data?.team?.name || 'صف الطلاقة'

  const activity = useMemo(
    () => (Array.isArray(data?.activity) ? data.activity.filter(Boolean).slice(0, 12) : []),
    [data?.activity]
  )

  const weekSeries = useMemo(() => {
    const s = Array.isArray(data?.xp_week_series) ? data.xp_week_series.filter(Boolean) : []
    const max = s.reduce((m, r) => Math.max(m, Number(r?.xp) || 0), 0)
    return { rows: s, max }
  }, [data?.xp_week_series])

  const motivation = data?.motivation || null

  /* ---- conditional render AFTER all hooks ---- */
  const hasData = !!data

  return (
    <motion.div
      dir="rtl"
      style={{
        minHeight: '100dvh',
        background: PAPER,
        color: INK,
        padding: '3rem 1.25rem 5rem',
        display: 'flex',
        justifyContent: 'center',
      }}
      {...M.doc}
    >
      {/* scoped style: hover = ink shift only, responsive type, no transforms */}
      <style>{`
        .atelier-link:hover { color: ${GOLD}; }
        .atelier-name { font-size: 72px; line-height: 1.02; }
        .atelier-streak { font-size: 80px; line-height: 1; }
        .atelier-quote { font-size: 22px; }
        .atelier-peer-time { text-align: left; }
        @media (max-width: 600px) {
          .atelier-name { font-size: 56px; }
          .atelier-streak { font-size: 64px; }
          .atelier-quote { font-size: 19px; }
          .atelier-body { font-size: 14px !important; }
          .atelier-head { font-size: 18px !important; }
          .atelier-peer-row { grid-template-columns: 1fr !important; row-gap: 2px; }
          .atelier-peer-time { text-align: right; }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '28rem' }}>
        {/* ---- 1. Top row: date (right) + level — justified between ---- */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <span style={{ fontFamily: F_BODY, fontSize: 12, color: INK_3 }}>
            {isLoading && !hasData ? ' ' : today}
          </span>
          <span style={{ fontFamily: F_BODY, fontSize: 12, color: INK_3 }}>
            {levelLabel || (isLoading && !hasData ? ' ' : '')}
          </span>
        </div>

        {/* ---- 2. Name + period for finality ---- */}
        <h1
          className="atelier-name"
          style={{
            fontFamily: F_AR,
            color: INK,
            margin: '1.5rem 0 0',
            fontWeight: 700,
            minHeight: 76, // reserve space → CLS guard
          }}
        >
          {name ? `${name}.` : isLoading && !hasData ? ' ' : 'مرحباً.'}
        </h1>

        {/* ---- 3. اليوم ---- */}
        <Hairline index={0} M={M} />
        <SectionHead>اليوم</SectionHead>
        <div>
          {todayRows.map((r) =>
            r.empty ? (
              <TodayEmpty key={r.key} text={r.text} />
            ) : (
              <TodayRow key={r.key} text={r.text} actionLabel={r.actionLabel} href={r.href} />
            )
          )}
        </div>

        {/* ---- 4. Streak ---- */}
        <Hairline index={1} M={M} />
        <div>
          <div
            className="atelier-streak"
            style={{
              fontFamily: F_MONO,
              fontWeight: 300,
              color: INK,
              letterSpacing: '-0.02em',
              minHeight: 84, // reserve space
            }}
          >
            {streakValue}
          </div>
          <div style={{ fontFamily: F_BODY, fontSize: 15, color: INK_2, marginTop: 4 }}>
            {streakValue > 0 ? 'يوم متصلة من التعلّم' : g('ابدأ سلسلتك اليوم', 'ابدئي سلسلتك اليوم')}
          </div>
        </div>

        {/* ---- 5. Peers ---- */}
        <Hairline index={2} M={M} />
        <SectionHead>{teamName}</SectionHead>
        {activity.length === 0 ? (
          <div style={{ fontFamily: F_BODY, fontSize: 14, color: INK_3, padding: '0.4rem 0' }}>
            لا نشاط من زميلاتك بعد — كوني أول من يبدأ.
          </div>
        ) : (
          <div>
            {activity.map((a) => (
              <div
                key={a.id}
                className="atelier-peer-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.4fr auto',
                  gap: '0.75rem',
                  alignItems: 'baseline',
                  padding: '0.45rem 0',
                  fontFamily: F_BODY,
                  fontSize: 14,
                }}
              >
                <span style={{ color: INK }}>{a.actor_name || 'زميلة'}</span>
                <span style={{ color: INK_2 }}>{activitySummary(a)}</span>
                <span
                  className="atelier-peer-time"
                  style={{ color: INK_3, fontFamily: F_MONO, fontSize: 12 }}
                >
                  {timeAgo(a.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ---- 6. This week (block-character bar chart) ---- */}
        <Hairline index={3} M={M} />
        <SectionHead>هذا الأسبوع</SectionHead>
        {weekSeries.rows.length === 0 ? (
          <div style={{ fontFamily: F_BODY, fontSize: 14, color: INK_3, padding: '0.4rem 0' }}>
            لا توجد بيانات لهذا الأسبوع بعد.
          </div>
        ) : (
          <div>
            {weekSeries.rows.map((r, i) => {
              const xp = Number(r?.xp) || 0
              const count = weekSeries.max > 0 ? Math.round((xp / weekSeries.max) * 18) : 0
              const bars = '▮'.repeat(Math.max(xp > 0 ? 1 : 0, count))
              return (
                <div
                  key={`${r?.day_label || 'd'}-${i}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3.5rem 1fr 3rem',
                    gap: '0.6rem',
                    alignItems: 'center',
                    padding: '0.25rem 0',
                    fontFamily: F_BODY,
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: INK_2 }}>{r?.day_label || ''}</span>
                  <span
                    aria-hidden="true"
                    style={{
                      fontFamily: F_MONO,
                      color: INK,
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      direction: 'ltr',
                    }}
                  >
                    {bars || ' '}
                  </span>
                  <span style={{ color: INK_3, fontFamily: F_MONO, fontSize: 12, textAlign: 'left' }}>
                    {xp}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* ---- 7. Motivation ---- */}
        <Hairline index={4} M={M} />
        {motivation?.ar ? (
          <figure style={{ margin: 0 }}>
            <blockquote
              className="atelier-quote"
              style={{
                fontFamily: F_AR,
                fontStyle: 'italic',
                color: INK,
                margin: 0,
                lineHeight: 1.7,
                textIndent: '-0.6em', // hang the opening «
              }}
            >
              {`«${motivation.ar}»`}
            </blockquote>
            {motivation.en ? (
              <figcaption
                dir="ltr"
                style={{
                  fontFamily: F_BODY,
                  fontSize: 12,
                  color: INK_3,
                  marginTop: '0.75rem',
                  textAlign: 'right',
                }}
              >
                {motivation.en}
              </figcaption>
            ) : null}
          </figure>
        ) : (
          <div style={{ fontFamily: F_AR, fontStyle: 'italic', fontSize: 18, color: INK_3 }}>
            {g('كل يوم خطوة. واصل.', 'كل يوم خطوة. واصلي.')}
          </div>
        )}
      </div>
    </motion.div>
  )
}
