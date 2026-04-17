import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveCompetition, useCompetitionContext } from '../../hooks/useCompetition'

function daysRemaining(seconds) {
  return Math.ceil(seconds / 86400)
}

export default function CompetitionBanner() {
  const navigate = useNavigate()
  const { data: comp } = useActiveCompetition()
  const { data: ctx } = useCompetitionContext()

  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // Only render for active competitions
  if (!comp || comp.status !== 'active') return null

  const days = daysRemaining(comp.seconds_remaining ?? 0)
  const myTeam = ctx?.in_competition ? (ctx.team === 'A' ? comp.team_a : comp.team_b) : null
  const oppTeam = ctx?.in_competition ? (ctx.team === 'A' ? comp.team_b : comp.team_a) : null

  const leading = myTeam && myTeam.victory_points >= (oppTeam?.victory_points ?? 0)
  const gap = myTeam && oppTeam ? Math.abs(myTeam.victory_points - oppTeam.victory_points) : null

  let statusText = ''
  if (myTeam && oppTeam) {
    if (gap === 0) statusText = 'التعادل — كل نقطة تُحسم الفارق!'
    else if (leading) statusText = `فريقك ${myTeam.emoji} متقدم بـ ${gap} نقطة نصر`
    else statusText = `متأخر بـ ${gap} — لا تستسلم!`
  } else {
    const a = comp.team_a, b = comp.team_b
    const leader = a.victory_points > b.victory_points ? a : b
    statusText = `${leader.emoji} ${leader.name} يتقدم بـ ${Math.abs(a.victory_points - b.victory_points)} VP`
  }

  const teamColor = myTeam?.color ?? '#38bdf8'

  return (
    <button
      onClick={() => navigate('/student/competition')}
      className="w-full text-right block rounded-xl overflow-hidden mb-4"
      style={{
        background: `linear-gradient(90deg, ${teamColor}22 0%, rgba(15,23,42,0.6) 60%, rgba(239,68,68,0.12) 100%)`,
        border: `1px solid ${teamColor}44`,
        cursor: 'pointer',
      }}
      dir="rtl"
    >
      {/* Desktop layout */}
      <div className="hidden sm:flex items-center justify-between px-5 py-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">⚔️</span>
          <div className="min-w-0">
            <span className="font-bold text-white text-sm">تحدي طلاقة</span>
            <span className="text-slate-400 text-sm mr-2">{days > 0 ? `${days} يوم متبقي` : 'ينتهي اليوم!'}</span>
          </div>
        </div>
        <div className="text-sm text-slate-300 flex-shrink-0">{statusText}</div>
        <div
          className="flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg"
          style={{ background: teamColor, color: '#0f172a' }}
        >
          لوحة المسابقة →
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex sm:hidden items-center justify-between px-4 py-3 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-lg flex-shrink-0">⚔️</span>
          <div className="min-w-0">
            <div className="font-bold text-white text-xs leading-tight">تحدي طلاقة</div>
            <div className="text-slate-400 text-xs">{days > 0 ? `${days} يوم` : 'ينتهي اليوم!'}</div>
          </div>
        </div>
        <div
          className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg"
          style={{ background: teamColor, color: '#0f172a' }}
        >
          ادخل →
        </div>
      </div>
    </button>
  )
}
