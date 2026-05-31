import { useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Flame,
  Zap,
  Target,
  Video,
  Layers,
  Sparkles,
  Play,
  Trophy,
  Users,
  Quote,
} from 'lucide-react'
import DailyLetterCard from '../../../components/dashboard/DailyLetterCard'

/* ------------------------------------------------------------------ *
 * Fluentia LMS — Student Dashboard, VARIANT "CINEMATIC"
 * Apple TV+ / Apple Music opening-sequence energy. The dashboard
 * breathes — deep negative space, ambient drifting gradient, dark
 * glass cards floating in vacuum.
 *
 * Pure VIEW component. Receives { data, isLoading, error, profile }.
 * NEVER fetches. Every widget has an empty state. RTL-aware.
 * ------------------------------------------------------------------ */

/* ---- design tokens (consume only, never invent) ---- */
const BG_BASE = 'var(--ds-bg-base, #0a0512)'
const GOLD = 'var(--ds-accent-primary, #e9b949)'
const INK = 'var(--ds-text-primary, #f8fafc)'
const INK_2 = 'var(--ds-text-secondary, #94a3b8)'
const INK_3 = 'var(--ds-text-tertiary, #64748b)'

/* ---- fonts (already loaded; use via inline fontFamily) ---- */
const F_BODY = "'Readex Pro', sans-serif"
const F_NUM = "'Space Grotesk', sans-serif"
const F_AR = "'Tajawal', sans-serif"

/* The Apple easing curve — every transition rides this. */
const APPLE = [0.16, 1, 0.3, 1]

/* ---- glass card style factory (mobile intensifies blur/shadow) ---- */
function glassStyle({ mobile = false } = {}) {
  return {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    backdropFilter: mobile
      ? 'blur(28px) saturate(160%)'
      : 'blur(20px) saturate(140%)',
    WebkitBackdropFilter: mobile
      ? 'blur(28px) saturate(160%)'
      : 'blur(20px) saturate(140%)',
    boxShadow: mobile
      ? '0 40px 80px -20px rgba(0,0,0,0.7)'
      : '0 32px 64px -24px rgba(0,0,0,0.6)',
    borderRadius: 20,
  }
}

/* ------------------------------------------------------------------ *
 * Time / format helpers (all in-file, no deps)
 * ------------------------------------------------------------------ */
function timeAgo(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `قبل ${mins} د`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `قبل ${hrs} س`
  const days = Math.round(hrs / 24)
  return `قبل ${days} ي`
}

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

/* duration_s (e.g. 42) -> "0:42" */
function fmtDuration(s) {
  const total = Math.max(0, Math.round(Number(s) || 0))
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

/* Build a one-line activity summary from a feed entry. */
function activitySummary(a) {
  switch (a?.type) {
    case 'streak':
      return 'مدّ سلسلته'
    case 'achievement':
      return 'حصل على إنجاز'
    case 'level_up':
      return 'ارتقى مستوى'
    case 'unit':
    case 'lesson':
      return 'أنهى درساً'
    case 'xp':
      return `كسب ${Number(a?.xp) || 0} نقطة`
    default:
      return 'تقدّم خطوة'
  }
}

/* ------------------------------------------------------------------ *
 * Skeleton (reserves layout to keep CLS ≤ 0.05)
 * ------------------------------------------------------------------ */
function Bar({ w = '100%', h = 16, mt = 0, radius = 8, mx }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        marginTop: mt,
        marginInline: mx,
        borderRadius: radius,
        background: 'rgba(255,255,255,0.05)',
      }}
    />
  )
}

