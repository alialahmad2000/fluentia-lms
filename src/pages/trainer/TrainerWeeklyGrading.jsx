import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardCheck, X, Save, Loader2, CheckCircle2, Clock, Star,
  Mic, BookOpen, PenLine, Headphones, RefreshCw, Filter, ChevronDown,
  BookType, Sparkles, Award,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { GRADE_LABELS } from '../../lib/constants'
import { formatDateAr, timeAgo } from '../../utils/dateHelpers'

const TYPE_CONFIG = {
  speaking:        { icon: Mic,        label: 'تحدث',       gradient: 'from-sky-500 to-cyan-400',     bg: 'bg-sky-500/[0.08]',     text: 'text-sky-400' },
  reading:         { icon: BookOpen,   label: 'قراءة',      gradient: 'from-emerald-500 to-teal-400', bg: 'bg-emerald-500/[0.08]', text: 'text-emerald-400' },
  writing:         { icon: PenLine,    label: 'كتابة',      gradient: 'from-violet-500 to-purple-400', bg: 'bg-violet-500/[0.08]', text: 'text-violet-400' },
  listening:       { icon: Headphones, label: 'استماع',     gradient: 'from-amber-500 to-orange-400', bg: 'bg-amber-500/[0.08]',  text: 'text-amber-400' },
  irregular_verbs: { icon: RefreshCw,  label: 'أفعال شاذة', gradient: 'from-rose-500 to-pink-400',    bg: 'bg-rose-500/[0.08]',   text: 'text-rose-400' },
  vocabulary:      { icon: BookType,   label: 'مفردات',     gradient: 'from-indigo-500 to-blue-400',  bg: 'bg-indigo-500/[0.08]', text: 'text-indigo-400' },
}

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

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['weekly-submissions', selectedGroup, filterType, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('weekly_tasks')
        .select('*, students:student_id(profiles(full_name, display_name))')
        .is('deleted_at', null)
        .in('status', filterStatus === 'needs_review' ? ['submitted'] : ['submitted', 'graded'])
        .order('submitted_at', { ascending: false })

      if (filterType) query = query.eq('type', filterType)

      if (selectedGroup) {
        const { data: studentIds } = await supabase
          .from('students')
          .select('id')
          .eq('group_id', selectedGroup)
        if (studentIds) {
          query = query.in('student_id', studentIds.map(s => s.id))
        }
      } else if (!isAdmin) {
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
    <div className="space-y-8 pb-8">
      {/* ── Header ─────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500/20 to-cyan-500/10 flex items-center justify-center ring-1 ring-sky-500/20">
            <ClipboardCheck size={20} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">تقييم المهام الأسبوعية</h1>
            <p className="text-white/30 text-sm mt-0.5">مراجعة وتقييم مهام الطلاب</p>
          </div>
        </div>
      </motion.div>

      {/* ── Filters ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl border border-white/[0.06] p-5"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center gap-2 mb-3 text-xs text-white/25 font-medium">
          <Filter size={12} />
          <span>تصفية</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm px-3 py-2 min-w-[150px] text-white/70 appearance-none focus:outline-none focus:border-white/[0.12]"
            >
              <option value="">كل المجموعات</option>
              {groups?.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm px-3 py-2 min-w-[130px] text-white/70 appearance-none focus:outline-none focus:border-white/[0.12]"
            >
              <option value="">كل الأنواع</option>
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { key: 'needs_review', label: 'بانتظار التقييم' },
              { key: 'all', label: 'الكل' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === tab.key
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/15'
                    : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03] border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'بانتظار المراجعة', value: stats.pending, icon: Clock, gradient: 'from-amber-500/15 to-yellow-500/5', iconGradient: 'from-amber-500/20 to-yellow-500/10', iconColor: 'text-amber-400' },
          { label: 'تم التقييم', value: stats.graded, icon: CheckCircle2, gradient: 'from-emerald-500/15 to-teal-500/5', iconGradient: 'from-emerald-500/20 to-teal-500/10', iconColor: 'text-emerald-400' },
          { label: 'متوسط الدرجات', value: stats.avgScore > 0 ? `${stats.avgScore}%` : '—', icon: Star, gradient: 'from-violet-500/15 to-purple-500/5', iconGradient: 'from-violet-500/20 to-purple-500/10', iconColor: 'text-violet-400' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className={`rounded-2xl bg-gradient-to-br ${card.gradient} border border-white/[0.04] p-5`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.iconGradient} flex items-center justify-center`}>
                <card.icon size={18} className={card.iconColor} />
              </div>
              <div>
                <p className="text-xs text-white/30 font-medium">{card.label}</p>
                <p className="text-xl font-bold text-white mt-0.5">{card.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Submissions List ───────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.02)' }} />
          ))}
        </div>
      ) : submissions?.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] p-14 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={20} className="text-emerald-400" />
          </div>
          <p className="text-white/30 text-sm">
            {filterStatus === 'needs_review' ? 'لا توجد مهام بانتظار التقييم' : 'لا توجد مهام'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions?.map((task, i) => {
            const typeInfo = TYPE_CONFIG[task.type] || TYPE_CONFIG.writing
            const TypeIcon = typeInfo.icon

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-xl border border-white/[0.06] hover:border-white/[0.1] cursor-pointer hover:translate-y-[-1px] transition-all duration-200 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.02)' }}
                onClick={() => setSelectedTask(task)}
              >
                <div className={`h-0.5 bg-gradient-to-r ${typeInfo.gradient} opacity-30`} />
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div className={`w-7 h-7 rounded-lg ${typeInfo.bg} flex items-center justify-center shrink-0`}>
                          <TypeIcon size={14} className={typeInfo.text} />
                        </div>
                        <h3 className="text-sm font-medium text-white/80 truncate">
                          {task.title || typeInfo.label}
                        </h3>
                        {task.status === 'graded' && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-xs font-medium shrink-0">
                            تم التقييم
                          </span>
                        )}
                        {task.status === 'submitted' && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/15 text-xs font-medium shrink-0">
                            بانتظار
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/25">
                        <span className="font-medium text-white/40">{getStudentName(task)}</span>
                        {task.submitted_at && <span>{timeAgo(task.submitted_at)}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {task.auto_score != null && (
                        <div className="text-center">
                          <p className="text-xs text-white/20 mb-0.5">AI</p>
                          <p className="text-lg font-bold text-sky-400">{task.auto_score}%</p>
                        </div>
                      )}
                      {task.trainer_grade_numeric != null && (
                        <div className="text-center">
                          <p className="text-xs text-white/20 mb-0.5">المدرب</p>
                          <p className="text-lg font-bold text-emerald-400">{task.trainer_grade_numeric}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Grading Modal ──────────────────────────────── */}
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

// ─── Grading Modal ─────────────────────────────────────────────
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
    if (isNaN(num) || num < 0 || num > 100) { setError('الدرجة يجب أن تكون بين 0 و 100'); return }
    gradeMutation.mutate({ taskId: task.id, grade, gradeNumeric: num, feedback: feedback.trim() })
  }

  function handleApproveAI() {
    setError('')
    if (task.auto_score == null) { setError('لا يوجد تقييم AI'); return }
    const aiNumeric = Math.round(task.auto_score)
    const aiLetter = numericToLetter(aiNumeric)
    const fb = task.ai_feedback || {}
    const aiFeedbackText = typeof fb === 'object'
      ? [
          ...(fb.suggestions || []),
          fb.pronunciation_notes ? `ملاحظات النطق: ${fb.pronunciation_notes}` : '',
          fb.corrected_text ? `النص المصحح: ${fb.corrected_text}` : '',
        ].filter(Boolean).join('\n')
      : String(fb)
    gradeMutation.mutate({ taskId: task.id, grade: aiLetter, gradeNumeric: aiNumeric, feedback: aiFeedbackText })
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
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08]"
        style={{ background: 'linear-gradient(135deg, rgba(14,25,50,0.98) 0%, rgba(6,14,28,0.99) 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent */}
        <div className={`h-1 bg-gradient-to-r ${typeInfo.gradient}`} />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${typeInfo.bg} flex items-center justify-center`}>
                <TypeIcon size={18} className={typeInfo.text} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{task.title || typeInfo.label}</h2>
                <p className="text-xs text-white/30">{getStudentName(task)}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-all">
              <X size={16} className="text-white/40" />
            </button>
          </div>

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {task.submitted_at && (
              <span className="px-2.5 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-white/30 text-xs">
                {formatDateAr(task.submitted_at)}
              </span>
            )}
            {task.auto_score != null && (
              <span className="px-2.5 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/15 text-sky-400 text-xs font-medium">
                AI: {task.auto_score}%
              </span>
            )}
          </div>

          {/* Student Response */}
          <div className="space-y-3 mb-5">
            <h3 className="text-xs font-medium text-white/30">إجابة الطالب</h3>

            {task.response_text && (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap" dir="ltr">
                  {task.response_text}
                </p>
              </div>
            )}

            {task.response_voice_url && (
              <audio controls src={task.response_voice_url} className="w-full" />
            )}

            {task.response_voice_transcript && (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
                <p className="text-xs text-white/20 mb-1">النص المفرّغ:</p>
                <p className="text-sm text-white/60 leading-relaxed" dir="ltr">{task.response_voice_transcript}</p>
              </div>
            )}

            {task.response_answers && Array.isArray(task.response_answers) && (
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
                <p className="text-xs text-white/20 mb-2">الإجابات:</p>
                <div className="space-y-1.5">
                  {task.response_answers.map((answer, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 rounded-md bg-white/[0.04] flex items-center justify-center text-xs text-white/20 shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-white/60" dir="ltr">{typeof answer === 'object' ? JSON.stringify(answer) : answer}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI Feedback */}
          {(task.ai_feedback || task.auto_score != null) && (
            <div className="mb-5">
              <h3 className="text-xs font-medium text-white/30 mb-2">تقييم AI</h3>
              <div className="rounded-xl bg-sky-500/[0.04] border border-sky-500/10 p-4">
                {task.auto_score != null && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sky-400 font-bold text-base">{task.auto_score}%</span>
                    <span className="text-xs text-white/20">({numericToLetter(task.auto_score)})</span>
                  </div>
                )}
                {task.ai_feedback && (
                  <div className="text-sm text-white/50 leading-relaxed">
                    {typeof task.ai_feedback === 'object' ? (
                      <div className="space-y-1.5">
                        {task.ai_feedback.suggestions?.map((s, i) => (
                          <p key={i} className="text-xs">• {s}</p>
                        ))}
                        {task.ai_feedback.corrected_text && (
                          <div className="mt-2 p-3 rounded-lg bg-white/[0.03]">
                            <p className="text-xs text-white/20 mb-1">النص المصحح:</p>
                            <p className="text-xs" dir="ltr">{task.ai_feedback.corrected_text}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs">{String(task.ai_feedback)}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grading Inputs */}
          <div className="space-y-4 mb-5">
            <h3 className="text-xs font-medium text-white/30">التقييم</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/25 mb-1.5 block">التقدير</label>
                <div className="relative">
                  <select
                    value={grade}
                    onChange={e => setGrade(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white/70 appearance-none focus:outline-none focus:border-white/[0.12]"
                  >
                    <option value="">اختر</option>
                    {GRADE_OPTIONS.map(g => (
                      <option key={g} value={g}>
                        {g} — {GRADE_LABELS[g]?.label_ar}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/25 mb-1.5 block">الدرجة (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={gradeNumeric}
                  onChange={e => {
                    setGradeNumeric(e.target.value)
                    const val = parseInt(e.target.value)
                    if (!isNaN(val) && val >= 0 && val <= 100) setGrade(numericToLetter(val))
                  }}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none focus:border-white/[0.12]"
                  placeholder="85"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-white/25 mb-1.5 block">ملاحظات المدرب</label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                className="w-full min-h-[90px] resize-y bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder:text-white/15 focus:outline-none focus:border-white/[0.12]"
                placeholder="اكتب ملاحظاتك..."
                rows={3}
              />
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/[0.08] border border-red-500/15 text-red-400 text-xs">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/15 text-emerald-400 text-xs">
              {success}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {task.auto_score != null && (
              <button
                onClick={handleApproveAI}
                disabled={gradeMutation.isPending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/60 text-sm font-medium hover:bg-white/[0.06] transition-all disabled:opacity-40"
              >
                {gradeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                اعتماد AI
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={gradeMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-40"
            >
              {gradeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              حفظ التقييم
            </button>

            <button onClick={onClose} className="text-white/25 hover:text-white/40 text-sm mr-auto transition-colors">
              إلغاء
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
