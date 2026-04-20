import { Link } from 'react-router-dom'

function formatHours(h) {
  if (!h && h !== 0) return '—'
  if (h < 1) return 'أقل من ساعة'
  if (h < 24) return `${Math.floor(h)} ساعة`
  return `${Math.floor(h / 24)} يوم`
}

function typeLabel(t) {
  return t === 'speaking' ? 'محادثة' : 'كتابة'
}

export default function GradingSection({ items = [] }) {
  if (!items.length) return null

  const count = items.length
  const shown = items.slice(0, 3)

  return (
    <section className="db-section">
      <h2 className="db-section__title">
        ✍️ {count.toLocaleString('ar-SA')} {count === 1 ? 'تصحيح معلق' : 'تصحيحات معلقة'}
      </h2>

      <ul className="db-grading__list">
        {shown.map(item => (
          <li key={item.submission_id}>
            <Link
              to="/trainer/grading"
              className={`db-grading__row${item.is_urgent ? ' db-grading__row--urgent' : ''}`}
            >
              <span className="db-grading__type-badge">{typeLabel(item.submission_type)}</span>
              <span className="db-grading__student">{item.student_name}</span>
              <span className="db-grading__age">{formatHours(item.hours_pending)}</span>
              <span className="db-interv__arrow">←</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="db-section__footer">
        <Link to="/trainer/grading" className="db-section__link">
          افتح قائمة التصحيح ←
        </Link>
      </div>
    </section>
  )
}
