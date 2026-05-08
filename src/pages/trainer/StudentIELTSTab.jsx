import { useTranslation } from 'react-i18next'
import { useStudentIELTSDetail } from '@/hooks/trainer/useTrainerIELTSStudents'
import StudentMocksPanel from '@/components/trainer/ielts/StudentMocksPanel'
import StudentPlanPanel from '@/components/trainer/ielts/StudentPlanPanel'
import StudentErrorsPanel from '@/components/trainer/ielts/StudentErrorsPanel'
import StudentSessionsList from '@/components/trainer/ielts/StudentSessionsList'

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{
        margin: '0 0 12px 0', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em',
        color: 'var(--ds-text-tertiary, var(--text-tertiary))', fontFamily: "'Tajawal', sans-serif",
      }}>
        {title}
      </h3>
      <div style={{
        padding: 16, borderRadius: 14,
        background: 'var(--ds-surface-1, rgba(255,255,255,0.025))',
        border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.06))',
      }}>
        {children}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[120, 160, 100, 140].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 14, background: 'var(--ds-surface-1, rgba(255,255,255,0.04))' }} />
      ))}
    </div>
  )
}

export default function StudentIELTSTab({ studentId }) {
  const { t } = useTranslation()
  const { data, isLoading, error } = useStudentIELTSDetail(studentId)

  if (isLoading) return <Skeleton />

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--ds-accent-rose, #f43f5e)', fontFamily: "'Tajawal', sans-serif" }}>
        {t('trainer.ielts.error_loading_detail')}
      </div>
    )
  }

  if (!data || (data.results.length === 0 && !data.plan && data.errors.length === 0 && data.sessions.length === 0)) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--ds-text-tertiary, var(--text-tertiary))', fontFamily: "'Tajawal', sans-serif" }}>
        <p style={{ fontSize: 16, marginBottom: 8 }}>{t('trainer.ielts.not_started_title')}</p>
        <p style={{ fontSize: 13 }}>{t('trainer.ielts.not_started_subtitle')}</p>
      </div>
    )
  }

  const { results, plan, errors, sessions } = data

  return (
    <div style={{ padding: '8px 0' }} dir="rtl">
      <Section title={t('trainer.ielts.section_mocks')}>
        <StudentMocksPanel results={results} />
      </Section>

      <Section title={t('trainer.ielts.section_plan')}>
        <StudentPlanPanel plan={plan} />
      </Section>

      <Section title={t('trainer.ielts.section_errors')}>
        <StudentErrorsPanel errors={errors} />
      </Section>

      <Section title={t('trainer.ielts.section_sessions')}>
        <StudentSessionsList sessions={sessions} />
      </Section>
    </div>
  )
}
