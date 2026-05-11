import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  FileBarChart, Loader2, Sparkles, User, TrendingUp, TrendingDown,
  Star, AlertCircle, Printer, History, ChevronDown, ChevronUp,
  BookOpen, MessageCircle, Target, Award, ClipboardCheck, BarChart3, Download,
  Eye, Link2, Check, Users, Send
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

const PERIOD_OPTIONS = [
  { value: 'weekly', label: 'أسبوعي', days: 7 },
  { value: 'biweekly', label: 'نصف شهري', days: 14 },
  { value: 'monthly', label: 'شهري', days: 30 },
]

const PERIOD_LABELS = { weekly: 'أسبوعي', biweekly: 'نصف شهري', monthly: 'شهري' }

const TAB_KEYS = [
  { key: 'pending', tKey: 'trainer.reports.tab_pending', icon: ClipboardCheck },
  { key: 'published', tKey: 'trainer.reports.tab_published', icon: Check },
  { key: 'generate', tKey: 'trainer.reports.tab_generate', icon: Users },
]

function formatDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch { return '' }
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

export default function TrainerProgressReports() {
  const { t } = useTranslation()
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const TABS = TAB_KEYS.map(tab => ({ ...tab, label: t(tab.tKey) }))

  const [activeTab, setActiveTab] = useState('pending')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [period, setPeriod] = useState('monthly')
  const [showHistory, setShowHistory] = useState(false)
  const [generateSuccess, setGenerateSuccess] = useState(null)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })

  const isAdmin = profile?.role === 'admin'

  // ─── Pending reports (needs review) ───
  const { data: pendingReports, isLoading: pendingLoading } = useQuery({
    queryKey: ['trainer-pending-reports', profile?.id, profile?.role],
    queryFn: async () => {
      let sids

      if (isAdmin) {
        // Admin sees all pending reports
        const { data } = await supabase
          .from('progress_reports')
          .select('id, student_id, type, period_start, period_end, status, generated_at, ai_narrative_ar, confidence_band')
          .eq('status', 'trainer_review')
          .order('generated_at', { ascending: false })

        if (!data || data.length === 0) return []
        const uniqueStudentIds = [...new Set(data.map(r => r.student_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, display_name')
          .in('id', uniqueStudentIds)
        const nameMap = {}
        for (const p of (profiles || [])) {
          nameMap[p.id] = p.display_name || p.full_name
        }
        return data.map(r => ({ ...r, student_name: nameMap[r.student_id] || 'طالب' }))
      }

      // Trainer: filter by own groups
      const { data: groups } = await supabase
        .from('groups')
        .select('id')
        .eq('trainer_id', profile?.id)
      const groupIds = (groups || []).map(g => g.id)
      if (groupIds.length === 0) return []

      const { data: studentIds } = await supabase
        .from('students')
        .select('id')
        .in('group_id', groupIds)
        .is('deleted_at', null)
      sids = (studentIds || []).map(s => s.id)
      if (sids.length === 0) return []

      const { data } = await supabase
        .from('progress_reports')
        .select('id, student_id, type, period_start, period_end, status, generated_at, ai_narrative_ar, confidence_band')
        .in('student_id', sids)
        .eq('status', 'trainer_review')
        .order('generated_at', { ascending: false })

      if (!data || data.length === 0) return []
      const uniqueStudentIds = [...new Set(data.map(r => r.student_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .in('id', uniqueStudentIds)
      const nameMap = {}
      for (const p of (profiles || [])) {
        nameMap[p.id] = p.display_name || p.full_name
      }
      return data.map(r => ({ ...r, student_name: nameMap[r.student_id] || 'طالب' }))
    },
    enabled: !!profile?.id,
  })

  // ─── Published reports ───
  const { data: publishedReports, isLoading: publishedLoading } = useQuery({
    queryKey: ['trainer-published-reports', profile?.id, profile?.role],
    queryFn: async () => {
      let query = supabase
        .from('progress_reports')
        .select('id, student_id, type, period_start, period_end, status, published_at, share_token, generated_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(50)

      if (!isAdmin) {
        // Filter to trainer's students
        const { data: groups } = await supabase
          .from('groups')
          .select('id')
          .eq('trainer_id', profile?.id)
        const groupIds = (groups || []).map(g => g.id)
        if (groupIds.length === 0) return []
        const { data: studentIds } = await supabase
          .from('students')
          .select('id')
          .in('group_id', groupIds)
          .is('deleted_at', null)
        const sids = (studentIds || []).map(s => s.id)
        if (sids.length === 0) return []
        query = query.in('student_id', sids)
      }

      const { data } = await query
      if (!data || data.length === 0) return []

      const uniqueStudentIds = [...new Set(data.map(r => r.student_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .in('id', uniqueStudentIds)
      const nameMap = {}
      for (const p of (profiles || [])) {
        nameMap[p.id] = p.display_name || p.full_name
      }
      return data.map(r => ({ ...r, student_name: nameMap[r.student_id] || 'طالب' }))
    },
    enabled: !!profile?.id,
  })

  // ─── Groups for generate tab ───
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups-reports', profile?.id, profile?.role],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  // ─── Students in selected group ───
  const { data: students } = useQuery({
    queryKey: ['group-students-reports', selectedGroup],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name)')
        .eq('group_id', selectedGroup)
        .eq('status', 'active')
        .is('deleted_at', null)
      return data || []
    },
    enabled: !!selectedGroup,
  })

  // ─── Report history for selected student ───
  const { data: reportHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['progress-report-history', selectedStudent],
    queryFn: async () => {
      const { data } = await supabase
        .from('progress_reports')
        .select('id, type, period_start, period_end, status, generated_at, published_at')
        .eq('student_id', selectedStudent)
        .order('generated_at', { ascending: false })
        .limit(20)
      return data || []
    },
    enabled: !!selectedStudent,
  })

  // ─── Generate report mutation ───
  const generateMutation = useMutation({
    mutationFn: async ({ studentId, periodValue }) => {
      const res = await invokeWithRetry('generate-progress-report', {
        body: { student_id: studentId, period: periodValue },
      }, { timeoutMs: 60000, retries: 2 })

      if (res.error) throw new Error(typeof res.error === 'object' ? (res.error.message || 'خطأ في إنشاء التقرير') : String(res.error))
      if (res.data?.error) throw new Error(res.data.error)
      return res.data
    },
    onSuccess: (data) => {
      setGenerateSuccess(data)
      setError('')
      queryClient.invalidateQueries({ queryKey: ['trainer-pending-reports'] })
      queryClient.invalidateQueries({ queryKey: ['progress-report-history', selectedStudent] })
    },
    onError: (err) => {
      setError(err.message || 'تعذر إنشاء التقرير')
      setGenerateSuccess(null)
    },
  })

  const selectedStudentName = students?.find(s => s.id === selectedStudent)
    ?.profiles?.display_name || students?.find(s => s.id === selectedStudent)?.profiles?.full_name || ''

  async function handleGenerate() {
    if (!selectedStudent) return
    setError('')
    setGenerateSuccess(null)
    generateMutation.mutate({ studentId: selectedStudent, periodValue: period })
  }

  async function handleBatchGenerate() {
    if (!students?.length || batchGenerating) return
    setBatchGenerating(true)
    setBatchProgress({ current: 0, total: students.length })
    setError('')

    for (let i = 0; i < students.length; i++) {
      setBatchProgress({ current: i + 1, total: students.length })
      try {
        await invokeWithRetry('generate-progress-report', {
          body: { student_id: students[i].id, period },
        }, { timeoutMs: 60000, retries: 2 })
      } catch (err) {
        console.error(`Failed for student ${students[i].id}:`, err.message)
      }
    }

    setBatchGenerating(false)
    queryClient.invalidateQueries({ queryKey: ['trainer-pending-reports'] })
    queryClient.invalidateQueries({ queryKey: ['progress-report-history'] })
  }

  function copyShareLink(shareToken) {
    const url = `${window.location.origin}/report/${shareToken}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(shareToken)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <FileBarChart size={20} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-page-title">{t('trainer.reports.title')}</h1>
          <p className="text-muted text-sm mt-1">{t('trainer.reports.subtitle')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          const count = tab.key === 'pending' ? (pendingReports?.length || 0) : tab.key === 'published' ? (publishedReports?.length || 0) : null
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 min-w-[120px] min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--accent-sky)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {count !== null && count > 0 && (
                <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs flex items-center justify-center font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[var(--accent-sky)]/10 text-[var(--accent-sky)]'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ═══ PENDING TAB ═══ */}
      <AnimatePresence mode="wait">
        {activeTab === 'pending' && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {pendingLoading ? (
              <div className="fl-card-static p-12 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[var(--accent-sky)]" />
              </div>
            ) : !pendingReports?.length ? (
              <div className="fl-card-static p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-emerald-400" />
                </div>
                <p className="text-[var(--text-primary)] font-medium mb-1">{t('trainer.reports.pending_empty_title')}</p>
                <p className="text-sm text-muted">{t('trainer.reports.pending_empty_subtitle')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReports.map((report, i) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="fl-card-static p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[var(--accent-sky)]/10 flex items-center justify-center shrink-0">
                          <User size={18} className="text-[var(--accent-sky)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {report.student_name}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span className="text-xs text-muted">
                              {PERIOD_LABELS[report.type] || report.type}
                            </span>
                            {report.period_start && (
                              <span className="text-xs text-muted">
                                {formatDate(report.period_start)} — {formatDate(report.period_end)}
                              </span>
                            )}
                          </div>
                          {report.confidence_band && report.confidence_band !== 'high' && (
                            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-[var(--accent-amber)]/10 text-[var(--accent-amber)]">
                              ثقة: {report.confidence_band === 'medium' ? 'متوسطة' : 'منخفضة'}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/trainer/progress-reports/${report.id}/review`)}
                        className="btn-primary min-h-[44px] px-5 py-2.5 flex items-center gap-2 text-sm shrink-0"
                      >
                        <Eye size={16} />
                        {t('trainer.reports.open_review_button')}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ PUBLISHED TAB ═══ */}
        {activeTab === 'published' && (
          <motion.div
            key="published"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {publishedLoading ? (
              <div className="fl-card-static p-12 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-[var(--accent-sky)]" />
              </div>
            ) : !publishedReports?.length ? (
              <div className="fl-card-static p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto mb-4">
                  <FileBarChart size={28} className="text-sky-400" />
                </div>
                <p className="text-[var(--text-primary)] font-medium mb-1">{t('trainer.reports.published_empty_title')}</p>
                <p className="text-sm text-muted">{t('trainer.reports.published_empty_subtitle')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {publishedReports.map((report, i) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="fl-card-static p-5"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Check size={18} className="text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {report.student_name}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <span className="text-xs text-muted">
                              {PERIOD_LABELS[report.type] || report.type}
                            </span>
                            {report.period_start && (
                              <span className="text-xs text-muted">
                                {formatDate(report.period_start)} — {formatDate(report.period_end)}
                              </span>
                            )}
                          </div>
                          {report.published_at && (
                            <p className="text-xs text-muted mt-1">
                              نُشر: {formatDateTime(report.published_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => navigate(`/trainer/progress-reports/${report.id}/review`)}
                          className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors text-sm text-[var(--text-secondary)] flex items-center gap-2"
                        >
                          <Eye size={16} />
                          عرض
                        </button>
                        {report.share_token && (
                          <button
                            onClick={() => copyShareLink(report.share_token)}
                            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors text-sm text-[var(--text-secondary)] flex items-center gap-2"
                            title="نسخ رابط المشاركة"
                          >
                            {copiedId === report.share_token ? (
                              <>
                                <Check size={16} className="text-emerald-400" />
                                <span className="text-emerald-400">{t('trainer.reports.link_copied')}</span>
                              </>
                            ) : (
                              <>
                                <Link2 size={16} />
                                {t('trainer.reports.copy_link_button')}
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ GENERATE TAB ═══ */}
        {activeTab === 'generate' && (
          <motion.div
            key="generate"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Controls */}
            <div className="fl-card-static p-7 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Group selector */}
                <div>
                  <label className="input-label">المجموعة</label>
                  <select
                    className="input-field"
                    value={selectedGroup}
                    onChange={(e) => { setSelectedGroup(e.target.value); setSelectedStudent(''); setGenerateSuccess(null); setError('') }}
                  >
                    <option value="">اختر المجموعة</option>
                    {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>

                {/* Student selector */}
                <div>
                  <label className="input-label">الطالب</label>
                  <select
                    className="input-field"
                    value={selectedStudent}
                    onChange={(e) => { setSelectedStudent(e.target.value); setGenerateSuccess(null); setError('') }}
                    disabled={!selectedGroup}
                  >
                    <option value="">اختر الطالب</option>
                    {students?.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.profiles?.display_name || s.profiles?.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period selector */}
                <div>
                  <label className="input-label">الفترة</label>
                  <select className="input-field" value={period} onChange={(e) => setPeriod(e.target.value)}>
                    {PERIOD_OPTIONS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleGenerate}
                  disabled={!selectedStudent || generateMutation.isPending}
                  className="btn-primary min-h-[44px] py-2.5 px-6 flex items-center gap-2"
                >
                  {generateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {generateMutation.isPending ? t('trainer.reports.generating') : t('trainer.reports.generate_button')}
                </button>

                {isAdmin && selectedGroup && students?.length > 0 && (
                  <button
                    onClick={handleBatchGenerate}
                    disabled={batchGenerating}
                    className="min-h-[44px] py-2.5 px-5 rounded-xl border border-[var(--accent-purple)] text-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/10 transition-colors text-sm flex items-center gap-2"
                  >
                    {batchGenerating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        توليد {batchProgress.current}/{batchProgress.total}...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        توليد لكل الطلاب ({students.length})
                      </>
                    )}
                  </button>
                )}

                {selectedStudent && (
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="min-h-[44px] py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition-colors flex items-center gap-2"
                  >
                    <History size={16} />
                    التقارير السابقة
                    {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Generate success */}
            <AnimatePresence>
              {generateSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="fl-card-static p-7"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Check size={20} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{t('trainer.reports.success_title')}</p>
                      <p className="text-xs text-muted">{t('trainer.reports.success_student_label')} {selectedStudentName}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/trainer/progress-reports/${generateSuccess.report_id || generateSuccess.id}/review`)}
                    className="btn-primary min-h-[44px] py-2.5 px-6 flex items-center gap-2"
                  >
                    <Eye size={16} />
                    {t('trainer.reports.go_to_review_button')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Report History (collapsible) */}
            <AnimatePresence>
              {showHistory && selectedStudent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="fl-card-static p-7">
                    <h3 className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2 mb-4">
                      <History size={16} className="text-[var(--accent-sky)]" />
                      التقارير السابقة — {selectedStudentName}
                    </h3>
                    {historyLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={20} className="animate-spin text-[var(--accent-sky)]" />
                      </div>
                    ) : reportHistory?.length === 0 ? (
                      <p className="text-sm text-muted text-center py-6">{t('trainer.reports.no_history')}</p>
                    ) : (
                      <div className="space-y-2">
                        {reportHistory.map(h => {
                          const periodLbl = PERIOD_LABELS[h.type] || h.type
                          const statusLabel = h.status === 'published' ? 'منشور' : h.status === 'trainer_review' ? 'بانتظار المراجعة' : h.status
                          const statusColor = h.status === 'published' ? 'text-emerald-400' : 'text-[var(--accent-amber)]'
                          return (
                            <button
                              key={h.id}
                              onClick={() => navigate(`/trainer/progress-reports/${h.id}/review`)}
                              className="w-full text-start min-h-[44px] p-4 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                                  <FileBarChart size={14} className="text-sky-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[var(--text-primary)]">تقرير {periodLbl}</p>
                                  <p className="text-xs text-muted">{formatDateTime(h.generated_at)}</p>
                                </div>
                              </div>
                              <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