function CinematicSkeleton({ shell }) {
  return (
    <div style={shell.outer}>
      <div style={shell.inner}>
        {/* Hero block */}
        <div
          style={{
            ...glassStyle(),
            maxWidth: 720,
            margin: '0 auto',
            padding: 'clamp(20px, 5vw, 48px)',
          }}
        >
          <Bar w="60%" h={36} mx="auto" radius={10} />
          <Bar w="80%" h={16} mt={18} mx="auto" />
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              marginTop: 28,
              flexWrap: 'wrap',
            }}
          >
            <Bar w={110} h={44} radius={999} />
            <Bar w={110} h={44} radius={999} />
            <Bar w={110} h={44} radius={999} />
          </div>
          <Bar w={180} h={48} mt={28} mx="auto" radius={999} />
        </div>

        {/* 3-up */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: 20,
            marginTop: 28,
          }}
        >
          <Bar h={150} radius={20} />
          <Bar h={150} radius={20} />
          <Bar h={150} radius={20} />
        </div>

        {/* wides */}
        <Bar h={150} mt={28} radius={20} />
        <Bar h={200} mt={28} radius={20} />
        <Bar h={170} mt={28} radius={20} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Small presentational primitives
 * ------------------------------------------------------------------ */
function SectionLabel({ children }) {
  return (
    <div
      dir="ltr"
      style={{
        fontFamily: F_NUM,
        fontSize: 12,
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        color: GOLD,
        opacity: 0.85,
      }}
    >
      {children}
    </div>
  )
}

function StatChip({ icon, label }) {
  return (
    <div
      dir="rtl"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 16px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        whiteSpace: 'nowrap',
        flex: '0 0 auto',
      }}
    >
      {icon}
      <span
        style={{
          fontFamily: F_NUM,
          fontSize: 14,
          fontWeight: 500,
          color: INK,
          letterSpacing: '0.3px',
        }}
      >
        {label}
      </span>
    </div>
  )
}

