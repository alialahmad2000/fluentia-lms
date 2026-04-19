import { useNavigate } from 'react-router-dom'
import { useMarkWeeklyTaskComplete } from '@/hooks/ielts/useAdaptivePlan'
import { GlassPanel } from '@/design-system/components'

const DAY_LABELS = {
  sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت',
}
const DAY_ORDER = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const TASK_COLOR = {
  reading: '#38bdf8',
  listening: '#a78bfa',
  writing: '#34d399',
  speaking: '#f472b6',
  mock: '#fb923c',
  errors: '#fbbf24',
  diagnostic: '#94a3b8',
}

function TaskChip({ task, dayKey, taskIndex, studentId, onNavigate }) {
  const toggleMut = useMarkWeeklyTaskComplete()
  const color = TASK_COLOR[task.task_type] || '#94a3b8'
  const done = task.completed === true

  return (
    <div
      style={{
        padding: '8px 12px', borderRadius: 10, marginBottom: 6,
        background: done ? 'rgba(74,222,128,0.07)' : `${color}14`,
        border: `1px solid ${done ? 'rgba(74,222,128,0.25)' : color + '30'}`,
        display: 'flex', alignItems: 'flex-start', gap: 8,
        opacity: done ? 0.65 : 1,
      }}
    >
      {/* Completion toggle */}
      <button
        onClick={() => toggleMut.mutate({ studentId, dayKey, taskIndex })}
        style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
          background: done ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.06)',
          border: done ? '1.5px solid rgba(74,222,128,0.5)' : `1.5px solid ${color}50`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#4ade80',
        }}
      >
        {done ? '✓' : ''}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, color: done ? 'var(--text-tertiary)' : 'var(--text-primary)', fontFamily: 'Tajawal', lineHeight: 1.5, textDecoration: done ? 'line-through' : 'none', marginBottom: 2 }}>
          {task.description_ar}
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color, fontFamily: 'Tajawal' }}>{task.duration_min} دقيقة</span>
          {task.target_lab_route && !done && (
            <button
              onClick={() => onNavigate(task.target_lab_route)}
              style={{ fontSize: 10, color, fontFamily: 'Tajawal', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ابدأ ←
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function WeekScheduleGrid({ weeklySchedule, studentId }) {
  const navigate = useNavigate()
  const todayKey = DAY_ORDER[new Date().getDay()]

  if (!weeklySchedule) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }} dir="rtl">
      {DAY_ORDER.map(day => {
        const tasks = weeklySchedule[day] || []
        const isToday = day === todayKey
        const allDone = tasks.length > 0 && tasks.every(t => t.completed)
        return (
          <GlassPanel
            key={day}
            style={{
              padding: 14,
              border: isToday ? '1.5px solid rgba(56,189,248,0.35)' : '1px solid rgba(255,255,255,0.06)',
              background: isToday ? 'rgba(56,189,248,0.04)' : undefined,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: isToday ? '#38bdf8' : 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
                {DAY_LABELS[day]}
              </p>
              {isToday && (
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontFamily: 'Tajawal' }}>اليوم</span>
              )}
              {allDone && (
                <span style={{ fontSize: 14 }}>✅</span>
              )}
            </div>
            {tasks.length === 0 ? (
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', textAlign: 'center', padding: '8px 0' }}>راحة</p>
            ) : (
              tasks.map((task, i) => (
                <TaskChip
                  key={i}
                  task={task}
                  dayKey={day}
                  taskIndex={i}
                  studentId={studentId}
                  onNavigate={navigate}
                />
              ))
            )}
          </GlassPanel>
        )
      })}
    </div>
  )
}
