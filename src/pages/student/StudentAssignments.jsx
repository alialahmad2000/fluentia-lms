import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, CheckCircle2, AlertCircle, FileText, ExternalLink, Youtube, CalendarDays } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { ASSIGNMENT_TYPES, SUBMISSION_STATUS } from '../../lib/constants'
import { deadlineText, isOverdue, formatDateAr } from '../../utils/dateHelpers'
import SubmissionForm from '../../components/assignments/SubmissionForm'
import StudentFeedbackDisplay from '../../components/StudentFeedbackDisplay'

export default function StudentAssignments() {
  const { profile, studentData } = useAuthStore()
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [filter, setFilter] = useState('all') // all, pending, submitted, graded

  // Assignments for student's group
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['student-assignments', studentData?.group_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('assignments')
        .select('*')
        .eq('group_id', studentData?.group_id)
        .eq('is_visible', true)
        .is('deleted_at', null)
        .order('deadline', { ascending: true, nullsFirst: false })
      return data || []
    },
    enabled: !!studentData?.group_id,
  })

  // Student's submissions
  const { data: submissions } = useQuery({
    queryKey: ['student-submissions', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', profile?.id)
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Weekly tasks summary
  const { data: weeklyTasksInfo } = useQuery({
    queryKey: ['weekly-tasks-summary', profile?.id],
    queryFn: async () => {
      // Get current week Sunday
      const now = new Date()
      const sunday = new Date(now)
      sunday.setDate(now.getDate() - now.getDay())
      sunday.setHours(0, 0, 0, 0)

      const { data: taskSet } = await supabase
        .from('weekly_task_sets')
        .select('id, total_tasks, completed_tasks, status')
        .eq('student_id', profile?.id)
        .gte('week_start', sunday.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!taskSet) return null

      const { data: tasks } = await supabase
        .from('weekly_tasks')
        .select('id, type, title, status, auto_score')
        .eq('task_set_id', taskSet.id)
        .order('type')

      return { ...taskSet, tasks: tasks || [] }
    },
    enabled: !!profile?.id,
  })

  // Map submissions by assignment_id
  const submissionMap = {}
  for (const s of submissions || []) {
    submissionMap[s.assignment_id] = s
  }

  // Filter assignments
  const filtered = (assignments || []).filter(a => {
    const sub = submissionMap[a.id]
    if (filter === 'pending') return !sub || sub.status === 'draft' || sub.status === 'resubmit_requested'
    if (filter === 'submitted') return sub?.status === 'submitted'
    if (filter === 'graded') return sub?.status === 'graded'
    return true
  })

  if (!studentData?.group_id) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-muted">لم يتم تسجيلك في مجموعة بعد — تواصل مع الإدارة</p>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title">الواجبات</h1>
        <p className="text-muted text-sm mt-1">واجبات مجموعتك</p>
      </motion.div>

      {/* Weekly tasks banner */}
      {weeklyTasksInfo && (
        <Link to="/student/weekly-tasks" className="block">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card-raised p-7 hover:translate-y-[-2px] transition-all duration-200 border border-sky-500/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                  <CalendarDays className="text-sky-400" size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">مهامي الأسبوعية</h3>
                  <p className="text-xs text-muted mt-0.5">
                    {weeklyTasksInfo.completed_tasks}/{weeklyTasksInfo.total_tasks} مهام مكتملة
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-surface-raised)' }}>
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-sky-400 to-sky-600 transition-all duration-500"
                    style={{ width: `${Math.round((weeklyTasksInfo.completed_tasks / weeklyTasksInfo.total_tasks) * 100)}%` }}
                  />
                </div>
                <span className="badge-sky text-xs">
                  {weeklyTasksInfo.status === 'completed' ? 'مكتمل ✓' : 'جاري'}
                </span>
              </div>
            </div>
          </motion.div>
        </Link>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'الكل' },
          { key: 'pending', label: 'قيد الانتظار' },
          { key: 'submitted', label: 'تم التسليم' },
          { key: 'graded', label: 'تم التقييم' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              filter === tab.key
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Assignments list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted">
            {filter === 'all' ? 'لا توجد واجبات حالياً' : 'لا توجد واجبات في هذا التصنيف'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a, i) => {
            const typeInfo = ASSIGNMENT_TYPES[a.type] || ASSIGNMENT_TYPES.custom
            const sub = submissionMap[a.id]
            const overdue = a.deadline && isOverdue(a.deadline)
            const canSubmit = !sub || sub.status === 'draft' || sub.status === 'resubmit_requested'
            const showLateWarning = overdue && canSubmit && a.allow_late

            let statusBadge = null
            if (sub) {
              const statusInfo = SUBMISSION_STATUS[sub.status]
              const badgeColor = sub.status === 'draft' ? 'yellow' : (statusInfo?.color || 'blue')
              statusBadge = (
                <span className={`badge-${badgeColor}`}>
                  {statusInfo?.label_ar || sub.status}
                </span>
              )
            } else if (overdue && !a.allow_late) {
              statusBadge = <span className="badge-red">فات الموعد</span>
            }

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-7 hover:translate-y-[-2px] transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                        <span className="text-lg">{typeInfo.icon}</span>
                      </div>
                      <h3 className="font-medium text-white">{a.title}</h3>
                      {statusBadge}
                    </div>

                    {a.description && (
                      <p className="text-muted text-sm mt-1 line-clamp-2">{a.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted mt-3">
                      <span className="badge-blue">{typeInfo.label_ar}</span>
                      {a.deadline && (
                        <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}>
                          <Clock size={12} />
                          {deadlineText(a.deadline)}
                          {a.deadline && !overdue && (
                            <span className="text-white/40 mr-1">({formatDateAr(a.deadline)})</span>
                          )}
                        </span>
                      )}
                      <span className="flex items-center gap-1 badge-gold">
                        +{overdue ? a.points_late : a.points_on_time} XP
                      </span>
                    </div>

                    {showLateWarning && (
                      <div className="flex items-center gap-1 text-xs text-amber-400 mt-2">
                        <AlertCircle size={12} />
                        <span>التسليم متأخر — ستحصل على {a.points_late} XP فقط</span>
                      </div>
                    )}

                    {/* Links */}
                    {(a.youtube_url || a.external_link) && (
                      <div className="flex items-center gap-3 mt-3">
                        {a.youtube_url && (
                          <a href={a.youtube_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-all duration-200">
                            <Youtube size={14} /> يوتيوب
                          </a>
                        )}
                        {a.external_link && (
                          <a href={a.external_link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-all duration-200">
                            <ExternalLink size={14} /> رابط
                          </a>
                        )}
                      </div>
                    )}

                    {/* Grade display */}
                    {sub?.status === 'graded' && (
                      <div className="mt-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          <span className="text-sm font-medium text-emerald-400">
                            الدرجة: {sub.grade} ({sub.grade_numeric}%)
                          </span>
                          <span className="badge-gold text-[10px]">+{sub.points_awarded} XP</span>
                        </div>

                        {/* Show structured feedback if AI feedback was approved */}
                        {sub.ai_feedback && sub.ai_feedback_approved ? (
                          <StudentFeedbackDisplay
                            feedback={sub.ai_feedback}
                            trainerFeedback={sub.trainer_feedback}
                          />
                        ) : sub.trainer_feedback ? (
                          <p className="text-xs text-muted mt-1">{sub.trainer_feedback}</p>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Submit button */}
                  {canSubmit && (overdue ? a.allow_late : true) && (
                    <button
                      onClick={() => setSelectedAssignment(a)}
                      className="btn-primary text-sm py-2 px-4 shrink-0"
                    >
                      {sub?.status === 'draft' ? 'متابعة التسليم' : sub ? 'إعادة التسليم' : 'تسليم'}
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Submission modal */}
      <AnimatePresence>
        {selectedAssignment && (
          <SubmissionForm
            assignment={selectedAssignment}
            existingSubmission={submissionMap[selectedAssignment.id]}
            studentId={profile?.id}
            onClose={() => setSelectedAssignment(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