/* A floating glass card with the hover "rise" interaction. */
function GlassCard({ children, mobile, hover, style, ...rest }) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: '0 44px 88px -24px rgba(0,0,0,0.75)' } : undefined}
      transition={{ duration: 0.4, ease: APPLE }}
      style={{
        ...glassStyle({ mobile }),
        padding: mobile ? 20 : 28,
        ...style,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ *
 * Main component
 * ------------------------------------------------------------------ */
export default function CinematicDashboard({ data, isLoading, error, profile }) {
  const prefersReduced = useReducedMotion()
  const audioRef = useRef(null)
  const [audioPlaying, setAudioPlaying] = useState(false)

  /* --- ALL hooks before any conditional return --- */

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 640px)').matches
  }, [])

  // Orchestrated motion variants (gated on reduced-motion).
  const motionConfig = useMemo(() => {
    if (prefersReduced) {
      return {
        hero: { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4 } } },
        container: {
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.05 } },
        },
        item: { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4 } } },
      }
    }
    return {
      hero: {
        hidden: { opacity: 0, scale: 0.96 },
        show: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: APPLE } },
      },
      container: {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
      },
      item: {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: APPLE } },
      },
    }
  }, [prefersReduced])

  const weekSeries = useMemo(() => {
    const s = data?.xp_week_series
    return Array.isArray(s) ? s : []
  }, [data?.xp_week_series])

  const weekMax = useMemo(() => {
    if (weekSeries.length === 0) return 0
    return Math.max(1, ...weekSeries.map((d) => Number(d?.xp) || 0))
  }, [weekSeries])

  // Faux-waveform bar heights — deterministic from highlight id so it's stable.
  const waveBars = useMemo(() => {
    const seed = String(data?.voice_highlight?.id ?? 'fluentia')
    const out = []
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997
    for (let i = 0; i < 40; i++) {
      h = (h * 1103515245 + 12345) % 2147483648
      out.push(28 + (h % 72)) // 28%..100%
    }
    return out
  }, [data?.voice_highlight?.id])

  /* --- shared shell styling (used by skeleton + main) --- */
  const shell = {
    outer: {
      position: 'relative',
      minHeight: '100vh',
      width: '100%',
      background: BG_BASE,
      color: INK,
      overflow: 'hidden',
      padding: 'clamp(40px, 8vh, 96px) clamp(16px, 4vw, 40px) 120px',
    },
    inner: {
      position: 'relative',
      zIndex: 1,
      maxWidth: '72rem',
      margin: '0 auto',
      width: '100%',
    },
  }

  /* ambient drifting gradient + vignette layer (GPU transform/opacity only) */
  const Ambient = (
    <>
      <motion.div
        aria-hidden
        initial={false}
        animate={prefersReduced ? undefined : { x: ['0%', '4%', '-3%', '0%'], y: ['0%', '-3%', '3%', '0%'] }}
        transition={
          prefersReduced
            ? undefined
            : { duration: 60, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop' }
        }
        style={{
          position: 'absolute',
          inset: '-15%',
          zIndex: 0,
          pointerEvents: 'none',
          background: `radial-gradient(60% 60% at 30% 25%, rgba(74,20,90,0.55), transparent 70%), radial-gradient(55% 55% at 75% 70%, rgba(40,10,55,0.5), transparent 70%)`,
          willChange: 'transform',
        }}
      />
      {/* corner vignette */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(120% 100% at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </>
  )

  /* --- loading: calm skeleton when no data yet --- */
  if (isLoading && !data) {
    return (
      <div style={shell.outer}>
        {Ambient}
        <CinematicSkeleton shell={shell} />
      </div>
    )
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
  const achievement = d.achievement || null
  const voice = d.voice_highlight || null
  const activity = Array.isArray(d.activity) ? d.activity : []
  const motivation = d.motivation || {}

  const name = identity.name_ar || profile?.name_ar || profile?.full_name || 'الطالب'
  const greeting = identity.greeting || null

  const streakDays = Number(streak.current) || 0
  const xpToday = Number(xp.today) || 0
  const levelName = level.current || '—'
  const levelPct = Number(level.percent) || 0

  // Hero subtitle adapts to streak / activity state.
  const heroSubtitle =
    streakDays > 0
      ? activity.length > 0
        ? `اليوم ${streakDays} من سلسلتك. الصف يتدرّب الآن.`
        : `اليوم ${streakDays} من سلسلتك. تابع الإيقاع.`
      : activity.length > 0
        ? 'يوم جديد بصفحة بيضاء. الصف بدأ بالفعل.'
        : 'يوم جديد بصفحة بيضاء. افتحها الآن.'

  const continueHref = '/student/curriculum'

  const playVoice = () => {
    const el = audioRef.current
    if (!el) return
    try {
      const p = el.play()
      if (p && typeof p.then === 'function') {
        p.then(() => setAudioPlaying(true)).catch(() => setAudioPlaying(false))
      } else {
        setAudioPlaying(true)
      }
    } catch {
      setAudioPlaying(false)
    }
  }

  const Item = (props) => <motion.div variants={motionConfig.item} {...props} />

  return (
    <div style={shell.outer}>
      {Ambient}

      <div style={shell.inner}>
        {/* ============================================================ *
         * 0. THE MORNING LETTER (gender-aware, per-trainer signature)
         * ============================================================ */}
        <DailyLetterCard data={d} profile={profile} isMobile={isMobile} />

        {/* ============================================================ *
         * 1. HERO
         * ============================================================ */}
        <motion.div
          variants={motionConfig.hero}
          initial="hidden"
          animate="show"
          style={{ maxWidth: 720, margin: '0 auto' }}
        >
          <GlassCard
            mobile={isMobile}
            hover={false}
            style={{
              padding: 'clamp(24px, 5vw, 48px)',
              textAlign: 'center',
            }}
          >
            {greeting ? (
              <div
                dir="rtl"
                style={{
                  fontFamily: F_AR,
                  fontSize: 15,
                  color: INK_3,
                  marginBottom: 10,
                }}
              >
                {greeting}
              </div>
            ) : null}

            <h1
              dir="rtl"
              style={{
                margin: 0,
                fontFamily: F_AR,
                fontWeight: 300,
                fontSize: 'clamp(28px, 6vw, 36px)',
                lineHeight: 1.25,
                color: INK,
              }}
            >
              <span style={{ fontFamily: F_BODY, fontWeight: 300 }}>أهلاً بعودتك،</span>{' '}
              <span style={{ fontWeight: 500 }}>{name}</span>
            </h1>

            <p
              dir="rtl"
              style={{
                margin: '14px 0 0',
                fontFamily: F_AR,
                fontSize: 'clamp(14px, 3vw, 16px)',
                lineHeight: 1.7,
                color: INK_2,
              }}
            >
              {heroSubtitle}
            </p>

            {/* stat chips */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 12,
                marginTop: 26,
                flexWrap: isMobile ? 'nowrap' : 'wrap',
                overflowX: isMobile ? 'auto' : 'visible',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: isMobile ? 4 : 0,
                scrollbarWidth: 'none',
              }}
            >
              <StatChip
                icon={<Flame size={16} color={GOLD} strokeWidth={1.9} />}
                label={`${streakDays} يوم`}
              />
              <StatChip
                icon={<Zap size={16} color={GOLD} strokeWidth={1.9} />}
                label={`${xpToday} XP`}
              />
              <StatChip
                icon={<Target size={16} color={GOLD} strokeWidth={1.9} />}
                label={`${levelName} ${levelPct}%`}
              />
            </div>

            {/* primary CTA */}
            <motion.a
              href={continueHref}
              whileHover={prefersReduced ? undefined : { scale: 1.03 }}
              whileTap={prefersReduced ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.3, ease: APPLE }}
              dir="rtl"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 28,
                padding: '14px 32px',
                borderRadius: 999,
                background: GOLD,
                color: '#1a1206',
                fontFamily: F_AR,
                fontWeight: 700,
                fontSize: 16,
                textDecoration: 'none',
                boxShadow: `0 16px 32px -12px ${GOLD}`,
              }}
            >
              <Play size={18} strokeWidth={2.4} fill="#1a1206" />
              متابعة
            </motion.a>
          </GlassCard>
        </motion.div>

        {/* ============================================================ *
         * 2. THREE-UP: Next Class · Daily Challenge · Anki Due
         * ============================================================ */}
        <motion.div
          variants={motionConfig.container}
          initial="hidden"
          animate="show"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: 20,
            marginTop: 28,
          }}
        >
          {/* Next Class */}
          <Item>
            <GlassCard mobile={isMobile} hover={!prefersReduced} style={{ height: '100%' }}>
              <SectionLabel>NEXT CLASS</SectionLabel>
              {nextClass ? (
                <div style={{ marginTop: 14 }} dir="rtl">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontFamily: F_AR,
                      fontSize: 16,
                      color: INK,
                    }}
                  >
                    <Video size={18} color={GOLD} strokeWidth={1.9} />
                    {nextClass.trainer_name || 'حصتك القادمة'}
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      fontFamily: F_NUM,
                      fontSize: 22,
                      color: INK,
                      letterSpacing: '-0.5px',
                    }}
                    dir="ltr"
                  >
                    {riyadhTime(nextClass.starts_at) || '—'}
                  </div>
                  <div style={{ marginTop: 4, fontFamily: F_AR, fontSize: 13, color: INK_3 }}>
                    {countdown(nextClass.starts_at)}
                  </div>
                  {nextClass.meet_url ? (
                    <a
                      href={nextClass.meet_url}
                      dir="rtl"
                      style={{
                        display: 'inline-block',
                        marginTop: 14,
                        fontFamily: F_AR,
                        fontSize: 14,
                        fontWeight: 600,
                        color: GOLD,
                        textDecoration: 'none',
                      }}
                    >
                      انضم للحصة →
                    </a>
                  ) : null}
                </div>
              ) : (
                <p dir="rtl" style={emptyTextStyle}>
                  لا توجد حصة قادمة بعد.
                </p>
              )}
            </GlassCard>
          </Item>

          {/* Daily Challenge */}
          <Item>
            <GlassCard mobile={isMobile} hover={!prefersReduced} style={{ height: '100%' }}>
              <SectionLabel>DAILY CHALLENGE</SectionLabel>
              {challenge ? (
                <div style={{ marginTop: 14 }} dir="rtl">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontFamily: F_AR,
                      fontSize: 16,
                      color: INK,
                      lineHeight: 1.5,
                    }}
                  >
                    <Sparkles size={18} color={GOLD} strokeWidth={1.9} />
                    {challenge.title_ar || 'تحدي اليوم'}
                  </div>
                  <div
                    dir="ltr"
                    style={{
                      marginTop: 10,
                      fontFamily: F_NUM,
                      fontSize: 14,
                      color: INK_2,
                      textAlign: 'right',
                    }}
                  >
                    {challenge.type ? `${challenge.type} · ` : ''}+{Number(challenge.xp) || 0} XP
                  </div>
                  <a
                    href={`/student/challenges${challenge.id ? `/${challenge.id}` : ''}`}
                    dir="rtl"
                    style={{
                      display: 'inline-block',
                      marginTop: 14,
                      fontFamily: F_AR,
                      fontSize: 14,
                      fontWeight: 600,
                      color: GOLD,
                      textDecoration: 'none',
                    }}
                  >
                    ابدأ →
                  </a>
                </div>
              ) : (
                <p dir="rtl" style={emptyTextStyle}>
                  لا يوجد تحدٍّ اليوم. عُد غداً.
                </p>
              )}
            </GlassCard>
          </Item>

          {/* Anki Due */}
          <Item>
            <GlassCard mobile={isMobile} hover={!prefersReduced} style={{ height: '100%' }}>
              <SectionLabel>ANKI DUE</SectionLabel>
              {ankiDue > 0 ? (
                <div style={{ marginTop: 14 }} dir="rtl">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 8,
                    }}
                    dir="ltr"
                  >
                    <Layers size={20} color={GOLD} strokeWidth={1.9} style={{ alignSelf: 'center' }} />
                    <span
                      style={{
                        fontFamily: F_NUM,
                        fontSize: 40,
                        fontWeight: 500,
                        color: INK,
                        lineHeight: 1,
                        letterSpacing: '-1px',
                      }}
                    >
                      {ankiDue}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, fontFamily: F_AR, fontSize: 14, color: INK_2 }}>
                    كلمة جاهزة للمراجعة
                  </div>
                  <a
                    href="/student/anki"
                    dir="rtl"
                    style={{
                      display: 'inline-block',
                      marginTop: 14,
                      fontFamily: F_AR,
                      fontSize: 14,
                      fontWeight: 600,
                      color: GOLD,
                      textDecoration: 'none',
                    }}
                  >
                    مراجعة →
                  </a>
                </div>
              ) : (
                <p dir="rtl" style={emptyTextStyle}>
                  لا كلمات مستحقّة. مراجعتك متّسقة.
                </p>
              )}
            </GlassCard>
          </Item>
        </motion.div>

        {/* ============================================================ *
         * 3. WIDE: Voice Highlight
         * ============================================================ */}
        <motion.div
          variants={motionConfig.item}
          initial="hidden"
          animate="show"
          style={{ marginTop: 28 }}
        >
          <GlassCard mobile={isMobile} hover={!prefersReduced}>
            <SectionLabel>VOICE HIGHLIGHT</SectionLabel>
            {voice ? (
              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 18,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* play button */}
                  <motion.button
                    type="button"
                    onClick={playVoice}
                    whileHover={prefersReduced ? undefined : { scale: 1.06 }}
                    whileTap={prefersReduced ? undefined : { scale: 0.94 }}
                    transition={{ duration: 0.3, ease: APPLE }}
                    aria-label="تشغيل المقطع الصوتي"
                    style={{
                      flex: '0 0 auto',
                      width: 56,
                      height: 56,
                      borderRadius: 999,
                      border: 'none',
                      cursor: 'pointer',
                      background: GOLD,
                      color: '#1a1206',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 12px 28px -10px ${GOLD}`,
                    }}
                  >
                    <Play size={22} strokeWidth={2.4} fill="#1a1206" style={{ marginInlineStart: 3 }} />
                  </motion.button>

                  {/* faux waveform */}
                  <div
                    aria-hidden
                    dir="ltr"
                    style={{
                      flex: 1,
                      minWidth: 140,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      height: 56,
                    }}
                  >
                    {waveBars.map((bh, i) => (
                      <motion.div
                        key={i}
                        initial={prefersReduced ? false : { scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={
                          prefersReduced
                            ? undefined
                            : { duration: 1.2, delay: i * 0.012, ease: APPLE }
                        }
                        style={{
                          flex: 1,
                          height: `${bh}%`,
                          minWidth: 2,
                          borderRadius: 2,
                          transformOrigin: 'bottom',
                          background: audioPlaying ? GOLD : `${INK_2}66`,
                          transition: `background 0.4s cubic-bezier(0.16,1,0.3,1)`,
                        }}
                      />
                    ))}
                  </div>

                  {/* duration */}
                  <div
                    dir="ltr"
                    style={{
                      flex: '0 0 auto',
                      fontFamily: F_NUM,
                      fontSize: 16,
                      color: INK_2,
                      letterSpacing: '0.5px',
                    }}
                  >
                    {fmtDuration(voice.duration_s)}
                  </div>
                </div>

                {voice.trainer_note ? (
                  <p
                    dir="rtl"
                    style={{
                      margin: '16px 0 0',
                      fontFamily: F_AR,
                      fontStyle: 'italic',
                      fontSize: 14,
                      lineHeight: 1.7,
                      color: INK_2,
                      borderInlineStart: `2px solid ${GOLD}`,
                      paddingInlineStart: 14,
                    }}
                  >
                    {voice.trainer_note}
                  </p>
                ) : null}

                {/* hidden audio element driven by the play button */}
                <audio
                  ref={audioRef}
                  src={voice.url || undefined}
                  preload="none"
                  onEnded={() => setAudioPlaying(false)}
                  onPause={() => setAudioPlaying(false)}
                  onPlay={() => setAudioPlaying(true)}
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <p dir="rtl" style={emptyTextStyle}>
                لا يوجد مقطع صوتي مميّز بعد.
              </p>
            )}
          </GlassCard>
        </motion.div>

        {/* ============================================================ *
         * 4. WIDE: This week in motion (xp_week_series)
         * ============================================================ */}
        <motion.div
          variants={motionConfig.item}
          initial="hidden"
          animate="show"
          style={{ marginTop: 28 }}
        >
          <GlassCard mobile={isMobile} hover={!prefersReduced}>
            <SectionLabel>THIS WEEK IN MOTION</SectionLabel>
            {weekSeries.length > 0 ? (
              <WeekChart
                series={weekSeries}
                max={weekMax}
                prefersReduced={prefersReduced}
              />
            ) : (
              <p dir="rtl" style={emptyTextStyle}>
                سيظهر هنا أداؤك الأسبوعي بمجرد أن تبدأ.
              </p>
            )}
          </GlassCard>
        </motion.div>

        {/* ============================================================ *
         * 5. The Class (activity) — with optional achievement orbit
         * ============================================================ */}
        <motion.div
          variants={motionConfig.item}
          initial="hidden"
          animate="show"
          style={{ marginTop: 28 }}
        >
          <GlassCard mobile={isMobile} hover={!prefersReduced}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <SectionLabel>THE CLASS</SectionLabel>
              {achievement ? (
                <div
                  dir="rtl"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: F_AR,
                    fontSize: 12,
                    color: GOLD,
                  }}
                >
                  <Trophy size={14} strokeWidth={1.9} />
                  {achievement.title_ar || 'إنجاز جديد'}
                </div>
              ) : null}
            </div>

            {activity.length > 0 ? (
              <ul
                style={{
                  listStyle: 'none',
                  margin: '16px 0 0',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {activity.slice(0, 6).map((a, i) => (
                  <li
                    key={a?.id ?? i}
                    dir="rtl"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '11px 0',
                      borderBottom:
                        i < Math.min(activity.length, 6) - 1
                          ? '1px solid rgba(255,255,255,0.05)'
                          : 'none',
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        flex: '0 0 auto',
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: GOLD,
                        boxShadow: `0 0 8px ${GOLD}`,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontFamily: F_AR,
                        fontSize: 14,
                        color: INK_2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <span style={{ color: INK }}>{a?.actor_name || 'زميل'}</span>{' '}
                      {activitySummary(a)}
                    </span>
                    <span
                      style={{
                        flex: '0 0 auto',
                        fontFamily: F_AR,
                        fontSize: 12,
                        color: INK_3,
                      }}
                    >
                      {timeAgo(a?.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div
                dir="rtl"
                style={{
                  marginTop: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Users size={18} color={INK_3} strokeWidth={1.7} />
                <p style={{ ...emptyTextStyle, margin: 0 }}>ستظهر لحظات زملائك هنا.</p>
              </div>
            )}

            {/* motivation line lives quietly at the bottom */}
            {motivation.ar || motivation.en ? (
              <div
                style={{
                  marginTop: 22,
                  paddingTop: 18,
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <Quote
                  size={18}
                  color={GOLD}
                  strokeWidth={1.5}
                  style={{ flex: '0 0 auto', marginTop: 3, opacity: 0.6, transform: 'scaleX(-1)' }}
                  aria-hidden
                />
                <div style={{ minWidth: 0 }}>
                  {motivation.ar ? (
                    <p
                      dir="rtl"
                      style={{
                        margin: 0,
                        fontFamily: F_AR,
                        fontStyle: 'italic',
                        fontSize: 15,
                        lineHeight: 1.7,
                        color: INK,
                      }}
                    >
                      {motivation.ar}
                    </p>
                  ) : null}
                  {motivation.en ? (
                    <p
                      dir="ltr"
                      style={{
                        margin: motivation.ar ? '6px 0 0' : 0,
                        fontFamily: F_BODY,
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: INK_3,
                      }}
                    >
                      {motivation.en}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  )
}

/* shared empty-state text style */
const emptyTextStyle = {
  margin: '16px 0 0',
  fontFamily: F_AR,
  fontSize: 14,
  lineHeight: 1.6,
  color: INK_3,
}

/* ------------------------------------------------------------------ *
 * Week chart — plain SVG area + bars, draws left→right then fills.
 * ------------------------------------------------------------------ */
function WeekChart({ series, max, prefersReduced }) {
  const W = 100 // viewBox units (responsive via preserveAspectRatio none)
  const H = 40
  const n = series.length
  const stepX = n > 1 ? W / (n - 1) : W

  const points = series.map((dpt, i) => {
    const val = Number(dpt?.xp) || 0
    const x = n > 1 ? i * stepX : W / 2
    const y = H - (max > 0 ? (val / max) * (H - 4) : 0) - 2
    return { x, y, val, label: dpt?.day_label ?? '—' }
  })

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')

  const areaPath =
    `M ${points[0].x.toFixed(2)} ${H} ` +
    points.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
    ` L ${points[points.length - 1].x.toFixed(2)} ${H} Z`

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ position: 'relative', width: '100%', height: 160 }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          style={{ display: 'block', overflow: 'visible' }}
          aria-hidden
        >
          <defs>
            <linearGradient id="cinematic-week-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GOLD} stopOpacity="0.35" />
              <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* area fill — fades in after line draws */}
          <motion.path
            d={areaPath}
            fill="url(#cinematic-week-fill)"
            initial={prefersReduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReduced ? undefined : { duration: 0.6, delay: 1.5, ease: APPLE }}
          />

          {/* line — draws left→right */}
          <motion.path
            d={linePath}
            fill="none"
            stroke={GOLD}
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={prefersReduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={prefersReduced ? undefined : { duration: 1.5, ease: APPLE }}
          />

          {/* peak dots */}
          {points.map((p, i) => (
            <motion.circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="0.9"
              fill={GOLD}
              vectorEffect="non-scaling-stroke"
              initial={prefersReduced ? false : { opacity: 0 }}
              animate={{ opacity: p.val > 0 ? 1 : 0.25 }}
              transition={prefersReduced ? undefined : { duration: 0.4, delay: 1.5 + i * 0.04 }}
            />
          ))}
        </svg>
      </div>

      {/* day labels + values */}
      <div
        dir="ltr"
        style={{
          marginTop: 10,
          display: 'grid',
          gridTemplateColumns: `repeat(${n}, 1fr)`,
          gap: 4,
        }}
      >
        {points.map((p, i) => (
          <div key={i} style={{ textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontFamily: F_NUM, fontSize: 11, color: INK_2 }}>{p.val}</div>
            <div
              style={{
                fontFamily: F_NUM,
                fontSize: 10,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: INK_3,
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {p.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
