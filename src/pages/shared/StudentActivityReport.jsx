import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowRight, ChevronRight, ChevronLeft, Download, FileText, RefreshCw,
  Sparkles, Clock, BookOpen, Target, Zap, Mic, CheckCircle2,
  TrendingUp, TrendingDown, Calendar, Loader2, Repeat, Share2, Copy, X,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../../lib/supabase'
import { useStudentActivityReport } from '../../hooks/useStudentActivityReport'
import { exportToCSV } from '../../utils/exportData'
import { openPrintableReport } from '../../utils/activityReportPrint'

// ─── Shared formatting ──────────────────────────────────────
export const SKILL_LABELS = {
  reading: 'القراءة', writing: 'الكتابة', speaking: 'المحادثة',
  listening: 'الاستماع', grammar: 'القواعد', vocabulary: 'المفردات',
  pronunciation: 'النطق', vocabulary_exercise: 'تمارين المفردات',
}
const RANGE_OPTIONS = [
  { k: 'day', label: 'يوم' }, { k: 'week', label: 'أسبوع' },
  { k: 'month', label: 'شهر' }, { k: 'custom', label: 'مخصّص' },
]
const RANGE_LABEL = { day: 'يوم', week: 'أسبوع', month: 'شهر', custom: 'فترة مخصّصة' }

const riyadhToday = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10)
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const addMonths = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10) }

