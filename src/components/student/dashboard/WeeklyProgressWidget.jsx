import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
} from 'lucide-react'
import AnimatedNumber from '../../ui/AnimatedNumber'
import { useWeekSummary } from '../../../hooks/dashboard/useWeekSummary'

/* ── skill type config ── */
const SKILL_MAP = {
  reading:    { label: 'قراءة',  color: 'var(--accent-sky)',     glow: 'var(--accent-sky-glow)' },
  grammar:    { label: 'قواعد',  color: 'var(--accent-violet)',  glow: 'var(--accent-violet-glow)' },
  vocabulary: { label: 'مفردات', color: 'var(--accent-emerald)', glow: 'var(--accent-emerald-glow)' },
  listening:  { label: 'استماع', color: 'var(--accent-gold)',    glow: 'var(--accent-gold-glow)' },
  speaking:   { label: 'تحدث',  color: 'var(--accent-rose)',    glow: 'var(--accent-rose-glow)' },
  writing:    { label: 'كتابة', color: 'var(--accent-sky)',     glow: 'var(--accent-sky-glow)' },
}

const SKILL_ORDER = ['reading', 'grammar', 'vocabulary', 'listening', 'speaking', 'writing']

/* ── skeleton loader ── */
function SkeletonRow({ width = '100%', height = 12 }) {
  return (
    <div
      className="animate-pulse rounded-md"
      style={{
        width,
        height,
        background:
          'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  )
}

function LoadingSkeleton() {
  return (
    <div className="fl-card-static p-5 space-y-5">
      {/* header */}
      <div className="flex items-center justify-between">
        <SkeletonRow width="140px" height={20} />
        <SkeletonRow width="180px" height={24} />
      </div>
      {/* xp bar */}
      <div className="space-y-2">
        <SkeletonRow width="200px" height={14} />
        <SkeletonRow width="100%" height={12} />
      </div>
      {/* skill bars */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonRow width="52px" height={14} />
            <SkeletonRow width="100%" height={8} />
            <SkeletonRow width="24px" height={14} />
          </div>
        ))}
      </div>
      {/* units line */}
      <SkeletonRow width="60%" height={14} />
      {/* active days */}
      <div className="flex items-center gap-2">
        <SkeletonRow width="140px" height={14} />
        <div className="flex gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonRow key={i} width="10px" height={10} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── comparison badge ── */
function ComparisonBadge({ comparisonPct, xpLastWeek }) {
  if (xpLastWeek === 0) return null

  if (comparisonPct > 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
        style={{
          background: 'rgba(52, 211, 153, 0.12)',
          color: 'var(--accent-emerald)',
          border: '1px solid rgba(52, 211, 153, 0.2)',
        }}
      >
        <TrendingUp size={14} />
        <span>↗ +{comparisonPct}% من الأسبوع الماضي</span>
      </span>
    )
  }

  if (comparisonPct < 0) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
        style={{
          background: 'rgba(251, 191, 36, 0.12)',
          color: 'var(--accent-gold)',
          border: '1px solid rgba(251, 191, 36, 0.2)',
        }}
      >
        <TrendingDown size={14} />
        <span>↘ {comparisonPct}% من الأسبوع الماضي</span>
      </span>
    )
  }

  /* comparison_pct === 0 && xp_last_week > 0 */
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
      style={{
        background: 'rgba(255, 255, 255, 0.06)',
        color: 'var(--text-tertiary)',
        border: '1px solid var(--border-default)',
      }}
    >
      <Minus size={14} />
      <span>= نفس الأسبوع الماضي</span>
    </span>
  )
}

/* ── skill bar row ── */
function SkillBar({ label, color, glow, count, maxCount, index }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
  const isEmpty = count === 0

  return (
    <div className="flex items-center gap-3">
      <span
        className="text-xs font-medium shrink-0 w-[52px] text-left"
        style={{ color: isEmpty ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}
      >
        {label}
      </span>

      <div
        className="fl-progress-track flex-1"
        style={{ height: 8, borderRadius: 4 }}
      >
        <motion.div
          className="fl-progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: 0.15 + index * 0.07, ease: 'easeOut' }}
          style={{
            height: '100%',
            borderRadius: 4,
            background: color,
            boxShadow: isEmpty ? 'none' : `0 0 8px ${glow}`,
            opacity: isEmpty ? 0.2 : 1,
          }}
        />
      </div>

      <span
        className="text-xs font-semibold shrink-0 w-[24px] text-right tabular-nums"
        style={{ color: isEmpty ? 'var(--text-tertiary)' : color }}
      >
        {count}
      </span>
    </div>
  )
}

/* ── units completed line ── */
function UnitsCompletedLine({ units }) {
  if (!units || units.length === 0) return null

  const visible = units.slice(0, 3)
  const remaining = units.length - 3

  return (
    <div className="flex items-start gap-2">
      <CheckCircle2
        size={16}
        className="shrink-0 mt-0.5"
        style={{ color: 'var(--accent-emerald)' }}
      />
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        {visible.map((u) => u.theme_ar).join('، ')}
        {remaining > 0 && (
          <span
            className="inline-flex items-center justify-center text-[10px] font-bold mr-1.5 px-1.5 py-0.5 rounded-full"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-tertiary)',
            }}
          >
            +{remaining}
          </span>
        )}
      </p>
    </div>
  )
}

