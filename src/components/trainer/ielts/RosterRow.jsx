import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function bandColor(band) {
  if (!band) return 'var(--ds-text-tertiary, var(--text-tertiary))'
  if (band >= 7) return 'var(--ds-accent-emerald, #10b981)'
  if (band >= 5.5) return 'var(--ds-accent-amber, #f59e0b)'
  return 'var(--ds-accent-rose, #f43f5e)'
}

export default function RosterRow({ student }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  function dayStr(days) {
    if (days === null) return '—'
    if (days === 0) return t('trainer.students.date_today')
    if (days === 1) return t('trainer.students.date_yesterday')
    return `${days}${t('trainer.ielts.day_short', 'ي')}`
  }
  const { id, full_name, target_band, last_mock_band, gap, days_since_last_mock, due_errors, plan_age_days, needs_attention } = student

  return (
    <tr
      onClick={() => navigate(`/trainer/student/${id}/progress?tab=ielts`)}
      style={{
        cursor: 'pointer',
        background: needs_attention ? 'rgba(245,158,11,0.04)' : 'transparent',
        borderBottom: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.06))',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = needs_attention ? 'rgba(245,158,11,0.09)' : 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { e.currentTarget.style.background = needs_attention ? 'rgba(245,158,11,0.04)' : 'transparent' }}
    >
      <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {needs_attention
          ? <AlertTriangle size={14} style={{ color: 'var(--ds-accent-amber, #f59e0b)', flexShrink: 0 }} />
          : <CheckCircle size={14} style={{ color: 'var(--ds-accent-emerald, #10b981)', flexShrink: 0 }} />
        }
        <span style={{ fontSize: 14, fontFamily: "'Tajawal', sans-serif", color: 'var(--ds-text-primary, var(--text-primary))' }}>{full_name}</span>
      </td>
      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: 14, color: 'var(--ds-text-secondary, var(--text-secondary))' }}>
        {target_band ?? '—'}
      </td>
      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: 14, color: bandColor(last_mock_band), fontWeight: 600 }}>
        {last_mock_band ?? '—'}
      </td>
      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: 14, color: gap !== null ? (gap > 0 ? 'var(--ds-accent-amber, #f59e0b)' : 'var(--ds-accent-emerald, #10b981)') : 'var(--ds-text-tertiary, var(--text-tertiary))' }}>
        {gap !== null ? (gap > 0 ? `+${gap}` : gap) : '—'}
      </td>
      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: 13, color: days_since_last_mock !== null && days_since_last_mock > 30 ? 'var(--ds-accent-rose, #f43f5e)' : 'var(--ds-text-secondary, var(--text-secondary))' }}>
        {dayStr(days_since_last_mock)}
      </td>
      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: 13, color: due_errors > 0 ? 'var(--ds-accent-amber, #f59e0b)' : 'var(--ds-text-tertiary, var(--text-tertiary))' }}>
        {due_errors > 0 ? `${due_errors} ${t('trainer.ielts.due', 'مستحق')}` : '✓'}
      </td>
      <td style={{ padding: '12px 8px', textAlign: 'center', fontSize: 13, color: plan_age_days !== null && plan_age_days > 14 ? 'var(--ds-accent-amber, #f59e0b)' : 'var(--ds-text-secondary, var(--text-secondary))' }}>
        {plan_age_days !== null ? `${plan_age_days}ي` : '—'}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--ds-accent-primary, var(--accent-gold, #e9b949))' }}>{t('trainer.students.view_profile')} ←</span>
      </td>
    </tr>
  )
}
