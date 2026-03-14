import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardCheck, X, Save, Loader2, CheckCircle2, Clock, Star,
  Mic, BookOpen, PenLine, Headphones, RefreshCw, Filter, ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { GRADE_LABELS } from '../../lib/constants'
import { formatDateAr, timeAgo } from '../../utils/dateHelpers'

// ─── Task Type Config ──────────────────────────────────────
const TYPE_CONFIG = {
  speaking:        { icon: Mic,       label: 'تحدث',        color: 'sky' },
  reading:         { icon: BookOpen,  label: 'قراءة',       color: 'emerald' },
  writing:         { icon: PenLine,   label: 'كتابة',       color: 'violet' },
  listening:       { icon: Headphones, label: 'استماع',      color: 'amber' },
  irregular_verbs: { icon: RefreshCw, label: 'أفعال شاذة',  color: 'rose' },
}

// ─── Grade Helpers ─────────────────────────────────────────
function numericToLetter(score) {
  if (score >= 95) return 'A+'
  if (score >= 90) return 'A'
  if (score >= 85) return 'B+'
  if (score >= 80) return 'B'
  if (score >= 75) return 'C+'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

const GRADE_OPTIONS = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']

export default function TrainerWeeklyGrading() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()

  const [selectedGroup, setSelectedGroup] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('needs_review')
  const [selectedTask, setSelectedTask] = useState(null)

  const isAdmin = profile?.role === 'admin'

  // ─── Trainer's groups ──────────────────────────────────
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups'],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code')
      if (profile.role !== 'admin') query = query.eq('trainer_id', profile.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  // ─── Weekly task submissions ───────────────────────────
  const { data: submissions, isLoading } = useQuery({
    queryKey: ['weekly-submissions', selectedGroup, filterType, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('weekly_tasks')
        .select('*, students:student_id(profiles(full_name, display_name))')
        .in('status', filterStatus === 'needs_review' ? ['submitted'] : ['submitted', 'graded'])
        .order('submitted_at', { ascending: false })

      if (filterType) query = query.eq('type', filterType)

      // Filter by group
      if (selectedGroup) {
        const { data: studentIds } = await supabase
          .from('students')
          .select('id')
          .eq('group_id', selectedGroup)
        if (studentIds) {
          query = query.in('student_id', studentIds.map(s => s.id))
        }
      } else if (!isAdmin) {
        // Trainer sees only their group students
        const groupIds = groups?.map(g => g.id) || []
        if (groupIds.length === 0) return []
        const { data: studentIds } = await supabase
          .from('students')
          .select('id')
          .in('group_id', groupIds)
        if (studentIds) {
          query = query.in('student_id', studentIds.map(s => s.id))
        }
      }

      const { data } = await query.limit(50)
      return data || []
    },
    enabled: !!groups,
  })

  // ─── Stats ─────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!submissions) return { pending: 0, graded: 0, avgScore: 0 }
    const pending = submissions.filter(s => s.status === 'submitted').length
    const graded = submissions.filter(s => s.status === 'graded').length
    const gradedWithScore = submissions.filter(s => s.status === 'graded' && s.trainer_grade_numeric != null)
    const avgScore = gradedWithScore.length > 0
      ? Math.round(gradedWithScore.reduce((sum, s) => sum + s.trainer_grade_numeric, 0) / gradedWithScore.length)
      : 0
    return { pending, graded, avgScore }
  }, [submissions])

  function getStudentName(task) {
    return task.students?.profiles?.display_name || task.students?.profiles?.full_name || 'طالب'
  }

  return (
    <div className="space-y-12">
      {/* ─── Header ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <ClipboardCheck size={22} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-page-title">تقييم المهام الأسبوعية</h1>
            <p className="text-muted text-sm mt-0.5">مراجعة وتقييم مهام الطلاب الأسبوعية</p>
          </div>
        </div>
      </div>

      {/* ─── Filters ────────────────────────────────────── */}
      <div className="glass-card p-7">
        <div className="flex items-center gap-2 mb-3 text-sm text-muted">
          <Filter size={14} />
          <span>تصفية</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Group selector */}
          <div className="relative">
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="input-field text-sm pr-8 pl-3 py-2 min-w-[160px] appearance-none"
            >
              <option value="">كل المجموعات</option>
              {groups?.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>

          {/* Task type filter */}
          <div className="relative">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="input-field text-sm pr-8 pl-3 py-2 min-w-[140px] appearance-none"
            >
              <option value="">كل الأنواع</option>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            {[
              { key: 'needs_review', label: 'بانتظار التقييم' },
              { key: 'all', label: 'الكل' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  filterStatus === tab.key
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Stats Row ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Clock size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-muted">بانتظار المراجعة</p>
              <p className="text-2xl font-bold text-white">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted">تم التقييم هذا الأسبوع</p>
              <p className="text-2xl font-bold text-white">{stats.graded}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Star size={20} className="text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-muted">متوسط الدرجات</p>
              <p className="text-2xl font-bold text-white">{stats.avgScore > 0 ? `${stats.avgScore}%` : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Submissions List ───────────────────────────── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-24 w-full rounded-2xl" />)}
        </div>
      ) : submissions?.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={24} className="text-emerald-400" />
          </div>
          <p className="text-muted">
            {filterStatus === 'needs_review' ? 'لا توجد مهام بانتظار التقييم' : 'لا توجد مهام'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions?.map((task, i) => {
            const typeInfo = TYPE_CONFIG[task.type] || TYPE_CONFIG.writing
            const TypeIcon = typeInfo.icon

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-7 cursor-pointer hover:border-sky-500/20 hover:translate-y-[-2px] transition-all duration-200"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-8 h-8 rounded-xl bg-${typeInfo.color}-500/10 flex items-center justify-center shrink-0`}>
                        <TypeIcon size={16} className={`text-${typeInfo.color}-400`} />
                      </div>
                      <h3 className="text-sm font-medium text-white truncate">
                        {task.title || typeInfo.label}
                      </h3>
                      <span className={`badge-${typeInfo.color}`}>{typeInfo.label}</span>
                      {task.status === 'graded' && (
                        <span className="badge-green">تم التقييم</span>
                      )}
                      {task.status === 'submitted' && (
                        <span className="badge-yellow">بانتظار التقييم</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted mt-2">
                      <span className="text-gradient font-medium">{getStudentName(task)}</span>
                      {task.submitted_at && <span>{timeAgo(task.submitted_at)}</span>}
                    </div>
                  </div>

                  {task.auto_score != null && (
                    <div className="text-center shrink-0">
                      <p className="text-xs text-muted mb-0.5">AI</p>
                      <p className="text-xl font-bold text-sky-400">{task.auto_score}%</p>
                    </div>
                  )}

                  {task.trainer_grade_numeric != null && (
                    <div className="text-center shrink-0 mr-2">
                      <p className="text-xs text-muted mb-0.5">التقييم</p>
                      <p className="text-xl font-bold text-emerald-400">{task.trainer_grade_numeric}%</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ─── Grading Modal ──────────────────────────────── */}
      <AnimatePresence>
        {selectedTask && (
          <GradingModal
            task={selectedTask}
            getStudentName={getStudentName}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Grading Modal Component ─────────────────────────────────
function GradingModal({ task, getStudentName, onClose }) {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()

  const [grade, setGrade] = useState(task.trainer_grade || '')
  const [gradeNumeric, setGradeNumeric] = useState(task.trainer_grade_numeric ?? '')
  const [feedback, setFeedback] = useState(task.trainer_feedback || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const typeInfo = TYPE_CONFIG[task.type] || TYPE_CONFIG.writing
  const TypeIcon = typeInfo.icon

  // ─── Grade mutation ────────────────────────────────────
  const gradeMutation = useMutation({
    mutationFn: async ({ taskId, grade: g, gradeNumeric: gn, feedback: fb }) => {
      const { error } = await supabase
        .from('weekly_tasks')
        .update({
          status: 'graded',
          trainer_grade: g,
          trainer_grade_numeric: gn,
          trainer_feedback: fb,
          trainer_graded_at: new Date().toISOString(),
          trainer_graded_by: profile.id,
        })
        .eq('id', taskId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-submissions'] })
      setSuccess('تم حفظ التقييم بنجاح')
      setTimeout(() => onClose(), 800)
    },
    onError: (err) => {
      setError(err.message || 'حدث خطأ أثناء الحفظ')
    },
  })

  function handleSave() {
    setError('')
    if (!grade) { setError('اختر التقدير'); return }
    if (gradeNumeric === '' || gradeNumeric === null) { setError('أدخل الدرجة الرقمية'); return }
    const num = parseInt(gradeNumeric)
    if (isNaN(num) || num < 0 || num > 100) { setError('الدرجة الرقمية يجب أن تكون بين 0 و 100'); return }

    gradeMutation.mutate({
      taskId: task.id,
      grade,
      gradeNumeric: num,
      feedback: feedback.trim(),
    })
  }

  function handleApproveAI() {
    setError('')
    if (task.auto_score == null) { setError('لا يوجد تقييم AI لهذه المهمة'); return }

    const aiNumeric = Math.round(task.auto_score)
    const aiLetter = numericToLetter(aiNumeric)
    // Convert AI feedback object to readable text for trainer_feedback column
    const fb = task.ai_feedback || {}
    const aiFeedbackText = typeof fb === 'object'
      ? [
          ...(fb.suggestions || []),
          fb.pronunciation_notes ? `ملاحظات النطق: ${fb.pronunciation_notes}` : '',
          fb.corrected_text ? `النص المصحح: ${fb.corrected_text}` : '',
        ].filter(Boolean).join('\n')
      : String(fb)

    gradeMutation.mutate({
      taskId: task.id,
      grade: aiLetter,
      gradeNumeric: aiNumeric,
      feedback: aiFeedbackText,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="glass-card-raised w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${typeInfo.color}-500/10 flex items-center justify-center`}>
              <TypeIcon size={20} className={`text-${typeInfo.color}-400`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{task.title || typeInfo.label}</h2>
              <p className="text-sm text-muted">{getStudentName(task)}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Task info badges */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <span className={`badge-${typeInfo.color}`}>{typeInfo.label}</span>
          {task.submitted_at && (
            <span className="badge-blue text-xs">{formatDateAr(task.submitted_at)}</span>
          )}
          {task.auto_score != null && (
            <span className="badge-sky text-xs">AI: {task.auto_score}%</span>
          )}
        </div>

        {/* ─── Student Response ────────────────────────── */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-white/80">إجابة الطالب</h3>

          {/* Text response */}
          {task.response_text && (
            <div className="glass-card p-4">
              <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap" dir="ltr">
                {task.response_text}
              </p>
            </div>
          )}

          {/* Audio response (speaking) */}
          {task.response_voice_url && (
            <audio controls src={task.response_voice_url} className="w-full mt-2" />
          )}
          {task.response_voice_transcript && (
            <div className="glass-card p-4 mt-3">
              <p className="text-xs text-muted mb-1">النص المفرّغ:</p>
              <p className="text-sm text-white/90 leading-relaxed" dir="ltr">
                {task.response_voice_transcript}
              </p>
            </div>
          )}

          {/* MCQ answers */}
          {task.response_answers && Array.isArray(task.response_answers) && (
            <div className="glass-card p-4">
              <p className="text-xs text-muted mb-2">الإجابات:</p>
              <div className="space-y-2">
                {task.response_answers.map((answer, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs text-muted shrink-0" style={{ background: 'var(--color-bg-surface-raised)' }}>
                      {idx + 1}
                    </span>
                    <span className="text-white/90" dir="ltr">{typeof answer === 'object' ? JSON.stringify(answer) : answer}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── AI Feedback ─────────────────────────────── */}
        {(task.ai_feedback || task.auto_score != null) && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/80 mb-2">تقييم AI</h3>
            <div className="glass-card p-4 border border-sky-500/20 bg-sky-500/5">
              {task.auto_score != null && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sky-400 font-bold text-lg">{task.auto_score}%</span>
                  <span className="text-xs text-muted">({numericToLetter(task.auto_score)})</span>
                </div>
              )}
              {task.ai_feedback && (
                <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                  {typeof task.ai_feedback === 'object' ? (
                    <div className="space-y-2">
                      {task.ai_feedback.suggestions?.map((s, i) => (
                        <p key={i}>• {s}</p>
                      ))}
                      {task.ai_feedback.corrected_text && (
                        <div className="mt-2 p-3 rounded-lg" style={{ background: 'var(--color-bg-surface-raised)' }}>
                          <p className="text-xs text-muted mb-1">النص المصحح:</p>
                          <p dir="ltr">{task.ai_feedback.corrected_text}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>{String(task.ai_feedback)}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Grading Inputs ──────────────────────────── */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-white/80">التقييم</h3>

          <div className="grid grid-cols-2 gap-6">
            {/* Letter grade */}
            <div>
              <label className="input-label">التقدير</label>
              <div className="relative">
                <select
                  value={grade}
                  onChange={e => setGrade(e.target.value)}
                  className="input-field w-full appearance-none"
                >
                  <option value="">اختر التقدير</option>
                  {GRADE_OPTIONS.map(g => (
                    <option key={g} value={g}>
                      {g} — {GRADE_LABELS[g]?.label_ar}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              </div>
            </div>

            {/* Numeric grade */}
            <div>
              <label className="input-label">الدرجة الرقمية (0-100)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={gradeNumeric}
                onChange={e => {
                  setGradeNumeric(e.target.value)
                  // Auto-set letter grade from numeric
                  const val = parseInt(e.target.value)
                  if (!isNaN(val) && val >= 0 && val <= 100) {
                    setGrade(numericToLetter(val))
                  }
                }}
                className="input-field w-full"
                placeholder="85"
                dir="ltr"
              />
            </div>
          </div>

          {/* Trainer feedback */}
          <div>
            <label className="input-label">ملاحظات المدرب</label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              className="input-field w-full min-h-[100px] resize-y"
              placeholder="اكتب ملاحظاتك للطالب..."
              rows={4}
            />
          </div>
        </div>

        {/* ─── Error / Success ─────────────────────────── */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            {success}
          </div>
        )}

        {/* ─── Action Buttons ──────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          {task.auto_score != null && (
            <button
              onClick={handleApproveAI}
              disabled={gradeMutation.isPending}
              className="btn-secondary flex items-center gap-2"
            >
              {gradeMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              اعتماد تقييم AI
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={gradeMutation.isPending}
            className="btn-primary flex items-center gap-2"
          >
            {gradeMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ التقييم
          </button>

          <button onClick={onClose} className="btn-ghost mr-auto">
            إلغاء
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