export function fmtMins(m) {
  m = Math.round(m || 0)
  if (m < 60) return `${m} د`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h}س ${r}د` : `${h}س`
}
export function fmtDateAr(d) {
  if (!d) return ''
  try { return new Date(String(d).length === 10 ? d + 'T00:00:00Z' : d).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }) }
  catch { return String(d) }
}
function denseSeries(range, daily) {
  if (!range?.start || !range?.end) return daily || []
  const map = Object.fromEntries((daily || []).map((d) => [d.date, d]))
  const out = []
  let cur = range.start, guard = 0
  while (cur <= range.end && guard < 400) {
    out.push(map[cur] || { date: cur, learning_minutes: 0, sections_completed: 0, xp: 0, words_mastered: 0, session_count: 0 })
    cur = addDays(cur, 1); guard++
  }
  return out
}

// ═══════════════════════════════════════════════════════════════
// Reusable report body (used by the staff page AND the public link)
// ═══════════════════════════════════════════════════════════════
export function ReportContent({ report, ai, onRegenerate, regenerating, readOnly = false }) {
  const t = report?.totals || {}
  const sk = report?.skills || {}
  const dense = useMemo(() => denseSeries(report?.range, report?.daily), [report])
  const chartData = useMemo(
    () => dense.map((d) => ({ name: String(d.date).slice(8), mins: d.learning_minutes || 0, sections: d.sections_completed || 0, xp: d.xp || 0, words: d.words_mastered || 0 })),
    [dense],
  )

  return (
    <>
      <AISummary ai={ai} onRegenerate={onRegenerate} regenerating={regenerating} readOnly={readOnly} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Clock} color="sky" label="وقت التعلّم النشِط" value={fmtMins(t.learning_minutes)} sub={`${t.active_days || 0} يوم نشِط`} />
        <Stat icon={BookOpen} color="violet" label="دروس مكتملة" value={t.sections_completed || 0} sub={t.avg_score != null ? `متوسط ${t.avg_score}%` : '—'} />
        <Stat icon={Sparkles} color="emerald" label="كلمات أُتقنت" value={t.words_mastered || 0} sub={`${(t.words_practiced || 0) + (t.words_reviewed || 0)} مراجعة`} />
        <Stat icon={Zap} color="amber" label="نقاط الخبرة" value={`${t.xp_earned || 0}`} sub={`${t.session_count || 0} جلسة`} />
      </div>

      {chartData.length > 1 && (
        <Card title="النشاط اليومي — دقائق التعلّم">
          {chartData.every((d) => d.mins === 0 && d.sections === 0) ? (
            <EmptyInline text="لا يوجد نشاط مُسجّل في هذه الفترة." />
          ) : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} interval={chartData.length > 14 ? 4 : 0} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: 12, fontSize: 12, direction: 'rtl' }}
                    formatter={(v, n) => [`${v}`, n === 'mins' ? 'دقائق' : n]}
                    labelFormatter={(l) => `يوم ${l}`}
                  />
                  <Bar dataKey="mins" fill="var(--accent-sky)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}

      <SkillsSection skills={sk} />
      <WordsLearned words={report?.words_mastered_list || []} />
      <LessonsList lessons={report?.lessons || []} />
      <Timeline items={report?.timeline || []} />
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// Staff page: header + period controls + export/share + body
// ═══════════════════════════════════════════════════════════════
export default function StudentActivityReport() {
  const { studentId } = useParams()
  const navigate = useNavigate()

  const [range, setRange] = useState('week')
  const [anchor, setAnchor] = useState(riyadhToday())
  const [customStart, setCustomStart] = useState(addDays(riyadhToday(), -13))
  const [customEnd, setCustomEnd] = useState(riyadhToday())
  const [force, setForce] = useState(false)
  const [share, setShare] = useState(null)   // { url } | null
  const [sharing, setSharing] = useState(false)

  const resetForce = () => setForce(false)
  const pickRange = (k) => { setRange(k); resetForce() }
  const shift = (dir) => {
    resetForce()
    if (range === 'day') setAnchor((a) => addDays(a, dir))
    else if (range === 'week') setAnchor((a) => addDays(a, dir * 7))
    else if (range === 'month') setAnchor((a) => addMonths(a, dir))
  }

  const isCustom = range === 'custom'
  const today = riyadhToday()
  const canNext = range === 'day' || range === 'week' ? anchor < today : range === 'month' ? anchor.slice(0, 7) < today.slice(0, 7) : false

  const query = useStudentActivityReport({
    studentId, range,
    date: isCustom ? undefined : anchor,
    start: isCustom ? customStart : undefined,
    end: isCustom ? customEnd : undefined,
    withAI: true, force,
  })
  const { data, isLoading, isFetching, error, refetch } = query
  const report = data?.report
  const ai = data?.ai
  const period = data?.period

  const regenerate = () => { setForce(true); setTimeout(() => refetch(), 0) }

  const exportCSV = () => {
    if (!report) return
    const cols = [
      { key: 'date', label: 'التاريخ' }, { key: 'learning_minutes', label: 'دقائق التعلّم' },
      { key: 'sections_completed', label: 'أقسام مكتملة' }, { key: 'words_mastered', label: 'كلمات متقنة' },
      { key: 'words_practiced', label: 'كلمات تدرّبت' }, { key: 'words_reviewed', label: 'مراجعات' },
      { key: 'xp', label: 'XP' }, { key: 'session_count', label: 'جلسات' },
    ]
    exportToCSV(report.daily || [], `تقرير_${report.student?.name || 'طالب'}_${RANGE_LABEL[range]}`, cols)
  }
  const exportPDF = () => { if (report) openPrintableReport({ report, ai, period, rangeLabel: RANGE_LABEL[range] }) }

  const createShare = async () => {
    if (!report || !period) return
    setSharing(true)
    try {
      const { data: token, error: e } = await supabase.rpc('create_activity_report_share', {
        p_student: studentId, p_range_type: range,
        p_start: period.start, p_end: period.end, p_expires_days: 30,
      })
      if (e || !token) throw new Error(e?.message || 'تعذّر إنشاء الرابط')
      const url = `${window.location.origin}/report/${token}`
      try { await navigator.clipboard.writeText(url) } catch { /* ignore */ }
      setShare({ url })
    } catch (err) {
      alert(err.message || 'تعذّر إنشاء الرابط')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="space-y-5" dir="rtl">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-medium min-h-[44px]" style={{ color: 'var(--text-secondary)' }}>
        <ArrowRight size={16} /> رجوع
      </button>

      {/* Header */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles size={18} style={{ color: 'var(--accent-sky)' }} />
              <h1 className="text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                تقرير النشاط{report?.student?.name ? ` — ${report.student.name}` : ''}
              </h1>
            </div>
            <div className="flex items-center gap-3 flex-wrap mt-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {report?.student?.level != null && <span>المستوى {report.student.level}</span>}
              {report?.student?.group && <span>{report.student.group}</span>}
              {report?.student?.current_streak > 0 && <span style={{ color: 'var(--accent-rose)' }}>🔥 {report.student.current_streak} يوم</span>}
              {period && <span>{fmtDateAr(period.start)} — {fmtDateAr(period.end)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ActionBtn icon={Share2} label="مشاركة" onClick={createShare} disabled={!report || sharing} loading={sharing} />
            <ActionBtn icon={FileText} label="PDF" onClick={exportPDF} disabled={!report} />
            <ActionBtn icon={Download} label="CSV" onClick={exportCSV} disabled={!report} />
          </div>
        </div>
      </div>

      {/* Period controls */}
      <div className="rounded-2xl p-3 flex items-center justify-between gap-3 flex-wrap" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((o) => (
            <button key={o.k} onClick={() => pickRange(o.k)}
              className="px-3 py-2 rounded-xl text-sm font-medium min-h-[40px] transition-all"
              style={{
                background: range === o.k ? 'rgba(56,189,248,0.14)' : 'transparent',
                color: range === o.k ? 'var(--accent-sky)' : 'var(--text-secondary)',
                border: range === o.k ? '1px solid rgba(56,189,248,0.25)' : '1px solid transparent',
              }}>
              {o.label}
            </button>
          ))}
        </div>
        {!isCustom ? (
          <div className="flex items-center gap-2">
            <NavArrow dir={1} onClick={() => shift(-1)} />
            <span className="text-sm font-medium min-w-[130px] text-center flex items-center justify-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
              {period ? `${fmtDateAr(period.start)} — ${fmtDateAr(period.end)}` : '…'}
            </span>
            <NavArrow dir={-1} onClick={() => canNext && shift(1)} disabled={!canNext} />
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <input type="date" value={customStart} max={customEnd} onChange={(e) => { setCustomStart(e.target.value); resetForce() }} className="bg-transparent rounded-lg px-2 py-1.5" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
            <span>—</span>
            <input type="date" value={customEnd} min={customStart} max={today} onChange={(e) => { setCustomEnd(e.target.value); resetForce() }} className="bg-transparent rounded-lg px-2 py-1.5" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
          </div>
        )}
      </div>

      {isLoading ? (
        <ReportSkeleton />
      ) : error ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-sm mb-3" style={{ color: 'var(--accent-rose)' }}>تعذّر تحميل التقرير: {error.message}</p>
          <button onClick={() => refetch()} className="text-sm" style={{ color: 'var(--accent-sky)' }}>إعادة المحاولة</button>
        </div>
      ) : !report ? (
        <EmptyState text="لا توجد بيانات." />
      ) : (
        <ReportContent report={report} ai={ai} onRegenerate={regenerate} regenerating={isFetching && force} />
      )}

      {share && <ShareModal url={share.url} onClose={() => setShare(null)} />}
    </div>
  )
}

// ─── Share modal ────────────────────────────────────────────
function ShareModal({ url, onClose }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ } }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-md" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><Share2 size={16} style={{ color: 'var(--accent-sky)' }} /> رابط ولي الأمر</h3>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}><X size={18} /></button>
        </div>
        <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          رابط للقراءة فقط يعرض تقرير هذه الفترة، صالح لمدة ٣٠ يوماً. يمكن لولي الأمر فتحه دون تسجيل دخول.
        </p>
        <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)' }}>
          <input readOnly value={url} className="flex-1 bg-transparent text-xs outline-none" style={{ color: 'var(--text-secondary)' }} onFocus={(e) => e.target.select()} />
          <button onClick={copy} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(56,189,248,0.12)', color: 'var(--accent-sky)' }}>
            <Copy size={13} /> {copied ? 'تم النسخ' : 'نسخ'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────
function ActionBtn({ icon: Icon, label, onClick, disabled, loading }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium min-h-[40px] transition-all disabled:opacity-40"
      style={{ background: 'rgba(56,189,248,0.08)', color: 'var(--accent-sky)', border: '1px solid rgba(56,189,248,0.15)' }}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />} {label}
    </button>
  )
}
function NavArrow({ dir, onClick, disabled }) {
  const Icon = dir === 1 ? ChevronRight : ChevronLeft
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
      style={{ background: 'var(--surface-overlay)', color: 'var(--text-secondary)' }}>
      <Icon size={18} />
    </button>
  )
}
function AISummary({ ai, onRegenerate, regenerating, readOnly }) {
  const hasNarrative = ai?.narrative
  return (
    <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(180deg, rgba(56,189,248,0.06), var(--glass-card))', border: '1px solid rgba(56,189,248,0.15)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Sparkles size={16} style={{ color: 'var(--accent-sky)' }} /> ملخّص الفترة
        </h3>
        {!readOnly && onRegenerate && (
          <button onClick={onRegenerate} disabled={regenerating}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg disabled:opacity-50" style={{ color: 'var(--text-tertiary)' }}>
            {regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} تحديث
          </button>
        )}
      </div>
      {regenerating && !hasNarrative ? (
        <div className="space-y-2">
          <div className="skeleton h-4 w-full rounded" /><div className="skeleton h-4 w-5/6 rounded" /><div className="skeleton h-4 w-2/3 rounded" />
        </div>
      ) : hasNarrative ? (
        <>
          <p className="text-sm leading-loose whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{ai.narrative}</p>
          {ai.next_steps?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--accent-sky)' }}>الخطوات التالية المقترحة</p>
              <ul className="space-y-1.5">
                {ai.next_steps.map((s, i) => (
                  <li key={i} className="text-sm flex items-start gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-emerald)' }} /><span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>الملخّص الذكي غير متاح لهذه الفترة.</p>
      )}
    </div>
  )
}
function SkillsSection({ skills }) {
  const period = skills?.period || {}
  const current = skills?.current || null
  const entries = Object.entries(period)
  if (entries.length === 0) {
    return <Card title="المهارات — نقاط القوة والضعف"><EmptyInline text="لا توجد أقسام مكتملة في هذه الفترة لتقييم المهارات." /></Card>
  }
  return (
    <Card title="المهارات — نقاط القوة والضعف">
      <div className="flex gap-2 flex-wrap mb-4">
        {skills.strongest && (
          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--accent-emerald)' }}>
            <TrendingUp size={13} /> الأقوى: {SKILL_LABELS[skills.strongest] || skills.strongest}
          </span>
        )}
        {skills.weakest && skills.weakest !== skills.strongest && (
          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--accent-rose)' }}>
            <TrendingDown size={13} /> يحتاج تركيز: {SKILL_LABELS[skills.weakest] || skills.weakest}
          </span>
        )}
      </div>
      <div className="space-y-2.5">
        {entries.sort((a, b) => (b[1].avg_score ?? -1) - (a[1].avg_score ?? -1)).map(([key, v]) => {
          const score = v.avg_score
          const color = score == null ? 'var(--text-tertiary)' : score >= 70 ? 'var(--accent-emerald)' : score >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)'
          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs w-20 shrink-0" style={{ color: 'var(--text-secondary)' }}>{SKILL_LABELS[key] || key}</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-overlay)' }}>
                <div style={{ width: `${score == null ? 0 : score}%`, height: '100%', background: color, borderRadius: 999 }} />
              </div>
              <span className="text-xs font-bold w-16 text-left shrink-0" style={{ color }}>
                {score == null ? '—' : `${score}%`} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>({v.completed})</span>
              </span>
            </div>
          )
        })}
      </div>
      {current && (
        <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>المستوى التراكمي للمهارات</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {['grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing'].map((k) => (
              <div key={k} className="text-center p-2.5 rounded-xl" style={{ background: 'var(--surface-overlay)' }}>
                <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{current[k] ?? 0}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{SKILL_LABELS[k]}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
function WordsLearned({ words }) {
  const [expanded, setExpanded] = useState(false)
  if (!words.length) return null
  const shown = expanded ? words : words.slice(0, 24)
  return (
    <Card title={`الكلمات التي أُتقنت (${words.length})`}>
      <div className="flex flex-wrap gap-2">
        {shown.map((w, i) => (
          <span key={i} className="text-xs px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)' }}>
            <b style={{ color: 'var(--text-primary)' }}>{w.word}</b>
            {w.definition_ar && <span style={{ color: 'var(--text-tertiary)' }}> · {w.definition_ar}</span>}
          </span>
        ))}
      </div>
      {words.length > 24 && (
        <button onClick={() => setExpanded((e) => !e)} className="mt-3 text-xs" style={{ color: 'var(--accent-sky)' }}>
          {expanded ? 'عرض أقل' : `عرض الكل (${words.length})`}
        </button>
      )}
    </Card>
  )
}
function LessonsList({ lessons }) {
  if (!lessons.length) return null
  return (
    <Card title={`الدروس المكتملة (${lessons.length})`}>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm" style={{ minWidth: 420 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['القسم', 'الوحدة', 'الدرجة', 'التاريخ'].map((h) => (
                <th key={h} className="text-right py-2 px-2 text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lessons.map((l, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="py-2 px-2 font-medium" style={{ color: 'var(--text-primary)' }}>{SKILL_LABELS[l.section_type] || l.section_type}</td>
                <td className="py-2 px-2" style={{ color: 'var(--text-secondary)' }}>{l.unit || '—'}</td>
                <td className="py-2 px-2">
                  <span style={{ color: l.score == null ? 'var(--text-tertiary)' : l.score >= 70 ? 'var(--accent-emerald)' : l.score >= 40 ? 'var(--accent-amber)' : 'var(--accent-rose)' }}>
                    {l.score != null ? `${l.score}%` : '—'}
                  </span>
                </td>
                <td className="py-2 px-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>{fmtDateAr(l.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
const TL_ICON = { section: BookOpen, speaking: Mic, saved_word: Repeat }
function Timeline({ items }) {
  const [limit, setLimit] = useState(15)
  if (!items.length) return null
  const visible = items.slice(0, limit)
  return (
    <Card title="سجل النشاط">
      <div className="space-y-2">
        {visible.map((it, i) => {
          const Icon = TL_ICON[it.kind] || Target
          return (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl text-sm" style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
              <Icon size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--accent-sky)' }} />
              <div className="flex-1 min-w-0">
                <p style={{ color: 'var(--text-primary)' }}>
                  {it.kind === 'section' ? `أكملت ${SKILL_LABELS[it.label] || it.label}` : it.kind === 'speaking' ? 'سجّلت محادثة' : `أضافت كلمة: ${it.detail || ''}`}
                  {it.kind === 'section' && it.detail && <span className="text-xs mr-2" style={{ color: 'var(--text-tertiary)' }}>— {it.detail}</span>}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{fmtDateAr(it.at)}</p>
              </div>
              {it.score != null && (
                <span className="text-xs font-bold shrink-0 px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--accent-emerald)' }}>{it.score}%</span>
              )}
            </div>
          )
        })}
      </div>
      {items.length > limit && (
        <button onClick={() => setLimit((l) => l + 20)} className="w-full mt-2 py-2.5 text-sm font-medium rounded-xl min-h-[44px]" style={{ color: 'var(--accent-sky)', background: 'rgba(56,189,248,0.06)' }}>
          عرض المزيد ({items.length - limit})
        </button>
      )}
    </Card>
  )
}

// ─── Shared bits (exported for the public page) ──────────────
export function Card({ title, children }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}>
      {title && <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h3>}
      {children}
    </div>
  )
}
function Stat({ icon: Icon, label, value, sub, color }) {
  const colors = {
    sky: { bg: 'rgba(56,189,248,0.12)', fg: 'var(--accent-sky)' }, emerald: { bg: 'rgba(16,185,129,0.12)', fg: 'var(--accent-emerald)' },
    violet: { bg: 'rgba(139,92,246,0.12)', fg: 'var(--accent-violet)' }, amber: { bg: 'rgba(245,158,11,0.1)', fg: 'var(--accent-amber)' },
  }
  const c = colors[color] || colors.sky
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: c.bg }}>
        <Icon size={16} style={{ color: c.fg }} />
      </div>
      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{sub}</p>}
    </div>
  )
}
export function EmptyState({ text }) {
  return <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--glass-card)', border: '1px solid var(--border-subtle)' }}><p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{text}</p></div>
}
function EmptyInline({ text }) {
  return <p className="text-sm text-center py-4" style={{ color: 'var(--text-tertiary)' }}>{text}</p>
}
function ReportSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
      <div className="skeleton h-56 w-full rounded-2xl" />
    </div>
  )
}
