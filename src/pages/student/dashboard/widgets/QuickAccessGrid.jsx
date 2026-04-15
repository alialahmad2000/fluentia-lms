import { CalendarDays, FileText, Crosshair, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import GlassPanel from '../../../../design-system/components/GlassPanel'

const QUICK_ACCESS = [
  { to: '/student/weekly-tasks', label: 'المهام الأسبوعية', icon: CalendarDays },
  { to: '/student/assignments', label: 'الواجبات', icon: FileText, badgeKey: 'assignments' },
  { to: '/student/adaptive-test', label: 'اختبار المستوى', icon: Crosshair },
  { to: '/student/ai-insights', label: 'رؤى ذكية', icon: Sparkles },
]

export default function QuickAccessGrid({ pendingAssignments = 0 }) {
  return (
    <div>
      <h2 className="text-[18px] font-bold mb-5" style={{ color: 'var(--ds-text-primary)' }}>
        الوصول السريع
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {QUICK_ACCESS.map((item) => (
          <Link key={item.to} to={item.to}>
            <GlassPanel padding="md" hover className="cursor-pointer relative">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                style={{ background: 'var(--ds-surface-2)' }}
              >
                <item.icon size={20} strokeWidth={1.5} style={{ color: 'var(--ds-accent-primary)' }} />
              </div>
              <p className="text-[14px] font-medium" style={{ color: 'var(--ds-text-primary)' }}>
                {item.label}
              </p>

              {/* Conditional badge for assignments */}
              {item.badgeKey === 'assignments' && pendingAssignments > 0 && (
                <span
                  className="absolute top-3 left-3 min-w-[20px] h-5 flex items-center justify-center rounded-full text-[11px] font-bold px-1.5"
                  style={{
                    background: 'var(--ds-accent-primary)',
                    color: 'var(--ds-text-inverse)',
                  }}
                >
                  {pendingAssignments}
                </span>
              )}
            </GlassPanel>
          </Link>
        ))}
      </div>
    </div>
  )
}
