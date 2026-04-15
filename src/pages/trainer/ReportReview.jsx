import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileBarChart, Loader2, Sparkles, User, ArrowRight, Save,
  CheckCircle2, AlertCircle, Target, BookOpen, Headphones, Mic,
  PenLine, BarChart3, RefreshCw, Link2, Check, Copy, X, Zap,
  Award, TrendingUp, Flame, Calendar
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

const SKILL_LABELS = {
  vocabulary: 'المفردات',
  reading: 'القراءة',
  writing: 'الكتابة',
  speaking: 'المحادثة',
  listening: 'الاستماع',
  grammar: 'القواعد',
}

const SKILL_ICONS = {
  vocabulary: BookOpen,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
  listening: Headphones,
  grammar: BarChart3,
}

const SKILL_COLORS = {
  vocabulary: 'var(--accent-sky)',
  reading: 'var(--accent-emerald)',
  writing: 'var(--accent-amber)',
  speaking: 'var(--accent-purple)',
  listening: 'var(--accent-sky)',
  grammar: 'var(--accent-emerald)',
}

const PERIOD_LABELS = { weekly: 'أسبوعي', biweekly: 'نصف شهري', monthly: 'شهري' }

function generateShareToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 12; i++) token += chars[Math.floor(Math.random() * chars.length)]
  return token
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch { return '' }
}

// Confidence copy helpers — inline fallbacks since lib/reports/confidenceCopy may not exist yet
function getConfidenceCopy(band) {
  if (band === 'low') return 'بيانات محدودة — هذا التقرير تقديري'
  if (band === 'medium') return 'بعض البيانات ناقصة — التقرير قد لا يعكس الصورة الكاملة'
  return ''
}

function shouldShowConfidenceNote(band) {
  return band && band !== 'high'
}

