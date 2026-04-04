import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FileEdit, Users, ChevronDown, CheckCircle, Clock, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const TASK_TYPE_LABELS = {
  paragraph: 'فقرة',
  essay: 'مقال',
  letter: 'رسالة',
  email: 'بريد إلكتروني',
  story: 'قصة',
  summary: 'ملخص',
}

export default function InteractiveWritingTab({ unitId, students = [] }) {
  const [activeTask, setActiveTask] = useState(0)

  const { data: writingTasks, isLoading } = useQuery({
    queryKey: ['unit-writing', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_writing')
        .select('*')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
  })

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
        <div className="h-32 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
        ))}
      </div>
    )
  }

  if (!writingTasks?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <FileEdit size={40} className="text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد كتابة لهذه الوحدة بعد</p>
      </div>
    )
  }

  const task = writingTasks[activeTask]

  return (
    <div className="space-y-5">
      {writingTasks.length > 1 && (
        <div className="flex gap-2">
          {writingTasks.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActiveTask(i)}
              className={`px-4 h-9 rounded-xl text-xs font-bold border transition-colors font-['Tajawal'] flex-shrink-0 ${
                activeTask === i
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              المهمة {i + 1}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={task.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <WritingTaskContent task={task} unitId={unitId} students={students} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function WritingTaskContent({ task, unitId, students }) {
  const [expandedStudent, setExpandedStudent] = useState(null)

  // Fetch student progress
  const { data: studentProgress } = useQuery({
    queryKey: ['ic-writing-progress', task.id, students.map(s => s.user_id).sort().join()],
    queryFn: async () => {
      const studentIds = students.map(s => s.user_id)
      if (!studentIds.length) return []
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, answers, score, status, completed_at, trainer_feedback, trainer_grade, ai_feedback')
        .eq('writing_id', task.id)
        .eq('section_type', 'writing')
        .in('student_id', studentIds)
      return data || []
    },
    enabled: !!task?.id && students.length > 0,
    staleTime: 30000,
  })

  const progressMap = useMemo(() => {
    const map = {}
    studentProgress?.forEach(p => { map[p.student_id] = p })
    return map
  }, [studentProgress])

  const submittedCount = studentProgress?.filter(p => p.status === 'completed').length || 0
  const inProgressCount = studentProgress?.filter(p => p.status === 'in_progress').length || 0

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.15)' }}>
          <Users size={16} className="text-sky-400" />
          <span className="text-sm font-medium text-sky-400 font-['Tajawal']">{submittedCount}/{students.length} سلّموا</span>
        </div>
        {inProgressCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <span className="text-xs font-medium text-amber-400 font-['Tajawal']">{inProgressCount} قيد الكتابة</span>
          </div>
        )}
      </div>

      {/* Task info */}
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          {task.task_type && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-purple-500/15 text-purple-400 border-purple-500/30 font-['Tajawal']">
              {TASK_TYPE_LABELS[task.task_type] || task.task_type}
            </span>
          )}
          {task.word_count_min && task.word_count_max && (
            <span className="text-[10px] text-[var(--text-muted)] font-['Tajawal']">
              {task.word_count_min}-{task.word_count_max} كلمة
            </span>
          )}
        </div>
        <p className="text-sm sm:text-[15px] font-medium text-[var(--text-primary)] font-['Inter'] leading-relaxed" dir="ltr">{task.prompt_en}</p>
        {task.prompt_ar && <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{task.prompt_ar}</p>}
      </div>

      {/* Student submissions */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">إجابات الطلاب</h3>

        <div className="space-y-2">
          {students.map(student => {
            const progress = progressMap[student.user_id]
            const draft = progress?.answers?.draft || ''
            const wordCount = progress?.answers?.wordCount || 0
            const isCompleted = progress?.status === 'completed'
            const isInProgress = progress?.status === 'in_progress'
            const isExpanded = expandedStudent === student.user_id

            return (
              <div
                key={student.user_id}
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
              >
                <button
                  onClick={() => draft && setExpandedStudent(isExpanded ? null : student.user_id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${draft ? 'hover:bg-[rgba(255,255,255,0.02)] cursor-pointer' : 'cursor-default'}`}
                >
                  {/* Status */}
                  {isCompleted ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.15)' }}>
                      <CheckCircle size={13} style={{ color: '#22c55e' }} />
                    </div>
                  ) : isInProgress ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
                      <FileEdit size={13} style={{ color: '#f59e0b' }} />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(100,116,139,0.15)' }}>
                      <Clock size={13} style={{ color: '#64748b' }} />
                    </div>
                  )}

                  {/* Name */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8' }}>
                      {student.avatar_url ? <img src={student.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" /> : student.full_name?.charAt(0) || '?'}
                    </div>
                    <span className="text-sm text-[var(--text-primary)] font-['Tajawal'] truncate">{student.full_name}</span>
                  </div>

                  {/* Info */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {wordCount > 0 && <span className="text-[10px] text-[var(--text-muted)] font-['Tajawal']">{wordCount} كلمة</span>}
                    {progress?.trainer_grade && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400">
                        <Star size={10} /> {progress.trainer_grade}
                      </span>
                    )}
                    {!progress && <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">لم تبدأ</span>}
                    {draft && <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                  </div>
                </button>

                {/* Expanded: full text + feedback */}
                <AnimatePresence>
                  {isExpanded && draft && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        {/* Draft text */}
                        <div className="pt-3">
                          <p className="text-sm text-[var(--text-secondary)] font-['Inter'] leading-relaxed whitespace-pre-wrap" dir="ltr">
                            {draft}
                          </p>
                        </div>

                        {/* Trainer feedback */}
                        {progress?.trainer_feedback && (
                          <div className="p-3 rounded-lg" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                            <p className="text-[10px] font-bold text-amber-400 font-['Tajawal'] mb-1">ملاحظات المدربة</p>
                            <p className="text-xs text-[var(--text-secondary)] font-['Tajawal']">{progress.trainer_feedback}</p>
                          </div>
                        )}

                        {/* AI feedback summary */}
                        {progress?.ai_feedback && (
                          <div className="p-3 rounded-lg" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)' }}>
                            <p className="text-[10px] font-bold text-purple-400 font-['Tajawal'] mb-1">تقييم الذكاء الاصطناعي</p>
                            <p className="text-xs text-[var(--text-secondary)] font-['Tajawal']">
                              {progress.ai_feedback.overall_score != null
                                ? `الدرجة الإجمالية: ${progress.ai_feedback.overall_score}/100`
                                : 'تم التقييم'}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
