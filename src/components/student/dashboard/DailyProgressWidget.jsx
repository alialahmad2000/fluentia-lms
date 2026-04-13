import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, BookOpen, Brain, Activity, Flame } from 'lucide-react'
import AnimatedNumber from '../../ui/AnimatedNumber'
import { Link } from 'react-router-dom'
import { useTodaySummary } from '../../../hooks/dashboard/useTodaySummary'

/* ------------------------------------------------------------------ */
/*  Confetti burst – lightweight CSS-only, no external library         */
/* ------------------------------------------------------------------ */
const CONFETTI_EMOJIS = ['🎉', '✨', '🌟', '🎊', '💎', '⭐']

function ConfettiBurst({ onDone }) {
  const pieces = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      emoji: CONFETTI_EMOJIS[i % CONFETTI_EMOJIS.length],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.4}s`,
      duration: `${0.8 + Math.random() * 0.6}s`,
      xDrift: `${(Math.random() - 0.5) * 120}px`,
    })),
  ).current

  useEffect(() => {
    const t = setTimeout(onDone, 2000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 20 }}
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute text-lg"
          style={{
            left: p.left,
            top: '-8px',
            animation: `confettiFall ${p.duration} ${p.delay} ease-out forwards`,
            '--x-drift': p.xDrift,
          }}
        >
          {p.emoji}
        </span>
      ))}

      <style>{`
        @keyframes confettiFall {
          0%   { opacity: 1; transform: translateY(0) translateX(0) rotate(0deg) scale(1); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(320px) translateX(var(--x-drift)) rotate(360deg) scale(0.4); }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat chip                                                          */
/* ------------------------------------------------------------------ */
const chipVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.05, duration: 0.3 },
  }),
}

