import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function formatHours(h, t) {
  if (!h && h !== 0) return '—'
  if (h < 1) return t('trainer.grading.less_than_hour')
  if (h < 24) return `${Math.floor(h)} ${t('trainer.students.time_unit_hour')}`
  return `${Math.floor(h / 24)} ${t('trainer.students.time_unit_day')}`
}

function typeLabel(type, t) {
  return type === 'speaking' ? t('common.speaking') : t('common.writing')
}

export default function GradingSection({ items = [] }) {
  const { t } = useTranslation()
  const count = items.length

  if (!count) return null
  const shown = items.slice(0, 3)

  return (
    <section className="db-section">
      <h2 className="db-section__title">
        ✍️ {count.toLocaleString('ar-SA')} {count === 1 ? t('trainer.grading.pending_singular', 'تصحيح معلق') : t('trainer.grading.pending_plural', 'تصحيحات معلقة')}
      </h2>

      <ul className="db-grading__list">
        {shown.map(item => (
          <li key={item.submission_id}>
            <Link
              to="/trainer/grading"
              className={`db-grading__row${item.is_urgent ? ' db-grading__row--urgent' : ''}`}
            >
              <span className="db-grading__type-badge">{typeLabel(item.submission_type, t)}</span>
              <span className="db-grading__student">{item.student_name}</span>
              <span className="db-grading__age">{formatHours(item.hours_pending, t)}</span>
              <span className="db-interv__arrow">←</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="db-section__footer">
        <Link to="/trainer/grading" className="db-section__link">
          {t('trainer.grading.label')} ←
        </Link>
      </div>
    </section>
  )
}
