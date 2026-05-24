// /student/retention/reports/:id — single weekly report view
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Award, Flame, Mic, Pencil, BookOpen } from 'lucide-react'
import { useReport } from '../../../lib/retention/useReports'
import { useRetentionModuleEnabled } from '../../../lib/retention/useRetentionModule'
import { RETENTION_MODULES } from '../../../lib/retention/constants'
import AuroraBackground from '../../../design-system/components/AuroraBackground'
import GlassPanel from '../../../design-system/components/GlassPanel'
import RetentionDisabledState from '../../../design-system/retention/RetentionDisabledState'

function MetricBox({ icon, label, value, color = 'var(--ds-accent-primary)' }) {
  return (
    <div className="flex items-center gap-3 p-3" style={{
      background: `color-mix(in srgb, ${color} 8%, transparent)`,
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--ds-border-subtle)',
    }}>
      <div className="w-9 h-9 flex items-center justify-center" style={{
        background: `color-mix(in srgb, ${color} 18%, transparent)`,
        color, borderRadius: 'var(--radius-sm)',
      }}>{icon}</div>
      <div>
        <div className="text-xl font-extrabold" style={{ color: 'var(--ds-text-primary)' }}>{value}</div>
        <div className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>{label}</div>
      </div>
    </div>
  )
}

export default function ReportDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const moduleEnabled = useRetentionModuleEnabled(RETENTION_MODULES.WEEKLY_REPORTS)
  const { data, isLoading } = useReport(id)

  if (moduleEnabled.isLoading || isLoading) return <div className="p-8" dir="rtl"><div className="h-40 animate-pulse" /></div>
  if (!moduleEnabled.enabled) return <RetentionDisabledState moduleLabel="التقرير الأسبوعي" />
  if (!data) return <div className="p-8 text-center" dir="rtl">التقرير غير متوفر.</div>

  const m = data.metrics || {}

  return (
    <div className="relative min-h-screen" dir="rtl">
      <AuroraBackground />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5 relative">
        <button onClick={() => navigate('/student/retention/reports')} className="flex items-center gap-1 text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
          <ChevronLeft size={16} />كل التقارير
        </button>

        <GlassPanel padding="lg">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ds-text-primary)' }}>{data.rendered_title_ar}</h1>
          <div className="text-xs mb-5" style={{ color: 'var(--ds-text-tertiary)' }}>
            أسبوع {data.week_start} → {data.week_end}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-5">
            <MetricBox icon={<Award size={18} />} label="XP الأسبوع" value={m.xp_this_week ?? 0} color="var(--ds-accent-gold)" />
            <MetricBox icon={<Flame size={18} />} label="السلسلة (يوم)" value={m.streak ?? 0} color="var(--ds-accent-warning)" />
            <MetricBox icon={<Mic size={18} />} label="محادثات" value={m.dialogues_completed ?? 0} color="var(--ds-accent-primary)" />
            <MetricBox icon={<Pencil size={18} />} label="مجموعات تمارين" value={m.homework_completed ?? 0} color="var(--ds-accent-secondary)" />
            <MetricBox icon={<BookOpen size={18} />} label="كلمات محفوظة" value={m.words_saved ?? 0} color="var(--ds-accent-success)" />
            <MetricBox icon={<Award size={18} />} label="حضور" value={`${m.attendance_pct ?? 0}٪`} color="var(--ds-amber)" />
          </div>

          <div
            className="text-base leading-loose whitespace-pre-line p-5"
            style={{
              background: 'color-mix(in srgb, var(--ds-accent-primary) 6%, transparent)',
              border: '1px solid var(--ds-border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--ds-text-secondary)',
            }}
          >
            {data.rendered_body_ar}
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}