function StatChip({ icon: Icon, value, label, accentColor, index }) {
  return (
    <motion.div
      custom={index}
      variants={chipVariants}
      initial="hidden"
      animate="visible"
      className={`flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 transition-colors hover:bg-white/10 ${
        value === 0 ? 'opacity-50' : ''
      }`}
    >
      <Icon size={16} style={{ color: accentColor }} />
      <span
        className="text-sm font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        <AnimatedNumber value={value} />
      </span>
      <span
        className="text-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  XP Orb                                                             */
/* ------------------------------------------------------------------ */
function XpOrb({ xp }) {
  return (
    <div
      className="flex flex-shrink-0 flex-col items-center justify-center rounded-full"
      style={{
        width: 80,
        height: 80,
        background: 'linear-gradient(135deg, var(--accent-sky), #6366f1)',
        boxShadow: '0 0 24px var(--accent-sky-glow)',
      }}
    >
      <span
        className="text-xl font-bold leading-none"
        style={{ color: '#fff' }}
      >
        <AnimatedNumber value={xp} />
      </span>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-white/70">
        XP
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */
function Skeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fl-card-static relative overflow-hidden p-6"
    >
      <div className="mb-4 h-4 w-44 animate-pulse rounded bg-white/10" />

      <div className="flex flex-col items-center gap-5 md:flex-row">
        {/* Orb skeleton */}
        <div className="h-20 w-20 flex-shrink-0 animate-pulse rounded-full bg-white/10" />

        <div className="flex-1 space-y-3">
          {/* Progress bar skeleton */}
          <div className="h-3 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-3 w-32 animate-pulse rounded bg-white/10" />

          {/* Chips skeleton */}
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-9 w-24 animate-pulse rounded-xl bg-white/10"
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main widget                                                        */
/* ------------------------------------------------------------------ */
export default function DailyProgressWidget({ studentId }) {
  const { data, isPending, error } = useTodaySummary(studentId)
  const [showConfetti, setShowConfetti] = useState(false)

  const todayKey = new Date().toISOString().slice(0, 10)
  const celebrationKey = `dash_daily_goal_celebrated_${todayKey}`

  useEffect(() => {
    if (!data) return
    if (data.daily_goal_pct >= 100) {
      if (!localStorage.getItem(celebrationKey)) {
        localStorage.setItem(celebrationKey, '1')
        setShowConfetti(true)
      }
    }
  }, [data, celebrationKey])

  /* ---------- date header ---------- */
  const dateLabel = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  /* ---------- loading ---------- */
  if (isPending) return <Skeleton />

  /* ---------- error ---------- */
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="fl-card-static p-6 text-center"
      >
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          حدث خطأ في تحميل البيانات
        </p>
      </motion.div>
    )
  }

  const {
    xp_today = 0,
    activities_count = 0,
    units_touched_count = 0,
    units_touched_names = [],
    vocab_added_today = 0,
    streak_days = 0,
    daily_goal_xp = 100,
    daily_goal_pct = 0,
  } = data || {}

  const goalMet = daily_goal_pct >= 100
  const isEmpty = xp_today === 0 && activities_count === 0
  const progressPct = Math.min(daily_goal_pct, 100)

  /* ---------- empty state ---------- */
  if (isEmpty) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="fl-card-static relative overflow-hidden p-6"
        dir="rtl"
      >
        <p
          className="mb-1 text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          📅 اليوم — {dateLabel}
        </p>

        <div className="flex flex-col items-center py-8 text-center">
          <span className="mb-3 text-4xl">🌅</span>
          <p
            className="mb-4 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            يوم جديد! ابدأ بأول نشاط واحصل على XP
          </p>
          <Link to="/student/curriculum" className="fl-btn-primary">
            ابدأ الآن
          </Link>
        </div>
      </motion.div>
    )
  }

  /* ---------- active state ---------- */
  const stats = [
    { icon: BookOpen, value: units_touched_count, label: 'وحدة', color: 'var(--accent-sky)' },
    { icon: Brain, value: vocab_added_today, label: 'كلمة', color: 'var(--accent-violet)' },
    { icon: Activity, value: activities_count, label: 'نشاط', color: 'var(--accent-emerald)' },
    { icon: Flame, value: streak_days, label: 'يوم', color: 'var(--accent-gold)' },
  ]

  const touchedLabel = (() => {
    if (!units_touched_names || units_touched_names.length === 0) return null
    const first = units_touched_names[0]
    const rest = units_touched_names.length - 1
    return rest > 0
      ? `📍 شغّلت اليوم على: ${first} (+${rest} أخرى)`
      : `📍 شغّلت اليوم على: ${first}`
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fl-card-static relative overflow-hidden p-6"
      dir="rtl"
    >
      {/* Confetti */}
      {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}

      {/* Goal-met gradient overlay */}
      {goalMet && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, transparent 60%)',
            zIndex: 0,
          }}
        />
      )}

      <div className="relative z-10">
        {/* Date header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p
            className="text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            📅 اليوم — {dateLabel}
          </p>

          {goalMet && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: 'var(--accent-emerald-glow)',
                color: 'var(--accent-emerald)',
              }}
            >
              ✅ هدفك اليومي مكتمل! 🎉
            </motion.span>
          )}
        </div>

        {/* Main content row */}
        <div className="flex flex-col items-center gap-5 md:flex-row">
          {/* XP Orb */}
          <XpOrb xp={xp_today} />

          {/* Center section */}
          <div className="flex-1 space-y-3">
            {/* Progress bar */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span style={{ color: 'var(--text-secondary)' }}>
                  <AnimatedNumber value={xp_today} /> / {daily_goal_xp} XP
                </span>
                <span
                  className="font-semibold"
                  style={{
                    color: goalMet ? 'var(--accent-emerald)' : 'var(--accent-sky)',
                  }}
                >
                  {Math.round(daily_goal_pct)}%
                </span>
              </div>

              <div className="fl-progress-track" style={{ height: 12, borderRadius: 999 }}>
                <motion.div
                  className="fl-progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    background: goalMet
                      ? 'linear-gradient(90deg, var(--accent-emerald), #34d399)'
                      : 'linear-gradient(90deg, var(--accent-sky), #6366f1)',
                  }}
                />
              </div>
            </div>

            {/* Stat chips */}
            <div className="flex flex-wrap gap-2">
              {stats.map((s, i) => (
                <StatChip
                  key={s.label}
                  icon={s.icon}
                  value={s.value}
                  label={s.label}
                  accentColor={s.color}
                  index={i}
                />
              ))}
            </div>

            {/* Units touched line */}
            {touchedLabel && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {touchedLabel}
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
