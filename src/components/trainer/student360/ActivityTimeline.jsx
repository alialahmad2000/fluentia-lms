import './ActivityTimeline.css'
import { useTranslation } from 'react-i18next'

const EVENT_CONFIG = {
  xp:           { icon: '⚡', cls: 'at-event--xp' },
  writing:      { icon: '✍️', cls: 'at-event--writing' },
  speaking:     { icon: '🎙️', cls: 'at-event--speaking' },
  attendance:   { icon: '📋', cls: 'at-event--attendance' },
  intervention: { icon: '🚨', cls: 'at-event--intervention' },
}

export default function ActivityTimeline({ events, loading }) {
  const { t } = useTranslation()
  const cfg = EVENT_CONFIG

  function timeAgo(iso) {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
    if (d === 0) return t('trainer.students.date_today')
    if (d === 1) return t('trainer.students.date_yesterday')
    return `${t('trainer.student360.since', 'منذ')} ${d} ${t('trainer.students.time_unit_day')}`
  }

  return (
    <div className="at-card">
      <h3 className="at-title">{t('trainer.students.activity_chart_title')}</h3>

      {loading ? (
        <ul className="at-list">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="at-item at-item--skeleton">
              <div className="at-skeleton at-skeleton--icon" />
              <div className="at-skeleton--body">
                <div className="at-skeleton at-skeleton--line" />
                <div className="at-skeleton at-skeleton--sub" />
              </div>
            </li>
          ))}
        </ul>
      ) : !events?.length ? (
        <p className="at-empty">{t('trainer.students.activity_empty')}</p>
      ) : (
        <ul className="at-list">
          {events.map((e, i) => {
            const c = cfg[e.event_type] || { icon: '•', cls: '' }
            return (
              <li key={i} className={`at-item ${c.cls}`}>
                <span className="at-icon">{c.icon}</span>
                <div className="at-body">
                  <span className="at-event-title">{e.title}</span>
                  {e.detail && <span className="at-detail">{e.detail}</span>}
                </div>
                <span className="at-time">{timeAgo(e.occurred_at)}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
