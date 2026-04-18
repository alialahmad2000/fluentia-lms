import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, ArrowLeft } from 'lucide-react'
import { CommandCard } from '@/design-system/trainer'

function TeamBar({ team, isLeading }) {
  return (
    <div className={`tr-comp-mini__team ${isLeading ? 'tr-comp-mini__team--leader' : ''}`}>
      <span className="tr-comp-mini__emoji">{team.emoji}</span>
      <div className="tr-comp-mini__team-info">
        <span className="tr-comp-mini__team-name">{team.name}</span>
        <span className="tr-comp-mini__vp">{(team.victory_points || 0).toLocaleString('ar')} VP</span>
      </div>
      {isLeading && <span className="tr-comp-mini__crown" aria-label="القائد">👑</span>}
    </div>
  )
}

export default function CompetitionMini({ competition }) {
  const daysRemaining = useMemo(() => {
    if (!competition?.end_at) return null
    return Math.ceil((new Date(competition.end_at) - Date.now()) / 86400000)
  }, [competition])

  if (!competition || competition.status !== 'active') {
    return (
      <CommandCard className="tr-comp-mini tr-comp-mini--empty">
        <Trophy size={18} className="tr-comp-mini__empty-icon" aria-hidden="true" />
        <p className="tr-comp-mini__empty-text">لا توجد مسابقة نشطة</p>
        <Link to="/trainer/competition" className="tr-comp-mini__link">إعداد مسابقة ←</Link>
      </CommandCard>
    )
  }

  const leaderIsA = competition.leader === 'A'

  return (
    <CommandCard className="tr-comp-mini">
      <div className="tr-comp-mini__header">
        <Trophy size={14} className="tr-comp-mini__trophy" aria-hidden="true" />
        <span className="tr-comp-mini__title">{competition.title_ar}</span>
        {daysRemaining !== null && (
          <span className="tr-comp-mini__days">
            {daysRemaining} {daysRemaining === 1 ? 'يوم' : 'أيام'}
          </span>
        )}
      </div>

      <div className="tr-comp-mini__teams">
        <TeamBar team={competition.team_a} isLeading={leaderIsA} />
        <div className="tr-comp-mini__vs">VS</div>
        <TeamBar team={competition.team_b} isLeading={!leaderIsA} />
      </div>

      <div className="tr-comp-mini__gap">
        الفارق: {(competition.gap_vp || 0).toLocaleString('ar')} VP
      </div>

      <Link to="/trainer/competition" className="tr-comp-mini__link">
        قيادة المسابقة
        <ArrowLeft size={12} aria-hidden="true" />
      </Link>
    </CommandCard>
  )
}
