import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileBarChart, Loader2, Sparkles, User, TrendingUp, TrendingDown,
  Star, AlertCircle, Printer, History, ChevronDown, ChevronUp,
  BookOpen, MessageCircle, Target, Award, ClipboardCheck, BarChart3, Download
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

const PERIOD_OPTIONS = [
  { value: 'weekly', label: 'أسبوعي', days: 7 },
  { value: 'biweekly', label: 'نصف شهري', days: 14 },
  { value: 'monthly', label: 'شهري', days: 30 },
]

const RATING_STARS = [1, 2, 3, 4, 5]

function RatingStars({ rating }) {
  return (
    <div className="flex items-center gap-1">
      {RATING_STARS.map(i => (
        <Star
          key={i}
          size={18}
          className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-[var(--border-subtle)]'}
        />
      ))}
    </div>
  )
}

function SectionCard({ icon: Icon, title, color = 'text-sky-400', children }) {
  return (
    <div className="fl-card-static p-7">
      <h3 className={`text-sm font-medium ${color} flex items-center gap-2 mb-4`}>
        <Icon size={16} />
        {title}
      </h3>
      {children}
    </div>
  )
}

function generateReportHTML(report, student, periodLabel) {
  const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })

  const starsHTML = (rating) => {
    let html = ''
    for (let i = 1; i <= 5; i++) {
      const color = i <= rating ? '#facc15' : '#555'
      const star = i <= rating ? '\u2605' : '\u2606'
      html += '<span style="font-size:18px;color:' + color + ';">' + star + '</span>'
    }
    return html
  }

  const skillsSection = report.skill_analysis?.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h3 style="font-size:15px;color:#38bdf8;margin-bottom:12px;">📘 تحليل المهارات</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#1e293b;color:#e2e8f0;">
            <th style="padding:10px 12px;text-align:right;border:1px solid #334155;">المهارة</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid #334155;width:130px;">التقييم</th>
            <th style="padding:10px 12px;text-align:right;border:1px solid #334155;">الملاحظات</th>
          </tr>
        </thead>
        <tbody>
          ${report.skill_analysis.map(skill => `
            <tr>
              <td style="padding:8px 12px;border:1px solid #334155;font-weight:600;color:#e2e8f0;">${skill.skill || skill.name || ''}</td>
              <td style="padding:8px 12px;border:1px solid #334155;text-align:center;">${skill.rating ? starsHTML(skill.rating) : '-'}</td>
              <td style="padding:8px 12px;border:1px solid #334155;color:#cbd5e1;">${skill.comment || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : ''

  const strengthsSection = report.strengths_ar?.length > 0 ? `
    <div style="margin-bottom:24px;break-inside:avoid;">
      <h3 style="font-size:15px;color:#34d399;margin-bottom:10px;">✅ نقاط القوة</h3>
      <ul style="margin:0;padding-right:20px;color:#cbd5e1;font-size:13px;line-height:2;">
        ${report.strengths_ar.map(s => `<li>${s}</li>`).join('')}
      </ul>
    </div>
  ` : ''

  const improvementsSection = report.areas_for_improvement_ar?.length > 0 ? `
    <div style="margin-bottom:24px;break-inside:avoid;">
      <h3 style="font-size:15px;color:#fbbf24;margin-bottom:10px;">⚠️ مجالات التحسين</h3>
      <ul style="margin:0;padding-right:20px;color:#cbd5e1;font-size:13px;line-height:2;">
        ${report.areas_for_improvement_ar.map(w => `<li>${w}</li>`).join('')}
      </ul>
    </div>
  ` : ''

  const recommendationsSection = (report.recommendations_ar?.length > 0 || report.recommendations_en?.length > 0) ? `
    <div style="margin-bottom:24px;break-inside:avoid;">
      <h3 style="font-size:15px;color:#38bdf8;margin-bottom:10px;">💡 التوصيات</h3>
      ${report.recommendations_ar?.length > 0 ? `
        <ul style="margin:0 0 8px 0;padding-right:20px;color:#cbd5e1;font-size:13px;line-height:2;">
          ${report.recommendations_ar.map(r => `<li>${r}</li>`).join('')}
        </ul>
      ` : ''}
      ${report.recommendations_en?.length > 0 ? `
        <div dir="ltr" style="margin-top:10px;padding-top:10px;border-top:1px solid #334155;">
          <p style="font-size:11px;color:#94a3b8;margin:0 0 6px 0;">Recommendations (English)</p>
          <ul style="margin:0;padding-left:20px;color:#cbd5e1;font-size:13px;line-height:2;">
            ${report.recommendations_en.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  ` : ''

  const goalsSection = report.next_period_goals?.length > 0 ? `
    <div style="margin-bottom:24px;break-inside:avoid;">
      <h3 style="font-size:15px;color:#a78bfa;margin-bottom:10px;">🎯 أهداف الفترة القادمة</h3>
      <ul style="margin:0;padding-right:20px;color:#cbd5e1;font-size:13px;line-height:2;">
        ${report.next_period_goals.map(g => `<li>${g}</li>`).join('')}
      </ul>
    </div>
  ` : ''

  const parentSection = report.parent_message_ar ? `
    <div style="margin-bottom:24px;break-inside:avoid;">
      <h3 style="font-size:15px;color:#f59e0b;margin-bottom:10px;">💬 رسالة لولي الأمر</h3>
      <div style="padding:14px 18px;background:#451a0320;border:1px solid #f59e0b30;border-radius:10px;">
        <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.9;">${report.parent_message_ar}</p>
      </div>
    </div>
  ` : ''

  const engagementSection = (report.engagement_level || report.homework_quality) ? `
    <div style="display:flex;gap:16px;margin-bottom:24px;">
      ${report.engagement_level ? `
        <div style="flex:1;padding:14px 18px;background:#1e293b;border:1px solid #334155;border-radius:10px;">
          <p style="margin:0 0 4px 0;font-size:11px;color:#94a3b8;">مستوى التفاعل</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#e2e8f0;">${report.engagement_level}</p>
        </div>
      ` : ''}
      ${report.homework_quality ? `
        <div style="flex:1;padding:14px 18px;background:#1e293b;border:1px solid #334155;border-radius:10px;">
          <p style="margin:0 0 4px 0;font-size:11px;color:#94a3b8;">جودة الواجبات</p>
          <p style="margin:0;font-size:16px;font-weight:700;color:#e2e8f0;">${report.homework_quality}</p>
        </div>
      ` : ''}
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير تقدم الطالب - ${student}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    @page { size: A4; margin: 18mm 16mm; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      margin: 0;
      padding: 24px 32px;
      direction: rtl;
      line-height: 1.7;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="text-align:center;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #334155;">
    <div style="display:inline-flex;align-items:center;gap:14px;margin-bottom:10px;">
      <div style="width:48px;height:48px;border-radius:12px;background:#0ea5e9;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:22px;color:#fff;font-weight:bold;">F</span>
      </div>
      <span style="font-size:22px;font-weight:800;color:#e2e8f0;">Fluentia Academy</span>
    </div>
    <h1 style="margin:8px 0 0 0;font-size:20px;color:#38bdf8;">تقرير تقدم الطالب</h1>
  </div>

  <!-- Student Info -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding:14px 20px;background:#1e293b;border-radius:10px;border:1px solid #334155;">
    <div>
      <p style="margin:0;font-size:11px;color:#94a3b8;">اسم الطالب</p>
      <p style="margin:2px 0 0 0;font-size:16px;font-weight:700;color:#e2e8f0;">${student}</p>
    </div>
    <div style="text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">الفترة</p>
      <p style="margin:2px 0 0 0;font-size:14px;font-weight:600;color:#e2e8f0;">${periodLabel}</p>
    </div>
    <div style="text-align:left;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">التاريخ</p>
      <p style="margin:2px 0 0 0;font-size:14px;font-weight:600;color:#e2e8f0;">${today}</p>
    </div>
  </div>

  <!-- Executive Summary -->
  ${report.executive_summary_ar ? `
    <div style="margin-bottom:24px;padding:14px 18px;background:#1e293b;border-radius:10px;border:1px solid #334155;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:#38bdf8;">الملخص التنفيذي</p>
      <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.9;">${report.executive_summary_ar}</p>
    </div>
  ` : ''}
  ${report.executive_summary_en ? `
    <div dir="ltr" style="margin-bottom:24px;padding:14px 18px;background:#1e293b;border-radius:10px;border:1px solid #334155;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:#38bdf8;">Executive Summary</p>
      <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.9;">${report.executive_summary_en}</p>
    </div>
  ` : ''}

  ${engagementSection}
  ${skillsSection}

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
    <div>${strengthsSection}</div>
    <div>${improvementsSection}</div>
  </div>

  ${recommendationsSection}
  ${goalsSection}
  ${parentSection}

  <!-- Overall Rating -->
  ${report.overall_rating ? `
    <div style="text-align:center;padding:16px;margin-top:24px;border-top:2px solid #334155;">
      <p style="margin:0 0 6px 0;font-size:14px;font-weight:600;color:#e2e8f0;">التقييم العام</p>
      <div>${starsHTML(report.overall_rating)}</div>
      <p style="margin:6px 0 0 0;font-size:12px;color:#94a3b8;">(${report.overall_rating}/5)</p>
    </div>
  ` : ''}

  <!-- Footer -->
  <div style="text-align:center;margin-top:30px;padding-top:14px;border-top:1px solid #334155;">
    <p style="margin:0;font-size:11px;color:#64748b;">Fluentia Academy &copy; ${new Date().getFullYear()} — تم إنشاء هذا التقرير بواسطة الذكاء الاصطناعي</p>
  </div>
</body>
</html>`
}

export default function TrainerProgressReports() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const reportRef = useRef(null)

  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [period, setPeriod] = useState('monthly')
  const [report, setReport] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const isAdmin = profile?.role === 'admin'

  // Fetch groups
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups-reports'],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Fetch students in selected group
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

  // Fetch report history for selected student
  const { data: reportHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['progress-report-history', selectedStudent],
    queryFn: async () => {
      const { data } = await supabase
        .from('progress_reports')
        .select('id, period, report_data, generated_at, language')
        .eq('student_id', selectedStudent)
        .order('generated_at', { ascending: false })
        .limit(20)
      return data || []
    },
    enabled: !!selectedStudent,
  })

  const selectedStudentName = students?.find(s => s.id === selectedStudent)
    ?.profiles?.display_name || students?.find(s => s.id === selectedStudent)?.profiles?.full_name || ''

  async function generateReport() {
    if (!selectedStudent) return
    setGenerating(true)
    setError('')
    setReport(null)

    try {
      const res = await invokeWithRetry('generate-progress-report', {
        body: { student_id: selectedStudent, period, language: 'both' },
      }, { timeoutMs: 60000, retries: 2 })

      if (res.error) throw new Error(typeof res.error === 'object' ? (res.error.message || 'خطأ في إنشاء التقرير') : String(res.error))
      if (res.data?.error) throw new Error(res.data.error)

      setReport(res.data)
      // Refresh history after generating
      queryClient.invalidateQueries({ queryKey: ['progress-report-history', selectedStudent] })
    } catch (err) {
      setError(err.message || 'تعذر إنشاء التقرير')
    } finally {
      setGenerating(false)
    }
  }

  function loadHistoryReport(historyItem) {
    setReport(historyItem.report_data)
    setShowHistory(false)
  }

  function handlePrint() {
    window.print()
  }

  function handleDownloadPDF() {
    if (!report) return
    const html = generateReportHTML(report, selectedStudentName || 'الطالب', periodLabel)
    const pdfWindow = window.open('', '_blank')
    if (!pdfWindow) return
    pdfWindow.document.write(html)
    pdfWindow.document.close()
    pdfWindow.onload = () => {
      setTimeout(() => { pdfWindow.print() }, 400)
    }
  }

  const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || period

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
          <FileBarChart size={20} className="text-sky-400" />
        </div>
        <div>
          <h1 className="text-page-title">تقارير التقدم</h1>
          <p className="text-muted text-sm mt-1">تقارير أداء الطلاب الشاملة بالذكاء الاصطناعي</p>
        </div>
      </div>

      {/* Controls */}
      <div className="fl-card-static p-7 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Group selector */}
          <div>
            <label className="input-label">المجموعة</label>
            <select
              className="input-field"
              value={selectedGroup}
              onChange={(e) => { setSelectedGroup(e.target.value); setSelectedStudent(''); setReport(null) }}
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
              onChange={(e) => { setSelectedStudent(e.target.value); setReport(null) }}
              disabled={!selectedGroup}
            >
              <option value="">اختر الطالب</option>
              {students?.map(s => (
                <option key={s.id} value={s.id}>
                  {s.profiles?.full_name || s.profiles?.display_name}
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

        <div className="flex items-center gap-3">
          <button
            onClick={generateReport}
            disabled={!selectedStudent || generating}
            className="btn-primary py-2.5 flex items-center gap-2"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? 'جاري إنشاء التقرير...' : 'إنشاء التقرير'}
          </button>

          {selectedStudent && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="py-2.5 px-4 rounded-xl border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition-colors flex items-center gap-2"
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

      {/* Report History */}
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
                <History size={16} className="text-sky-400" />
                التقارير السابقة
              </h3>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-sky-400" />
                </div>
              ) : reportHistory?.length === 0 ? (
                <p className="text-sm text-muted text-center py-6">لا توجد تقارير سابقة لهذا الطالب</p>
              ) : (
                <div className="space-y-2">
                  {reportHistory?.map(h => {
                    const periodLbl = PERIOD_OPTIONS.find(p => p.value === h.period)?.label || h.period
                    const date = new Date(h.generated_at).toLocaleDateString('ar-EG', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })
                    const rating = h.report_data?.overall_rating
                    return (
                      <button
                        key={h.id}
                        onClick={() => loadHistoryReport(h)}
                        className="w-full text-start p-4 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                            <FileBarChart size={14} className="text-sky-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">تقرير {periodLbl}</p>
                            <p className="text-xs text-muted">{date}</p>
                          </div>
                        </div>
                        {rating && <RatingStars rating={rating} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report Display */}
      <AnimatePresence>
        {report && (
          <motion.div
            ref={reportRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 print:space-y-4"
            id="progress-report-print"
          >
            {/* Report Header with print button */}
            <div className="fl-card-static p-7">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center">
                    <User size={22} className="text-sky-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">
                      {selectedStudentName || 'تقرير الطالب'}
                    </h2>
                    <p className="text-xs text-muted">تقرير {periodLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {report.overall_rating && (
                    <div className="text-center">
                      <RatingStars rating={report.overall_rating} />
                      <p className="text-xs text-muted mt-1">التقييم العام</p>
                    </div>
                  )}
                  <button
                    onClick={handleDownloadPDF}
                    className="print:hidden py-2 px-3.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors text-[var(--text-secondary)] flex items-center gap-2 text-sm"
                    title="تحميل PDF"
                  >
                    <Download size={16} />
                    تحميل PDF
                  </button>
                  <button
                    onClick={handlePrint}
                    className="print:hidden p-2.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--surface-raised)] transition-colors text-[var(--text-secondary)]"
                    title="طباعة التقرير"
                  >
                    <Printer size={18} />
                  </button>
                </div>
              </div>

              {/* Executive Summary */}
              {(report.executive_summary_ar || report.executive_summary_en) && (
                <div className="space-y-3">
                  {report.executive_summary_ar && (
                    <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
                      <p className="text-sm font-medium text-[var(--accent-sky)] mb-1">الملخص التنفيذي</p>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{report.executive_summary_ar}</p>
                    </div>
                  )}
                  {report.executive_summary_en && (
                    <div className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)]" dir="ltr">
                      <p className="text-sm font-medium text-[var(--accent-sky)] mb-1">Executive Summary</p>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{report.executive_summary_en}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Engagement & Homework Quality */}
            {(report.engagement_level || report.homework_quality) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {report.engagement_level && (
                  <div className="fl-card-static p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <BarChart3 size={16} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted">مستوى التفاعل</p>
                        <p className="text-base font-bold text-[var(--text-primary)]">{report.engagement_level}</p>
                      </div>
                    </div>
                  </div>
                )}
                {report.homework_quality && (
                  <div className="fl-card-static p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <ClipboardCheck size={16} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted">جودة الواجبات</p>
                        <p className="text-base font-bold text-[var(--text-primary)]">{report.homework_quality}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Skill Analysis */}
            {report.skill_analysis?.length > 0 && (
              <SectionCard icon={BookOpen} title="تحليل المهارات" color="text-sky-400">
                <div className="space-y-4">
                  {report.skill_analysis.map((skill, i) => (
                    <div key={i} className="p-4 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)]">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{skill.skill || skill.name}</p>
                        {skill.rating && <RatingStars rating={skill.rating} />}
                      </div>
                      {skill.comment && (
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{skill.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
              {report.strengths_ar?.length > 0 && (
                <SectionCard icon={TrendingUp} title="نقاط القوة" color="text-emerald-400">
                  <ul className="space-y-2">
                    {report.strengths_ar.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                        <Star size={12} className="text-emerald-400 mt-1 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {/* Areas for improvement */}
              {report.areas_for_improvement_ar?.length > 0 && (
                <SectionCard icon={TrendingDown} title="مجالات التحسين" color="text-yellow-400">
                  <ul className="space-y-2">
                    {report.areas_for_improvement_ar.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                        <AlertCircle size={12} className="text-yellow-400 mt-1 shrink-0" />
                        {w}
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}
            </div>

            {/* Recommendations */}
            {(report.recommendations_ar?.length > 0 || report.recommendations_en?.length > 0) && (
              <SectionCard icon={Sparkles} title="التوصيات" color="text-sky-400">
                <div className="space-y-4">
                  {report.recommendations_ar?.length > 0 && (
                    <ul className="space-y-2">
                      {report.recommendations_ar.map((r, i) => (
                        <li key={i} className="text-sm text-[var(--text-secondary)]">• {r}</li>
                      ))}
                    </ul>
                  )}
                  {report.recommendations_en?.length > 0 && (
                    <div dir="ltr" className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                      <p className="text-xs text-muted mb-2">Recommendations (English)</p>
                      <ul className="space-y-2">
                        {report.recommendations_en.map((r, i) => (
                          <li key={i} className="text-sm text-[var(--text-secondary)]">• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}

            {/* Next Period Goals */}
            {report.next_period_goals?.length > 0 && (
              <SectionCard icon={Target} title="أهداف الفترة القادمة" color="text-purple-400">
                <ul className="space-y-2">
                  {report.next_period_goals.map((g, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <Target size={12} className="text-purple-400 mt-1 shrink-0" />
                      {g}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {/* Parent Message */}
            {report.parent_message_ar && (
              <SectionCard icon={MessageCircle} title="رسالة لولي الأمر" color="text-amber-400">
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{report.parent_message_ar}</p>
                </div>
              </SectionCard>
            )}

            {/* Overall Rating Footer */}
            {report.overall_rating && (
              <div className="fl-card-static p-5 flex items-center justify-center gap-4">
                <Award size={20} className="text-yellow-400" />
                <span className="text-sm font-medium text-[var(--text-primary)]">التقييم العام:</span>
                <RatingStars rating={report.overall_rating} />
                <span className="text-sm text-muted">({report.overall_rating}/5)</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
