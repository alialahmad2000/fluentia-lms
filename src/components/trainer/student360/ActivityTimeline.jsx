import './ActivityTimeline.css'

const EVENT_CONFIG = {
  xp:           { icon: '⚡', cls: 'at-event--xp' },
  writing:      { icon: '✍️', cls: 'at-event--writing' },
  speaking:     { icon: '🎙️', cls: 'at-event--speaking' },
  attendance:   { icon: '📋', cls: 'at-event--attendance' },
  intervention: { icon: '🚨', cls: 'at-event--intervention' },
}

function timeAgo(iso) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d === 0) return 'اليوم'
  if (d === 1) return 'أمس'
  return `منذ ${d} يوم`
}

export default function ActivityTimeline({ events, loading }) {
  const cfg = EVENT_CONFIG

  return (
    <div className="at-card">
      <h3 className="at-title">سجل النشاط (١٤ يوم)</h3>

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
        <p className="at-empty">لا يوجد نشاط في آخر ١٤ يوماً</p>
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
