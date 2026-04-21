import { Link } from 'react-router-dom'

const SEV_CLASS = { urgent: 'urgent', attention: 'attention', celebrate: 'celebrate' }
const SEV_ICON  = { urgent: '🚨', attention: '⚠️', celebrate: '🌟' }

function arabicCount(n, singular, plural) {
  return `${n.toLocaleString('ar-SA')} ${n === 1 ? singular : plural}`
}

export default function InterventionsSection({ items = [] }) {
  if (!items.length) return null

  const title = arabicCount(items.length, 'طالب يحتاج تدخلك', 'طلاب يحتاجون تدخلك')

  return (
    <section className="db-section">
      <h2 className="db-section__title">
        {SEV_ICON[items[0]?.severity] || '⚠️'} {title}
      </h2>

      <ul className="db-interv__list">
        {items.map(item => (
          <li key={item.id || item.student_id}>
            <Link
              to={`/trainer/student/${item.student_id}`}
              className={`db-interv__row db-interv__row--${SEV_CLASS[item.severity] || 'attention'}`}
            >
              <span className="db-interv__name">{item.student_name}</span>
              <span className="db-interv__reason">{item.reason_ar || item.short_message || item.reason_code}</span>
              <span className="db-interv__arrow">←</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="db-section__footer">
        <Link to="/trainer/students" className="db-section__link">
          📋 ملفات الطلاب ←
        </Link>
      </div>
    </section>
  )
}
