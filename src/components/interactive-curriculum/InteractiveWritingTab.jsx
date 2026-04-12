import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { FileEdit, Users, ChevronDown, CheckCircle, Clock, Star, ClipboardCheck, GraduationCap, Save, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { notifyUser } from '../../utils/notify'

const TASK_TYPE_LABELS = {
  paragraph: 'فقرة',
  essay: 'مقال',
  letter: 'رسالة',
  email: 'بريد إلكتروني',
  story: 'قصة',
  summary: 'ملخص',
}

const GRADE_OPTIONS = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F']

export default function InteractiveWritingTab({ unitId, students = [], highlightStudent }) {
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
          <WritingTaskContent task={task} unitId={unitId} students={students} highlightStudent={highlightStudent} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function WritingTaskContent({ task, unitId, students, highlightStudent }) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [expandedStudent, setExpandedStudent] = useState(highlightStudent || null)
  const highlightRef = useRef(null)

  // Auto-scroll to highlighted student
  useEffect(() => {
    if (highlightStudent && highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
    }
  }, [highlightStudent, studentProgress])

  const { data: studentProgress } = useQuery({
    queryKey: ['ic-writing-progress', task.id, students.map(s => s.user_id).sort().join()],
    queryFn: async () => {
      const studentIds = students.map(s => s.user_id)
      if (!studentIds.length) return []
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('student_id, answers, score, status, completed_at, trainer_feedback, trainer_grade, trainer_graded_at, ai_feedback, attempt_number')
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

  const invalidateProgress = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ic-writing-progress', task.id] })
  }, [queryClient, task.id])

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
                ref={student.user_id === highlightStudent ? highlightRef : undefined}
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--surface-raised)', border: student.user_id === highlightStudent ? '1px solid rgba(56,189,248,0.4)' : '1px solid var(--border-subtle)' }}
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
                    {progress?.ai_feedback?.overall_score != null && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400">
                        {progress.ai_feedback.overall_score}/10
                      </span>
                    )}
                    {!progress && <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">لم تبدأ</span>}
                    {draft && <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                  </div>
                </button>

                {/* Expanded: full text + AI feedback + trainer form */}
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

                        {/* AI feedback */}
                        {progress?.ai_feedback && <AIFeedbackSummary feedback={progress.ai_feedback} />}

                        {/* Trainer feedback form */}
                        <TrainerFeedbackForm
                          studentId={student.user_id}
                          writingId={task.id}
                          existingGrade={progress?.trainer_grade}
                          existingFeedback={progress?.trainer_feedback}
                          trainerId={user?.id}
                          onSaved={invalidateProgress}
                        />
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

// ─── AI Feedback Summary ─────────────────────────
function AIFeedbackSummary({ feedback }) {
  const scores = [
    { key: 'grammar_score', label: 'القواعد' },
    { key: 'vocabulary_score', label: 'المفردات' },
    { key: 'structure_score', label: 'التنظيم' },
    { key: 'fluency_score', label: 'الطلاقة' },
  ].filter(s => feedback[s.key] != null)

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.12)' }}>
      <div className="flex items-center gap-1.5">
        <ClipboardCheck size={12} className="text-purple-400" />
        <span className="text-[10px] font-bold text-purple-400 font-['Tajawal']">التقييم</span>
        {feedback.overall_score != null && (
          <span className="mr-auto text-sm font-bold tabular-nums" style={{ color: feedback.overall_score >= 8 ? '#22c55e' : feedback.overall_score >= 6 ? '#38bdf8' : '#f59e0b' }}>
            {feedback.overall_score}/10
          </span>
        )}
      </div>

      {scores.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {scores.map(s => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--text-muted)] font-['Tajawal'] w-12 flex-shrink-0">{s.label}</span>
              <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(feedback[s.key] / 10) * 100}%`,
                    background: feedback[s.key] >= 8 ? '#22c55e' : feedback[s.key] >= 6 ? '#38bdf8' : '#f59e0b',
                  }}
                />
              </div>
              <span className="text-[10px] font-bold tabular-nums text-[var(--text-primary)]">{feedback[s.key]}</span>
            </div>
          ))}
        </div>
      )}

      {feedback.overall_comment_ar && (
        <p className="text-[10px] text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed pt-1">{feedback.overall_comment_ar}</p>
      )}
      {/* Fallback for old format */}
      {!feedback.overall_comment_ar && feedback.overall_feedback_ar && (
        <p className="text-[10px] text-[var(--text-secondary)] font-['Tajawal'] leading-relaxed pt-1">{feedback.overall_feedback_ar}</p>
      )}
    </div>
  )
}

// ─── Trainer Feedback Form ───────────────────────
function TrainerFeedbackForm({ studentId, writingId, existingGrade, existingFeedback, trainerId, onSaved }) {
  const [grade, setGrade] = useState(existingGrade || '')
  const [feedback, setFeedback] = useState(existingFeedback || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSave = async () => {
    if (!grade) return
    setSaving(true)
    setSaved(false)

    const { error } = await supabase
      .from('student_curriculum_progress')
      .update({
        trainer_grade: grade,
        trainer_feedback: feedback || null,
        trainer_graded_at: new Date().toISOString(),
        trainer_graded_by: trainerId,
      })
      .eq('student_id', studentId)
      .eq('writing_id', writingId)

    if (error) {
      console.error('Failed to save trainer feedback:', error)
    } else {
      // Notify student (in-app + push)
      await notifyUser({
        userId: studentId,
        title: 'تم تقييم كتابتك',
        body: `قيّم المعلم مهمة الكتابة — التقدير: ${grade}`,
        type: 'writing_graded',
        data: { writing_id: writingId, grade },
      })
      setSaved(true)
      onSaved?.()
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2.5"
      >
        <div className="flex items-center gap-1.5">
          <GraduationCap size={13} className="text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400 font-['Tajawal']">تقييم المعلم</span>
          {existingGrade && <span className="text-[10px] font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10">{existingGrade}</span>}
        </div>
        <ChevronDown size={13} className={`text-[var(--text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pb-1">
              {/* Grade */}
              <div>
                <label className="text-[10px] text-[var(--text-muted)] font-['Tajawal'] mb-1 block">التقدير</label>
                <div className="flex gap-1.5 flex-wrap">
                  {GRADE_OPTIONS.map(g => (
                    <button
                      key={g}
                      onClick={() => setGrade(g)}
                      className={`px-3 h-8 rounded-lg text-xs font-bold border transition-colors ${
                        grade === g
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-[var(--surface-base)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback text */}
              <div>
                <label className="text-[10px] text-[var(--text-muted)] font-['Tajawal'] mb-1 block">ملاحظة (اختياري)</label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-xs font-['Tajawal'] resize-none outline-none"
                  style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                  placeholder="اكتب ملاحظتك هنا..."
                />
              </div>

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={!grade || saving}
                className="flex items-center gap-1.5 px-4 h-9 rounded-lg text-xs font-bold font-['Tajawal'] transition-colors disabled:opacity-40 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle size={13} /> : <Save size={13} />}
                {saving ? 'جاري الحفظ...' : saved ? 'تم الحفظ' : 'حفظ التقييم'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
