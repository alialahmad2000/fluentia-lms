import './SkillsRadar.css'
import { useTranslation } from 'react-i18next'

function Bar({ label, value, color }) {
  const pct = Math.min(100, Math.round((value || 0) / 10 * 100))
  return (
    <div className="sr-bar-row">
      <span className="sr-bar-label">{label}</span>
      <div className="sr-bar-track">
        <div className="sr-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="sr-bar-val">{value != null ? Number(value).toFixed(1) : '—'}</span>
    </div>
  )
}

export default function SkillsRadar({ metrics, loading }) {
  const { t } = useTranslation()

  const SKILLS = [
    { key: 'writing_avg',  label: t('trainer.reports.skill_writing'),    color: '#6366f1' },
    { key: 'speaking_avg', label: t('trainer.reports.skill_speaking'),   color: '#10b981' },
    { key: 'vocab_avg',    label: t('trainer.reports.skill_vocabulary'), color: '#f59e0b' },
    { key: 'grammar_avg',  label: t('trainer.reports.skill_grammar'),    color: '#ef4444' },
  ]

  return (
    <div className="sr-card">
      <h3 className="sr-title">{t('trainer.student360.skills')}</h3>
      {loading ? (
        <div className="sr-skeleton-list">
          {SKILLS.map(s => <div key={s.key} className="sr-skeleton" />)}
        </div>
      ) : (
        <div className="sr-bars">
          {SKILLS.map(s => (
            <Bar key={s.key} label={s.label} value={metrics?.[s.key]} color={s.color} />
          ))}
        </div>
      )}
      <p className="sr-note">{t('trainer.student360.skills_note', 'المتوسط من آخر ٥ تقييمات')}</p>
    </div>
  )
}