export default function ReportReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()

  const [narrativeText, setNarrativeText] = useState('')
  const [trainerNote, setTrainerNote] = useState('')
  const [goals, setGoals] = useState(['', '', ''])
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // ─── Fetch report ───
  const { data: report, isLoading, error: fetchError } = useQuery({
    queryKey: ['report-review', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress_reports')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // ─── Fetch student profile ───
  const { data: studentProfile } = useQuery({
    queryKey: ['report-student-profile', report?.student_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .eq('id', report.student_id)
        .single()
      return data
    },
    enabled: !!report?.student_id,
  })

  // ─── Fetch student record for level/package ───
  const { data: studentRecord } = useQuery({
    queryKey: ['report-student-record', report?.student_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, package_type, group_id, groups(name, level)')
        .eq('id', report.student_id)
        .single()
      return data
    },
    enabled: !!report?.student_id,
  })

  // Initialize form fields from report data
  if (report && !initialized) {
    setNarrativeText(report.ai_narrative_ar || '')
    setTrainerNote(report.trainer_notes || '')
    const existingGoals = report.next_goals || []
    setGoals([
      existingGoals[0] || '',
      existingGoals[1] || '',
      existingGoals[2] || '',
    ])
    setInitialized(true)
  }

  const studentName = studentProfile?.display_name || studentProfile?.full_name || 'طالب'
  const level = studentRecord?.groups?.level || ''
  const packageType = studentRecord?.package_type || ''
  const periodLabel = PERIOD_LABELS[report?.type] || report?.type || ''

  // Derived data from report
  const heroStats = useMemo(() => {
    if (!report) return []
    return [
      { label: 'النقاط المكتسبة', value: report.xp_earned ?? '-', icon: Zap, color: 'var(--accent-amber)' },
      { label: 'كلمات أُتقنت', value: report.words_mastered ?? '-', icon: BookOpen, color: 'var(--accent-emerald)' },
      { label: 'حصص حضرها', value: report.classes_attended ?? '-', icon: Calendar, color: 'var(--accent-sky)' },
      { label: 'سلسلة الأيام', value: report.streak_days ?? '-', icon: Flame, color: 'var(--accent-purple)' },
    ]
  }, [report])

  const skills = useMemo(() => {
    if (!report?.skill_scores) return []
    return Object.entries(report.skill_scores).map(([key, val]) => ({
      key,
      label: SKILL_LABELS[key] || key,
      current: typeof val === 'object' ? val.current : val,
      gain: typeof val === 'object' ? val.gain : 0,
    }))
  }, [report])

  const highlights = report?.highlights || []
  const vocabStats = report?.vocab_stats || null

  // ─── Regenerate narrative mutation ───
  const regenerateNarrative = useMutation({
    mutationFn: async () => {
      const res = await invokeWithRetry('generate-progress-report', {
        body: {
          student_id: report.student_id,
          period: report.type,
          regenerate_narrative_only: true,
          report_id: report.id,
        },
      }, { timeoutMs: 60000, retries: 2 })
      if (res.error) throw new Error(typeof res.error === 'object' ? res.error.message : String(res.error))
      if (res.data?.error) throw new Error(res.data.error)
      return res.data
    },
    onSuccess: (data) => {
      if (data?.ai_narrative_ar) {
        setNarrativeText(data.ai_narrative_ar)
      }
      queryClient.invalidateQueries({ queryKey: ['report-review', id] })
    },
  })

  // ─── Regenerate goals mutation ───
  const regenerateGoals = useMutation({
    mutationFn: async () => {
      const res = await invokeWithRetry('generate-progress-report', {
        body: {
          student_id: report.student_id,
          period: report.type,
          regenerate_goals_only: true,
          report_id: report.id,
        },
      }, { timeoutMs: 60000, retries: 2 })
      if (res.error) throw new Error(typeof res.error === 'object' ? res.error.message : String(res.error))
      if (res.data?.error) throw new Error(res.data.error)
      return res.data
    },
    onSuccess: (data) => {
      if (data?.next_goals?.length) {
        setGoals([
          data.next_goals[0] || '',
          data.next_goals[1] || '',
          data.next_goals[2] || '',
        ])
      }
    },
  })

  // ─── Save draft mutation ───
  const saveDraft = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('progress_reports')
        .update({
          ai_narrative_ar: narrativeText,
          trainer_notes: trainerNote,
          next_goals: goals.filter(g => g.trim()),
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-review', id] })
    },
  })

  // ─── Publish mutation ───
  const publishReport = useMutation({
    mutationFn: async () => {
      const shareToken = generateShareToken()
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('progress_reports')
        .update({
          status: 'published',
          published_at: now,
          trainer_notes: trainerNote,
          ai_narrative_ar: narrativeText,
          next_goals: goals.filter(g => g.trim()),
          reviewed_by: profile.id,
          reviewed_at: now,
          share_token: shareToken,
        })
        .eq('id', id)
      if (error) throw error
      return { shareToken }
    },
    onSuccess: (data) => {
      setShowPublishModal(false)
      setPublishSuccess(data.shareToken)
      queryClient.invalidateQueries({ queryKey: ['report-review', id] })
      queryClient.invalidateQueries({ queryKey: ['trainer-pending-reports'] })
      queryClient.invalidateQueries({ queryKey: ['trainer-published-reports'] })
    },
  })

  function updateGoal(index, value) {
    setGoals(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function copyShareLink(token) {
    const url = `${window.location.origin}/report/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  const trainerNoteLength = trainerNote.trim().length
  const isNoteValid = trainerNoteLength >= 50 && trainerNoteLength <= 500
  const isPublished = report?.status === 'published'

  // ─── Loading / Error states ───
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={32} className="animate-spin text-[var(--accent-sky)]" />
      </div>
    )
  }

  if (fetchError || !report) {
    return (
      <div className="fl-card-static p-12 text-center">
        <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
        <p className="text-[var(--text-primary)] font-medium mb-2">تعذر تحميل التقرير</p>
        <p className="text-sm text-muted mb-4">{fetchError?.message || 'التقرير غير موجود'}</p>
        <button
          onClick={() => navigate('/trainer/reports')}
          className="btn-primary min-h-[44px] py-2.5 px-6 inline-flex items-center gap-2"
        >
          <ArrowRight size={16} />
          رجوع للتقارير
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/trainer/reports')}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors"
          >
            <ArrowRight size={20} className="text-[var(--text-secondary)]" />
          </button>
          <div>
            <h1 className="text-page-title">مراجعة التقرير</h1>
            <p className="text-sm text-muted mt-0.5">{studentName} — {periodLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
            isPublished
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-[var(--accent-amber)]/10 text-[var(--accent-amber)]'
          }`}>
            {isPublished ? 'منشور' : 'بانتظار المراجعة'}
          </span>
        </div>
      </div>

      {/* Publish success banner */}
      <AnimatePresence>
        {publishSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fl-card-static p-5 border-emerald-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 size={22} className="text-emerald-400" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">تم نشر التقرير بنجاح</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/report/${publishSuccess}`}
                className="input-field text-sm flex-1"
                dir="ltr"
              />
              <button
                onClick={() => copyShareLink(publishSuccess)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--accent-sky)] text-white text-sm flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                {copiedLink ? 'تم' : 'نسخ'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout: preview + editing panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ═══ LEFT: Report Preview ═══ */}
        <div className="space-y-5">
          {/* Student header */}
          <div className="fl-card-static p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-[var(--accent-sky)]/10 flex items-center justify-center">
                <User size={20} className="text-[var(--accent-sky)]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">{studentName}</h2>
                <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                  {level && <span>المستوى: {level}</span>}
                  {level && packageType && <span>&middot;</span>}
                  {packageType && <span>{packageType}</span>}
                </div>
              </div>
            </div>
            {report.period_start && (
              <p className="text-xs text-muted mt-3">
                الفترة: {formatDate(report.period_start)} — {formatDate(report.period_end)}
              </p>
            )}
          </div>

          {/* Hero stats */}
          <div className="grid grid-cols-2 gap-3">
            {heroStats.map((stat, i) => {
              const Icon = stat.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="fl-card-static p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} style={{ color: stat.color }} />
                    <span className="text-xs text-muted">{stat.label}</span>
                  </div>
                  <p className="text-xl font-bold text-[var(--text-primary)]">{stat.value}</p>
                </motion.div>
              )
            })}
          </div>

          {/* Skill bars */}
          {skills.length > 0 && (
            <div className="fl-card-static p-6">
              <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-[var(--accent-sky)]" />
                تحليل المهارات
              </h3>
              <div className="space-y-4">
                {skills.map((skill) => {
                  const color = SKILL_COLORS[skill.key] || 'var(--accent-sky)'
                  const pct = Math.min(100, Math.max(0, skill.current || 0))
                  return (
                    <div key={skill.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-[var(--text-primary)]">{skill.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--text-primary)]">{skill.current}%</span>
                          {skill.gain > 0 && (
                            <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                              <TrendingUp size={12} />+{skill.gain}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-2.5 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: 0.1 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: color }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* AI Narrative (read-only preview) */}
          {narrativeText && (
            <div className="fl-card-static p-6">
              <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[var(--accent-purple)]" />
                ملخص الذكاء الاصطناعي
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {narrativeText}
              </p>
            </div>
          )}

          {/* Highlights */}
          {highlights.length > 0 && (
            <div className="fl-card-static p-6">
              <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2 mb-3">
                <Award size={16} className="text-[var(--accent-amber)]" />
                أبرز النقاط
              </h3>
              <ul className="space-y-2">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <CheckCircle2 size={14} className="text-[var(--accent-emerald)] mt-0.5 shrink-0" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vocabulary stats */}
          {vocabStats && (
            <div className="fl-card-static p-6">
              <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2 mb-3">
                <BookOpen size={16} className="text-[var(--accent-sky)]" />
                إحصائيات المفردات
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {vocabStats.total_words != null && (
                  <div className="p-3 rounded-xl bg-[var(--surface-raised)]">
                    <p className="text-xs text-muted">إجمالي الكلمات</p>
                    <p className="text-lg font-bold text-[var(--text-primary)]">{vocabStats.total_words}</p>
                  </div>
                )}
                {vocabStats.mastered != null && (
                  <div className="p-3 rounded-xl bg-[var(--surface-raised)]">
                    <p className="text-xs text-muted">مُتقنة</p>
                    <p className="text-lg font-bold text-emerald-400">{vocabStats.mastered}</p>
                  </div>
                )}
                {vocabStats.learning != null && (
                  <div className="p-3 rounded-xl bg-[var(--surface-raised)]">
                    <p className="text-xs text-muted">قيد التعلم</p>
                    <p className="text-lg font-bold text-[var(--accent-amber)]">{vocabStats.learning}</p>
                  </div>
                )}
                {vocabStats.new_this_period != null && (
                  <div className="p-3 rounded-xl bg-[var(--surface-raised)]">
                    <p className="text-xs text-muted">جديدة هذه الفترة</p>
                    <p className="text-lg font-bold text-[var(--accent-sky)]">{vocabStats.new_this_period}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Confidence band note */}
          {shouldShowConfidenceNote(report.confidence_band) && (
            <div className="flex items-start gap-2 p-4 rounded-xl bg-[var(--accent-amber)]/5 border border-[var(--accent-amber)]/15 text-sm text-[var(--accent-amber)]">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{getConfidenceCopy(report.confidence_band)}</span>
            </div>
          )}
        </div>

        {/* ═══ RIGHT: Editing Panel ═══ */}
        <div className="space-y-5">
          {/* AI Narrative (editable) */}
          <div className="fl-card-static p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--accent-purple)]" />
                نص الذكاء الاصطناعي
              </h3>
              <button
                onClick={() => regenerateNarrative.mutate()}
                disabled={regenerateNarrative.isPending || isPublished}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors text-xs text-[var(--text-secondary)] flex items-center gap-1.5 disabled:opacity-50"
              >
                {regenerateNarrative.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                إعادة توليد
              </button>
            </div>
            <textarea
              value={narrativeText}
              onChange={(e) => setNarrativeText(e.target.value)}
              disabled={isPublished}
              rows={6}
              className="input-field resize-y text-sm leading-relaxed w-full"
              dir="rtl"
              placeholder="النص التلقائي من الذكاء الاصطناعي..."
            />
            {regenerateNarrative.isError && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <AlertCircle size={12} />
                {regenerateNarrative.error?.message || 'فشل إعادة التوليد'}
              </p>
            )}
          </div>

          {/* Trainer's personal note */}
          <div className="fl-card-static p-6">
            <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2 mb-3">
              <PenLine size={16} className="text-[var(--accent-emerald)]" />
              ملاحظة المدرب
              <span className="text-xs text-muted font-normal">(مطلوبة)</span>
            </h3>
            <textarea
              value={trainerNote}
              onChange={(e) => setTrainerNote(e.target.value)}
              disabled={isPublished}
              rows={4}
              maxLength={500}
              className="input-field resize-y text-sm leading-relaxed w-full"
              dir="rtl"
              placeholder="أضف ملاحظتك الشخصية للطالب وولي الأمر (50-500 حرف)..."
            />
            <div className="flex items-center justify-between mt-2">
              <p className={`text-xs ${trainerNoteLength < 50 ? 'text-[var(--accent-amber)]' : trainerNoteLength > 500 ? 'text-red-400' : 'text-muted'}`}>
                {trainerNoteLength}/500
                {trainerNoteLength > 0 && trainerNoteLength < 50 && ' — الحد الأدنى 50 حرفاً'}
              </p>
            </div>
          </div>

          {/* Goals */}
          <div className="fl-card-static p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                <Target size={16} className="text-[var(--accent-purple)]" />
                أهداف الفترة القادمة
              </h3>
              <button
                onClick={() => regenerateGoals.mutate()}
                disabled={regenerateGoals.isPending || isPublished}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors text-xs text-[var(--text-secondary)] flex items-center gap-1.5 disabled:opacity-50"
              >
                {regenerateGoals.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                اقترح أهدافاً
              </button>
            </div>
            <div className="space-y-3">
              {goals.map((goal, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-muted shrink-0 w-5 text-center">{i + 1}</span>
                  <input
                    type="text"
                    value={goal}
                    onChange={(e) => updateGoal(i, e.target.value)}
                    disabled={isPublished}
                    className="input-field text-sm flex-1"
                    dir="rtl"
                    placeholder={`الهدف ${i + 1}...`}
                  />
                </div>
              ))}
            </div>
            {regenerateGoals.isError && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <AlertCircle size={12} />
                {regenerateGoals.error?.message || 'فشل اقتراح الأهداف'}
              </p>
            )}
          </div>

          {/* Action buttons */}
          {!isPublished && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => saveDraft.mutate()}
                disabled={saveDraft.isPending}
                className="min-h-[44px] flex-1 py-2.5 px-5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors text-sm text-[var(--text-secondary)] flex items-center justify-center gap-2"
              >
                {saveDraft.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                احفظ مسودة
              </button>
              <button
                onClick={() => setShowPublishModal(true)}
                disabled={!isNoteValid}
                className="btn-primary min-h-[44px] flex-1 py-2.5 px-5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                أوافق وأنشر
              </button>
            </div>
          )}

          {saveDraft.isSuccess && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-emerald-400 flex items-center gap-1"
            >
              <Check size={14} /> تم حفظ المسودة
            </motion.p>
          )}
          {saveDraft.isError && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={12} /> {saveDraft.error?.message || 'فشل الحفظ'}
            </p>
          )}

          {/* Back button */}
          <button
            onClick={() => navigate('/trainer/reports')}
            className="min-h-[44px] w-full py-2.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors text-sm text-[var(--text-secondary)] flex items-center justify-center gap-2"
          >
            <ArrowRight size={16} />
            رجوع
          </button>
        </div>
      </div>

      {/* ═══ Publish Confirmation Modal ═══ */}
      <AnimatePresence>
        {showPublishModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPublishModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fl-card-static p-7 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-[var(--text-primary)]">تأكيد النشر</h3>
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-[var(--surface-raised)] transition-colors"
                >
                  <X size={20} className="text-[var(--text-secondary)]" />
                </button>
              </div>
              <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
                هل أنت متأكد من نشر هذا التقرير؟ سيتمكن الطالب وولي الأمر من رؤيته عبر رابط المشاركة.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="min-h-[44px] flex-1 py-2.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors text-sm text-[var(--text-secondary)]"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => publishReport.mutate()}
                  disabled={publishReport.isPending}
                  className="btn-primary min-h-[44px] flex-1 py-2.5 flex items-center justify-center gap-2"
                >
                  {publishReport.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  نشر التقرير
                </button>
              </div>
              {publishReport.isError && (
                <p className="text-xs text-red-400 mt-3 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {publishReport.error?.message || 'فشل النشر'}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
