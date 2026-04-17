import { Target } from 'lucide-react'
import { useActiveCompetition, useCompetitionContext } from '../../hooks/useCompetition'

const TIERS = [
  { pct: 50, label: '50%', xp: '+150 XP', color: '#38bdf8' },
  { pct: 70, label: '70%', xp: '+400 XP', color: '#818cf8' },
  { pct: 90, label: '90%', xp: '+800 XP', color: '#f59e0b' },
  { pct: 100, label: '100%', xp: '+1,200 XP', color: '#f5c842' },
]

function daysRemainingInWeek() {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun
  return 7 - dayOfWeek
}

export default function WeeklyGoalWidget() {
  const { data: comp } = useActiveCompetition()
  const { data: ctx } = useCompetitionContext()

  if (!comp || comp.status !== 'active') return null

  const goalPct = Math.min(100, Math.round(ctx?.weekly_goal_pct ?? 0))
  const myTeam = ctx?.in_competition
    ? (ctx.team === 'A' ? comp.team_a : comp.team_b)
    : null
  const color = myTeam?.color ?? '#34d399'
  const daysLeft = daysRemainingInWeek()

  const nextTier = TIERS.find((t) => t.pct > goalPct)
  const reachedTiers = TIERS.filter((t) => t.pct <= goalPct)

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        fontFamily: 'Tajawal, sans-serif',
      }}
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target size={18} style={{ color }} />
          <span className="font-bold text-white text-sm">الهدف الأسبوعي</span>
        </div>
        <span className="text-xs text-slate-400">{daysLeft} يوم متبقي</span>
      </div>

      <div className="flex items-end gap-2 mb-3">
        <span className="text-4xl font-black tabular-nums" style={{ color }}>{goalPct}%</span>
        {nextTier && (
          <span className="text-slate-400 text-sm mb-1">من {nextTier.pct}% للـ {nextTier.xp}</span>
        )}
      </div>

      {/* Main progress bar */}
      <div className="h-3 rounded-full mb-3 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${goalPct}%`, background: color }}
        />
        {/* Tier markers */}
        {TIERS.map((t) => (
          <div
            key={t.pct}
            style={{
              position: 'absolute', top: 0, bottom: 0, left: `${t.pct}%`,
              width: 1, background: 'rgba(0,0,0,0.5)',
            }}
          />
        ))}
      </div>

      {/* Tier labels */}
      <div className="grid grid-cols-4 gap-1">
        {TIERS.map((t) => {
          const reached = goalPct >= t.pct
          return (
            <div
              key={t.pct}
              className="text-center rounded-lg py-1.5 px-1"
              style={{
                background: reached ? `${t.color}18` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${reached ? t.color + '35' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <div className="text-xs font-bold" style={{ color: reached ? t.color : 'rgba(255,255,255,0.25)' }}>{t.label}</div>
              <div className="text-[9px] leading-tight" style={{ color: reached ? t.color + 'cc' : 'rgba(255,255,255,0.2)' }}>{t.xp}</div>
            </div>
          )
        })}
      </div>

      {reachedTiers.length > 0 && (
        <div className="mt-2 text-xs text-center" style={{ color: reachedTiers.at(-1).color }}>
          ✓ وصلت مستوى {reachedTiers.at(-1).label} — استمر!
        </div>
      )}
    </div>
  )
}
