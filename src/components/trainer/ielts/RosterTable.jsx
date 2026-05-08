import RosterRow from './RosterRow'
import { useTranslation } from 'react-i18next'

const TH_STYLE = {
  padding: '10px 8px',
  fontSize: 11,
  fontWeight: 600,
  textAlign: 'center',
  color: 'var(--ds-text-tertiary, var(--text-tertiary))',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
}

export default function RosterTable({ students }) {
  const { t } = useTranslation()

  if (!students || students.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--ds-text-tertiary, var(--text-tertiary))', fontFamily: "'Tajawal', sans-serif" }}>
        <p style={{ fontSize: 16, marginBottom: 8 }}>{t('trainer.ielts.no_students', 'ما عندك طلاب في مسار IELTS حالياً')}</p>
        <p style={{ fontSize: 13 }}>{t('trainer.ielts.not_started_subtitle')}</p>
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.06))' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Tajawal', sans-serif" }} dir="rtl">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))' }}>
            <th style={{ ...TH_STYLE, textAlign: 'right', padding: '10px 16px' }}>{t('trainer.students.label')}</th>
            <th style={TH_STYLE}>{t('trainer.ielts.col_target', 'الهدف')}</th>
            <th style={TH_STYLE}>{t('trainer.ielts.col_last_mock', 'آخر موك')}</th>
            <th style={TH_STYLE}>{t('trainer.ielts.col_gap', 'الفجوة')}</th>
            <th style={TH_STYLE}>{t('trainer.ielts.col_last_mock_ago', 'آخر موك (منذ)')}</th>
            <th style={TH_STYLE}>{t('trainer.ielts.section_errors')}</th>
            <th style={TH_STYLE}>{t('trainer.ielts.section_plan')}</th>
            <th style={{ ...TH_STYLE, padding: '10px 16px' }}></th>
          </tr>
        </thead>
        <tbody>
          {students.map(s => <RosterRow key={s.id} student={s} />)}
        </tbody>
      </table>
    </div>
  )
}
