import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Clock, FileText } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { GlassPanel } from '@/design-system/components'
import { useWritingTasks, useWritingSubmissions } from '@/hooks/ielts/useWritingLab'

const CATEGORY_META = {
  'task1-academic': { icon: '📊', label_ar: 'Task 1 Academic', subtitle_ar: 'وصف الرسوم البيانية', minWords: 150 },
  'task1-gt': { icon: '✉️', label_ar: 'Task 1 General Training', subtitle_ar: 'كتابة الرسائل', minWords: 150 },
  'task2': { icon: '📝', label_ar: 'Task 2', subtitle_ar: 'مقال رأي', minWords: 250 },
}

const SUB_TYPE_LABELS = {
  bar_chart: 'Bar Chart', line_graph: 'Line Graph', pie_chart: 'Pie Chart',
  table: 'Table', process: 'Process Diagram', map: 'Map', mixed: 'Mixed Charts',
  opinion: 'Opinion Essay', discussion: 'Discussion Essay', problem_solution: 'Problem-Solution',
  advantage_disadvantage: 'Advantages & Disadvantages',
}

const DIFFICULTY_LABELS = {
  '5.5-6.5': { label: '5.5–6.5', color: '#38bdf8' },
  '6.0-7.0': { label: '6.0–7.0', color: '#a78bfa' },
  '6.5-7.5': { label: '6.5–7.5', color: '#4ade80' },
}

function TaskCard({ task, hasDraft, onClick }) {
  const diff = DIFFICULTY_LABELS[task.difficulty_band] || { label: task.difficulty_band || '—', color: 'var(--text-tertiary)' }
  return (
    <GlassPanel
      hover
      style={{ padding: 20, cursor: 'pointer' }}
      onClick={onClick}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 4 }}>
            {task.title}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {task.sub_type && (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'sans-serif' }}>
                {SUB_TYPE_LABELS[task.sub_type] || task.sub_type}
              </span>
            )}
            {task.difficulty_band && (
              <span style={{ fontSize: 11, color: diff.color, fontFamily: 'sans-serif', fontWeight: 600 }}>
                Band {diff.label}
              </span>
            )}
          </div>
        </div>
        {hasDraft && (
          <span style={{ fontSize: 11, color: '#fb923c', fontFamily: 'Tajawal', background: 'rgba(251,146,60,0.12)', padding: '3px 8px', borderRadius: 6, flexShrink: 0, marginRight: 8 }}>
            مسودة محفوظة
          </span>
        )}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'sans-serif', direction: 'ltr', textAlign: 'left', lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {task.prompt}
      </p>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', display: 'flex', alignItems: 'center', gap: 4 }}>
          <FileText size={11} /> {task.word_count_target}+ كلمة
        </span>
        {task.time_limit_minutes && (
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'Tajawal', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={11} /> {task.time_limit_minutes} دقيقة
          </span>
        )}
        <span style={{ marginRight: 'auto', fontSize: 12, color: hasDraft ? '#fb923c' : '#38bdf8', fontFamily: 'Tajawal', fontWeight: 700 }}>
          {hasDraft ? 'استكمال المسودة ←' : 'ابدأ الكتابة ←'}
        </span>
      </div>
    </GlassPanel>
  )
}

export default function WritingTaskPicker() {
  const { category } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const studentId = profile?.id

  const tasksQ = useWritingTasks()
  const submissionsQ = useWritingSubmissions(studentId, 50)

  const meta = CATEGORY_META[category]
  if (!meta) return null

  const allTasks = tasksQ.data || { task1_academic: [], task1_gt: [], task2: [] }
  const tasks = category === 'task1-academic' ? allTasks.task1_academic
    : category === 'task1-gt' ? allTasks.task1_gt
    : allTasks.task2

  // Find tasks with existing drafts (unevaluated submissions)
  // We just show "draft saved" pill based on submissions list for now
  const draftSourceIds = new Set(
    (submissionsQ.data || [])
      .filter(s => !s.evaluated_at)
      .map(s => s.source_id)
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}
      dir="rtl"
    >
      <button
        onClick={() => navigate('/student/ielts/writing')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'Tajawal', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}
      >
        <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
        معمل الكتابة
      </button>

      <GlassPanel elevation={2} style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>{meta.icon}</span>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 2 }}>
              {meta.label_ar}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>{meta.subtitle_ar}</p>
          </div>
        </div>
      </GlassPanel>

      {tasks.length === 0 ? (
        <GlassPanel style={{ padding: 32, textAlign: 'center', opacity: 0.7 }}>
          <p style={{ fontSize: 26, marginBottom: 12 }}>🚧</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Tajawal', marginBottom: 6 }}>
            لا توجد مهام منشورة بعد
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'Tajawal' }}>
            قريباً سيتم إضافة مهام لهذه الفئة
          </p>
        </GlassPanel>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              hasDraft={draftSourceIds.has(task.id)}
              onClick={() => navigate(`/student/ielts/writing/${category}/task/${task.id}`)}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
