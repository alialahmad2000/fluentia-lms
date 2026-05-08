import { useTranslation } from 'react-i18next'

function fmt(date) {
  if (!date) return '—'
  const d = new Date(date)
  const today = new Date()
  const diffDays = Math.floor((today - d) / 86_400_000)
  if (diffDays === 0) return 'اليوم'
  if (diffDays === 1) return 'أمس'
  if (diffDays < 7) return `${diffDays} أيام`
  return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })
}

export default function StudentSessionsList({ sessions }) {
  const { t } = useTranslation()

  const SKILL_AR = {
    reading: t('trainer.curriculum.tabs.reading'),
    listening: t('trainer.curriculum.tabs.listening'),
    writing: t('trainer.curriculum.tabs.writing'),
    speaking: t('trainer.curriculum.tabs.speaking'),
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--ds-text-tertiary, var(--text-tertiary))', fontSize: 13, fontFamily: "'Tajawal', sans-serif" }}>
        {t('trainer.ielts.no_sessions', 'لا توجد جلسات مسجّلة بعد')}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {sessions.map((s, i) => (
        <div key={s.id || i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderRadius: 8,
          background: 'var(--ds-surface-1, rgba(255,255,255,0.02))',
          borderBottom: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.04))',
        }}>
          <div style={{ display: 'flex', align: 'center', gap: 8 }}>
            <span style={{
              fontSize: 11, padding: '1px 6px', borderRadius: 4,
              background: 'rgba(56,189,248,0.12)', color: 'var(--ds-accent-sky, #38bdf8)',
              fontFamily: "'Tajawal', sans-serif",
            }}>
              {SKILL_AR[s.skill_type] || s.skill_type}
            </span>
            {s.question_type && (
              <span style={{ fontSize: 11, color: 'var(--ds-text-tertiary, var(--text-tertiary))' }}>
                {s.question_type}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ds-text-tertiary, var(--text-tertiary))' }}>
            {s.correct_count != null && <span>✓ {s.correct_count}/{(s.correct_count || 0) + (s.incorrect_count || 0)}</span>}
            {s.band_score != null && <span style={{ color: 'var(--ds-accent-primary, var(--accent-gold, #e9b949))', fontWeight: 600 }}>{s.band_score}</span>}
            <span>{fmt(s.started_at)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