/* ── active-days dots ── */
function ActiveDaysDots({ activeDaysCount }) {
  const days = Array.from({ length: 7 }).map((_, i) => i < activeDaysCount)
  /* reverse so filled dots appear from the right in RTL */
  const dotsRtl = [...days].reverse()

  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        أيام نشطة: <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{activeDaysCount}</span> من ٧
      </span>
      <div className="flex gap-1.5" dir="rtl">
        {dotsRtl.map((filled, i) => (
          <span
            key={i}
            className="block rounded-full"
            style={{
              width: 10,
              height: 10,
              background: filled ? 'var(--accent-violet)' : 'rgba(255, 255, 255, 0.08)',
              boxShadow: filled ? '0 0 6px var(--accent-violet-glow)' : 'none',
              transition: 'background 0.3s, box-shadow 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  )
}

/* ── empty state ── */
function EmptyState() {
  return (
    <div className="fl-card-static p-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center text-center py-8 gap-3"
      >
        <BarChart3 size={36} style={{ color: 'var(--text-tertiary)' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          ابدأ أسبوعك بنشاط! كل نشاط يقربك من هدفك
        </p>
      </motion.div>
    </div>
  )
}

/* ── main widget ── */
export default function WeeklyProgressWidget({ studentId }) {
  const { data, isLoading } = useWeekSummary(studentId)

  if (isLoading) return <LoadingSkeleton />

  if (!data || (data.xp_week === 0 && data.active_days_count === 0)) {
    return <EmptyState />
  }

  const {
    xp_week = 0,
    xp_last_week = 0,
    comparison_pct = 0,
    weekly_goal_xp = 1,
    weekly_goal_pct = 0,
    activities_by_type = {},
    units_completed_this_week = [],
    active_days_count = 0,
  } = data

  const maxActivity = Math.max(...Object.values(activities_by_type), 1)

  return (
    <motion.div
      className="fl-card-static p-5 space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {/* ── header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3
          className="flex items-center gap-2 text-base font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          <BarChart3 size={18} style={{ color: 'var(--accent-violet)' }} />
          هذا الأسبوع
        </h3>
        <ComparisonBadge comparisonPct={comparison_pct} xpLastWeek={xp_last_week} />
      </div>

      {/* ── main XP bar ── */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <AnimatedNumber value={xp_week} className="font-bold text-lg" style={{ color: 'var(--text-primary)' }} />
          <span>/</span>
          <span>{weekly_goal_xp} XP</span>
          <span className="mr-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            (<AnimatedNumber value={weekly_goal_pct} className="font-semibold" />%)
          </span>
        </div>

        <div className="fl-progress-track" style={{ height: 12, borderRadius: 6 }}>
          <motion.div
            className="fl-progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(weekly_goal_pct, 100)}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: 6,
              background: 'linear-gradient(90deg, var(--accent-violet), var(--accent-sky))',
              boxShadow: '0 0 12px var(--accent-violet-glow)',
            }}
          />
        </div>
      </div>

      {/* ── skills breakdown ── */}
      <div className="space-y-2.5">
        {SKILL_ORDER.map((key, index) => {
          const cfg = SKILL_MAP[key]
          const count = activities_by_type[key] ?? 0
          return (
            <SkillBar
              key={key}
              label={cfg.label}
              color={cfg.color}
              glow={cfg.glow}
              count={count}
              maxCount={maxActivity}
              index={index}
            />
          )
        })}
      </div>

      {/* ── units completed ── */}
      <UnitsCompletedLine units={units_completed_this_week} />

      {/* ── active days ── */}
      <ActiveDaysDots activeDaysCount={active_days_count} />
    </motion.div>
  )
}
