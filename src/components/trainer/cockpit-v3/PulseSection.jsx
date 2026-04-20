import { Link } from 'react-router-dom'

const DAY_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربع', 'خميس', 'جمعة', 'سبت']

function intensityClass(xp) {
  if (!xp || xp === 0) return 'db-pulse__cell--empty'
  if (xp < 10) return 'db-pulse__cell--low'
  if (xp < 30) return 'db-pulse__cell--mid'
  if (xp < 60) return 'db-pulse__cell--high'
  return 'db-pulse__cell--peak'
}

export default function PulseSection({ data }) {
  const students = data?.students || []
  const matrix   = data?.matrix || {}
  const days     = data?.days || []

  if (!students.length) return null

  const dayLabels = days.map(d => DAY_AR[new Date(d).getDay()])

  return (
    <section className="db-section">
      <h2 className="db-section__title">📊 نبض الطلاب — آخر ٧ أيام</h2>

      <div className="db-pulse__grid">
        <div className="db-pulse__day-labels">
          <span />
          {dayLabels.map((label, i) => (
            <span key={i} className="db-pulse__day-label">{label}</span>
          ))}
        </div>

        {students.map(s => (
          <div key={s.id} className="db-pulse__row">
            <Link to={`/trainer/student/${s.id}`} className="db-pulse__name" title={s.full_name}>
              {s.full_name}
            </Link>
            {days.map(day => {
              const xp = matrix[s.id]?.[day] || 0
              return (
                <Link
                  key={day}
                  to={`/trainer/student/${s.id}`}
                  className={`db-pulse__cell ${intensityClass(xp)}`}
                  title={`${s.full_name} — ${day}: ${xp} XP`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
