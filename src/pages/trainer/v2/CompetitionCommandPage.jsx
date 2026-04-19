import { useCompetitionView } from '@/hooks/trainer/useCompetitionView'
import './CompetitionCommandPage.css'

function daysRemaining(endAt) {
  if (!endAt) return null
  return Math.ceil((new Date(endAt) - Date.now()) / 86_400_000)
}

function timeAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d === 0) return 'اليوم'
  if (d === 1) return 'أمس'
  return `منذ ${d} يوم`
}

function TeamCard({ teamKey, comp, leaderboard }) {
  const isA = teamKey === 'A'
  const team = isA ? comp.team_a : comp.team_b
  const isLeader = comp.leader === teamKey

  return (
    <div className={`ccp-team-card ${isLeader ? 'ccp-team-card--leader' : ''}`}
         style={{ borderColor: team?.color || '#d1d5db' }}>
      <div className="ccp-team-header">
        <span className="ccp-team-emoji">{team?.emoji}</span>
        <span className="ccp-team-name">{team?.name}</span>
        {isLeader && <span className="ccp-crown">👑 متقدم</span>}
      </div>

      <div className="ccp-team-stats">
        <div className="ccp-stat">
          <span className="ccp-stat-val">{(team?.victory_points || 0).toLocaleString('ar')}</span>
          <span className="ccp-stat-lbl">نقاط النصر (VP)</span>
        </div>
        <div className="ccp-stat">
          <span className="ccp-stat-val">{(team?.total_xp || 0).toLocaleString('ar')}</span>
          <span className="ccp-stat-lbl">إجمالي XP</span>
        </div>
      </div>

      {/* Top students */}
      {leaderboard?.length > 0 && (
        <div className="ccp-leaderboard">
          <p className="ccp-leaderboard-title">الأعلى أداءً</p>
          <ol className="ccp-lb-list">
            {leaderboard.slice(0, 3).map((s, i) => (
              <li key={s.student_id} className="ccp-lb-row">
                <span className="ccp-lb-rank">{i + 1}</span>
                {s.avatar_url
                  ? <img className="ccp-lb-avatar" src={s.avatar_url} alt={s.display_name} />
                  : <div className="ccp-lb-avatar ccp-lb-avatar--placeholder">{(s.display_name || '?')[0]}</div>
                }
                <span className="ccp-lb-name">{s.display_name}</span>
                <span className="ccp-lb-xp">{s.total_xp?.toLocaleString('ar')} XP</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function WeeklyGoalsCard({ goals }) {
  if (!goals?.length) return null
  const now = Date.now()
  const currentGoals = goals.filter(g => new Date(g.week_end_date) >= now)

  if (!currentGoals.length) return null

  return (
    <div className="ccp-card">
      <h3 className="ccp-section-title">الأهداف الأسبوعية</h3>
      <div className="ccp-goals-grid">
        {currentGoals.map(g => {
          const pct = g.final_pct ?? null
          const target = g.required_pct
          const done = pct !== null
          return (
            <div key={g.id || `${g.team}-${g.week_num}`} className={`ccp-goal ${done && pct >= target ? 'ccp-goal--done' : ''}`}>
              <div className="ccp-goal-header">
                <span className="ccp-goal-team">فريق {g.team}</span>
                <span className="ccp-goal-week">أسبوع {g.week_num}</span>
                {done
                  ? <span className={`ccp-goal-status ${pct >= target ? 'ccp-goal-status--pass' : 'ccp-goal-status--fail'}`}>
                      {pct}%
                    </span>
                  : <span className="ccp-goal-status ccp-goal-status--pending">قيد التقييم</span>
                }
              </div>
              <div className="ccp-goal-body">
                <span>{g.target_unit_number} وحدات مطلوبة</span>
                <span>الحد الأدنى {g.required_pct}%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RecognitionsCard({ recognitions }) {
  if (!recognitions?.length) {
    return (
      <div className="ccp-card ccp-card--empty">
        <span className="ccp-empty-icon">🤝</span>
        <p className="ccp-empty-text">لا توجد تعريفات بالجميل بعد</p>
      </div>
    )
  }

  return (
    <div className="ccp-card">
      <h3 className="ccp-section-title">التعريف بالجميل بين الطلاب</h3>
      <ul className="ccp-rec-list">
        {recognitions.slice(0, 10).map(r => (
          <li key={r.id} className="ccp-rec-row">
            <div className="ccp-rec-body">
              <span className="ccp-rec-message">{r.message || '—'}</span>
              {r.xp_awarded > 0 && <span className="ccp-rec-xp">+{r.xp_awarded} XP</span>}
            </div>
            <span className="ccp-rec-time">{timeAgo(r.created_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function CompetitionCommandPage() {
  const { data, isLoading } = useCompetitionView()

  if (isLoading) {
    return (
      <div className="ccp-page" dir="rtl">
        <div className="ccp-topbar"><h1 className="ccp-topbar-title">🏆 قيادة المسابقة</h1></div>
        <div className="ccp-skeleton-list">
          <div className="ccp-skeleton" style={{ height: '6rem' }} />
          <div className="ccp-skeleton" style={{ height: '16rem' }} />
        </div>
      </div>
    )
  }

  if (!data?.active) {
    return (
      <div className="ccp-page" dir="rtl">
        <div className="ccp-topbar"><h1 className="ccp-topbar-title">🏆 قيادة المسابقة</h1></div>
        <div className="ccp-empty-state">
          <span className="ccp-empty-icon">🏆</span>
          <h2 className="ccp-empty-title">لا توجد مسابقة نشطة حالياً</h2>
          <p className="ccp-empty-sub">المسابقات تنطلق دورياً. تابع التحديثات في الكوكبيت.</p>
        </div>
      </div>
    )
  }

  const comp = data.competition
  const days = daysRemaining(comp?.end_at)
  const gapVP = Math.abs(comp?.gap_vp || 0)

  return (
    <div className="ccp-page" dir="rtl">
      <div className="ccp-topbar">
        <h1 className="ccp-topbar-title">🏆 قيادة المسابقة</h1>
      </div>

      {/* Status banner */}
      <div className="ccp-banner">
        <div className="ccp-banner-title">{comp?.title_ar}</div>
        <div className="ccp-banner-meta">
          {days != null && (
            <span className="ccp-banner-days">
              {days > 0 ? `${days} ${days === 1 ? 'يوم' : 'أيام'} متبقية` : 'انتهت المسابقة'}
            </span>
          )}
          <span className="ccp-banner-gap">الفارق: {gapVP.toLocaleString('ar')} VP</span>
        </div>
      </div>

      {/* Team cards */}
      <div className="ccp-teams-grid">
        <TeamCard teamKey="A" comp={comp} leaderboard={data.leaderboard_a} />
        <TeamCard teamKey="B" comp={comp} leaderboard={data.leaderboard_b} />
      </div>

      {/* Weekly goals */}
      <WeeklyGoalsCard goals={data.weekly_goals} />

      {/* Peer recognitions */}
      <div className="ccp-card-section-header">
        <h3 className="ccp-section-title-standalone">التعريف بالجميل</h3>
      </div>
      <RecognitionsCard recognitions={data.recognitions} />

      {/* Reference */}
      <div className="ccp-ref-card">
        <a
          href="/student/competition/rules"
          target="_blank"
          rel="noreferrer"
          className="ccp-ref-link"
        >
          📋 اقرأ قوانين المسابقة
        </a>
      </div>
    </div>
  )
}
