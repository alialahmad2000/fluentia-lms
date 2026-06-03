// /student/retention/reports — list of past weekly reports
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Mail } from 'lucide-react'
import { useMyReports } from '../../../lib/retention/useReports'
import { useRetentionModuleEnabled } from '../../../lib/retention/useRetentionModule'
import { RETENTION_MODULES } from '../../../lib/retention/constants'
import AuroraBackground from '../../../design-system/components/AuroraBackground'
import GlassPanel from '../../../design-system/components/GlassPanel'
import RetentionDisabledState from '../../../design-system/retention/RetentionDisabledState'
import { useG } from '../../../i18n/gender'

export default function MyReports() {
  const navigate = useNavigate()
  const g = useG()
  const moduleEnabled = useRetentionModuleEnabled(RETENTION_MODULES.WEEKLY_REPORTS)
  const { data, isLoading } = useMyReports()

  if (moduleEnabled.isLoading) return <div className="p-8" dir="rtl"><div className="h-32 animate-pulse" /></div>
  if (!moduleEnabled.enabled) return <RetentionDisabledState moduleLabel="التقرير الأسبوعي" />

  return (
    <div className="relative min-h-screen" dir="rtl">
      <AuroraBackground />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5 relative">
        <button onClick={() => navigate('/student')} className="flex items-center gap-1 text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
          <ChevronLeft size={16} />الرئيسية
        </button>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>تقاريرك الأسبوعية</h1>
        <p style={{ color: 'var(--ds-text-secondary)' }}>
          {g('كل أسبوع نرسل لك تقرير شخصي يلخّص تقدّمك ويحتفي بإنجازاتك.', 'كل أسبوع نرسل لكِ تقرير شخصي يلخّص تقدّمكِ ويحتفي بإنجازاتكِ.')}
        </p>

        {isLoading ? (
          <GlassPanel padding="md"><div className="h-24 animate-pulse" /></GlassPanel>
        ) : !data || data.length === 0 ? (
          <GlassPanel padding="lg" className="text-center">
            <Mail size={32} style={{ color: 'var(--ds-text-tertiary)' }} className="mx-auto mb-3" />
            <p style={{ color: 'var(--ds-text-secondary)' }}>{g('لم يصلك أي تقرير بعد. التقرير القادم يوم الأحد.', 'لم يصلكِ أي تقرير بعد. التقرير القادم يوم الأحد.')}</p>
          </GlassPanel>
        ) : (
          <ul className="space-y-3">
            {data.map((r) => (
              <GlassPanel key={r.id} padding="md">
                <button
                  onClick={() => navigate(`/student/retention/reports/${r.id}`)}
                  className="w-full text-right"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold" style={{ color: 'var(--ds-text-primary)' }}>{r.rendered_title_ar}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
                        أسبوع {r.week_start} · XP: {r.metrics?.xp_this_week ?? 0}
                      </div>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--ds-accent-primary)' }}>{g('افتح ←', 'افتحي ←')}</span>
                  </div>
                </button>
              </GlassPanel>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
