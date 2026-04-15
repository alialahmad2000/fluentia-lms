import { motion, useReducedMotion } from 'framer-motion'
import { CalendarClock, CalendarDays, CheckCircle2, Circle } from 'lucide-react'
import { Link } from 'react-router-dom'
import GlassPanel from '../../../../design-system/components/GlassPanel'

const TASK_TYPE_ICONS = {
  vocabulary: '📝', grammar: '📖', reading: '📚', listening: '🎧',
  writing: '✍️', speaking: '🎤', pronunciation: '🗣️',
}

// Skeleton
export function WeeklyTasksSkeleton() {
  return (
    <GlassPanel padding="md">
      <div className="space-y-3 animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg" style={{ background: 'var(--ds-surface-2)' }} />
          <div className="h-4 w-32 rounded" style={{ background: 'var(--ds-surface-2)' }} />
        </div>
        <div className="h-2 w-full rounded-full" style={{ background: 'var(--ds-surface-2)' }} />
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 w-32 rounded-xl" style={{ background: 'var(--ds-surface-2)' }} />
          ))}
        </div>
      </div>
    </GlassPanel>
  )
}

// Empty state — always shown when no weekly tasks exist
function WeeklyTasksEmpty() {
  return (
    <GlassPanel padding="md">
      <div className="flex flex-col items-center text-center py-6 gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{
            background: 'var(--ds-surface-2)',
            boxShadow: '0 0 20px var(--ds-accent-primary-glow)',
          }}
        >
          <CalendarClock size={24} style={{ color: 'var(--ds-accent-primary)' }} />
        </div>
        <p
          className="text-sm font-medium leading-relaxed max-w-xs"
          style={{ color: 'var(--ds-text-secondary)' }}
        >
          مهام الأسبوع تُحضّر حالياً — تابع التقدم اليومي في هذه الأثناء
        </p>
      </div>
    </GlassPanel>
  )
}

export default function WeeklyTasksWidget({ weeklyProgress, weeklyTasks, loading }) {
  const reducedMotion = useReducedMotion()

  if (loading) return <WeeklyTasksSkeleton />
  if (!weeklyProgress) return <WeeklyTasksEmpty />

  return (
    <GlassPanel padding="md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--ds-surface-2)' }}
          >
            <CalendarDays size={16} strokeWidth={1.5} style={{ color: 'var(--ds-accent-primary)' }} />
          </div>
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
            المهام الأسبوعية
          </h3>
          <span className="text-xs font-data" style={{ color: 'var(--ds-text-tertiary)' }}>
            {weeklyProgress.completed_tasks}/{weeklyProgress.total_tasks}
          </span>
          {weeklyProgress.status === 'completed' && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--ds-surface-2)',
                color: 'var(--ds-accent-success)',
              }}
            >
              مكتمل
            </span>
          )}
        </div>
        <Link
          to="/student/weekly-tasks"
          className="text-[12px] font-medium min-h-[44px] flex items-center"
          style={{ color: 'var(--ds-accent-primary)' }}
        >
          عرض الكل ←
        </Link>
      </div>

      {/* Progress bar */}
      <div
        className="rounded-full overflow-hidden mb-3"
        style={{ height: 6, background: 'var(--ds-surface-2)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--ds-accent-primary)' }}
          initial={{ width: 0 }}
          animate={{ width: `${weeklyProgress.completion_percentage || 0}%` }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Horizontal task cards */}
      {weeklyTasks?.length > 0 && (
        <div
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {weeklyTasks.map((task) => (
            <Link
              key={task.id}
              to={`/student/weekly-tasks/${task.id}`}
              className="flex-shrink-0 w-[140px] p-3 rounded-xl transition-all duration-200"
              style={{
                scrollSnapAlign: 'start',
                background: 'var(--ds-surface-1)',
                border: '1px solid var(--ds-border-subtle)',
                minHeight: 44,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg">{TASK_TYPE_ICONS[task.type] || '📋'}</span>
                {task.status === 'completed' || task.status === 'graded' ? (
                  <CheckCircle2 size={16} strokeWidth={1.5} style={{ color: 'var(--ds-accent-success)' }} />
                ) : (
                  <Circle size={16} strokeWidth={1.5} style={{ color: 'var(--ds-text-tertiary)' }} />
                )}
              </div>
              <p className="text-[12px] font-medium truncate" style={{ color: 'var(--ds-text-primary)' }}>
                {task.title || task.type}
              </p>
              <p className="text-[10px] mt-0.5 capitalize" style={{ color: 'var(--ds-text-tertiary)' }}>
                {task.type}
              </p>
            </Link>
          ))}
        </div>
      )}
    </GlassPanel>
  )
}
