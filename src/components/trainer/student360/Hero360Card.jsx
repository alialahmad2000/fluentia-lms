import './Hero360Card.css'

const STATUS_LABEL = {
  active: 'نشط',
  inactive: 'غير نشط',
  suspended: 'موقوف',
  trial: 'تجريبي',
}

function daysSince(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export default function Hero360Card({ overview, loading }) {
  if (loading) {
    return (
      <div className="h360-card h360-card--skeleton">
        <div className="h360-skeleton h360-skeleton--avatar" />
        <div className="h360-skeleton--info">
          <div className="h360-skeleton h360-skeleton--name" />
          <div className="h360-skeleton h360-skeleton--meta" />
        </div>
      </div>
    )
  }

  const student = overview?.student || {}
  const group = overview?.group || {}
  const metrics = overview?.metrics || {}

  const lastActiveDays = daysSince(student.last_active_at)
  const statusClass = student.status === 'active' ? 'h360-status--active' : 'h360-status--inactive'

  return (
    <div className="h360-card">
      <div className="h360-hero">
        <div className="h360-avatar-wrap">
          {student.avatar_url
            ? <img className="h360-avatar" src={student.avatar_url} alt={student.name} />
            : <div className="h360-avatar h360-avatar--placeholder">{(student.name || '?')[0]}</div>
          }
          <span className={`h360-status ${statusClass}`}>{STATUS_LABEL[student.status] || student.status}</span>
        </div>

        <div className="h360-info">
          <h1 className="h360-name">{student.name || '—'}</h1>
          <div className="h360-meta-row">
            <span className="h360-group">{group.name} · المستوى {group.level}</span>
            {lastActiveDays !== null && (
              <span className={`h360-last-active ${lastActiveDays > 7 ? 'h360-last-active--warn' : ''}`}>
                آخر نشاط: {lastActiveDays === 0 ? 'اليوم' : `منذ ${lastActiveDays} يوم`}
              </span>
            )}
          </div>
          <div className="h360-contact-row">
            {student.phone && <a className="h360-contact-link" href={`https://wa.me/${student.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer">واتساب</a>}
            {student.email && <a className="h360-contact-link" href={`mailto:${student.email}`}>{student.email}</a>}
          </div>
        </div>
      </div>

      <div className="h360-stats">
        <div className="h360-stat">
          <span className="h360-stat__val">{metrics.xp_total?.toLocaleString('ar') ?? '—'}</span>
          <span className="h360-stat__lbl">XP إجمالي</span>
        </div>
        <div className="h360-stat">
          <span className="h360-stat__val">{metrics.xp_30d?.toLocaleString('ar') ?? '—'}</span>
          <span className="h360-stat__lbl">XP (٣٠ يوم)</span>
        </div>
        <div className="h360-stat">
          <span className="h360-stat__val">{student.current_streak ?? '—'}</span>
          <span className="h360-stat__lbl">سلسلة الأيام 🔥</span>
        </div>
        <div className="h360-stat">
          <span className="h360-stat__val">{student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' }) : '—'}</span>
          <span className="h360-stat__lbl">تاريخ الانضمام</span>
        </div>
      </div>
    </div>
  )
}
