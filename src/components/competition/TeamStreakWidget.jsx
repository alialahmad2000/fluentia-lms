import { Flame, AlertTriangle } from 'lucide-react'
import { useActiveCompetition, useCompetitionContext } from '../../hooks/useCompetition'

const MILESTONES = [3, 5, 7, 14]

function nextMilestone(streak) {
  return MILESTONES.find((m) => m > streak) ?? MILESTONES[MILESTONES.length - 1]
}

function isAtRisk() {
  // Warn after 18:00 Riyadh time (UTC+3)
  const now = new Date()
  const riyadhHour = (now.getUTCHours() + 3) % 24
  return riyadhHour >= 18
}

export default function TeamStreakWidget() {
  const { data: comp } = useActiveCompetition()
  const { data: ctx } = useCompetitionContext()

  if (!comp || comp.status !== 'active') return null

  const streak = ctx?.streak_days ?? 0
  const myTeam = ctx?.in_competition
    ? (ctx.team === 'A' ? comp.team_a : comp.team_b)
    : null
  const color = myTeam?.color ?? '#fb923c'

  const next = nextMilestone(streak)
  const progress = Math.min(100, Math.round((streak / next) * 100))
  const atRisk = isAtRisk() && streak > 0

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: atRisk ? 'rgba(251,146,60,0.08)' : 'rgba(255,255,255,0.03)',
        border: atRisk ? '1px solid rgba(251,146,60,0.35)' : '1px solid rgba(255,255,255,0.07)',
        fontFamily: 'Tajawal, sans-serif',
      }}
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame size={18} style={{ color: atRisk ? '#fb923c' : color }} />
          <span className="font-bold text-white text-sm">سلسلة الحضور</span>
        </div>
        {atRisk && (
          <div className="flex items-center gap-1 text-xs text-orange-400">
            <AlertTriangle size={12} />
            <span>لا تنسَ النشاط اليوم!</span>
          </div>
        )}
      </div>

      <div className="flex items-end gap-2 mb-3">
        <span className="text-4xl font-black tabular-nums" style={{ color: atRisk ? '#fb923c' : color }}>{streak}</span>
        <span className="text-slate-400 text-sm mb-1">يوم متواصل</span>
      </div>

      <div className="mb-1.5">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{streak} من {next} للمكافأة التالية</span>
          <span>{next - streak} يوم باقي</span>
        </div>
        <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: atRisk ? '#fb923c' : color }}
          />
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        {MILESTONES.map((m) => (
          <div
            key={m}
            className="flex-1 text-center rounded-lg py-1"
            style={{
              background: streak >= m ? `${color}20` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${streak >= m ? color + '40' : 'rgba(255,255,255,0.06)'}`,
              fontSize: 10, fontWeight: 700,
              color: streak >= m ? color : 'rgba(255,255,255,0.25)',
            }}
          >
            {m}د
          </div>
        ))}
      </div>
    </div>
  )
}
