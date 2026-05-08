import { PenLine, Mic, Award } from 'lucide-react'
import { useTranslation } from 'react-i18next'

function TypeChip({ type }) {
  const { t } = useTranslation()
  const isSpeaking = type === 'speaking'
  return (
    <span style={{
      fontSize: 11, padding: '2px 7px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4,
      background: isSpeaking ? 'rgba(139,92,246,0.12)' : 'rgba(56,189,248,0.12)',
      color: isSpeaking ? 'var(--ds-accent-violet, #8b5cf6)' : 'var(--ds-accent-sky, #38bdf8)',
    }}>
      {isSpeaking ? <Mic size={10} /> : <PenLine size={10} />}
      {isSpeaking ? t('common.speaking') : t('common.writing')}
    </span>
  )
}

function IELTSChip() {
  return (
    <span style={{
      fontSize: 11, padding: '2px 7px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'rgba(233,185,73,0.12)', color: 'var(--ds-accent-primary, var(--accent-gold, #e9b949))',
    }}>
      <Award size={10} /> IELTS
    </span>
  )
}

export default function IELTSSubmissionCard({ item, onClick }) {
  const { t } = useTranslation()

  function formatAge(submittedAt) {
    if (!submittedAt) return '—'
    const h = (Date.now() - new Date(submittedAt).getTime()) / 3_600_000
    if (h < 1) return t('trainer.grading.less_than_hour')
    if (h < 24) return `${Math.floor(h)}${t('trainer.ielts.hour_short', 'س')}`
    return `${Math.floor(h / 24)} ${t('trainer.students.time_unit_day')}`
  }
  const { student_name, submission_type, band_score, submitted_at } = item

  const isUrgent = (Date.now() - new Date(submitted_at).getTime()) > 48 * 3_600_000

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
        background: isUrgent ? 'rgba(244,63,94,0.04)' : 'var(--ds-surface-1, rgba(255,255,255,0.03))',
        border: `1px solid ${isUrgent ? 'rgba(244,63,94,0.15)' : 'var(--ds-border-subtle, rgba(255,255,255,0.06))'}`,
        fontFamily: "'Tajawal', sans-serif",
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IELTSChip />
          <TypeChip type={submission_type} />
          {isUrgent && (
            <span style={{ fontSize: 10, color: 'var(--ds-accent-rose, #f43f5e)', fontWeight: 600 }}>⚠️ {t('trainer.grading.urgent_badge', 'متأخر')}</span>
          )}
        </div>
        <span style={{ fontSize: 14, color: 'var(--ds-text-primary, var(--text-primary))', fontWeight: 600 }}>
          {student_name}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--ds-accent-primary, var(--accent-gold, #e9b949))' }}>
          {band_score ?? '—'}
        </span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-tertiary, var(--text-tertiary))' }}>
          {formatAge(submitted_at)}
        </span>
      </div>
    </button>
  )
}
