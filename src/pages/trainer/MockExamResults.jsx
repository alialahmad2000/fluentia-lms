import { Fragment, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown, ChevronUp, Users, Trophy, Eye, EyeOff, Check, X, Save, Loader2,
  RefreshCw, Sparkles, AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import StuckAttemptsPanel from './StuckAttemptsPanel'

const EXAM_OPTIONS = [
  { code: 'midterm-mock-a1', label: 'A1 — مستوى ١' },
  { code: 'midterm-mock-b1', label: 'B1 — مستوى ٣' },
]

const SECTIONS = [
  { key: 'score_grammar',    label: 'القواعد',  section: 'grammar',    max: 30 },
  { key: 'score_reading',    label: 'القراءة',  section: 'reading',    max: 25 },
  { key: 'score_vocabulary', label: 'المفردات', section: 'vocabulary', max: 20 },
  { key: 'score_spelling',   label: 'الإملاء',  section: 'spelling',   max: 15 },
  { key: 'score_writing',    label: 'الكتابة',  section: 'writing',    max: 10 },
]

export default function MockExamResults() {
  const [examCode, setExamCode] = useState('midterm-mock-a1')
  const [expandedId, setExpandedId] = useState(null)
  const [revealBusy, setRevealBusy] = useState({})
  const qc = useQueryClient()

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ['mock-exam-attempts', examCode],
    queryFn: async () => {
      const { data: exam } = await supabase
        .from('mock_exams').select('id').eq('code', examCode).single()
      if (!exam) return []
      const { data, error } = await supabase
        .from('mock_exam_attempts')
        .select(`
          id, started_at, submitted_at, is_submitted, is_auto_submitted, is_revealed, revealed_at,
          score_total, passed, writing_word_count, writing_response, manual_writing_score,
          student:profiles!student_id(id, full_name, is_test_account, email)
        `)
        .eq('exam_id', exam.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 10_000,
  })

  const stats = useMemo(() => {
    const submitted = rows.filter((r) => r.is_submitted)
    const passed = submitted.filter((r) => r.passed === true).length
    const revealed = submitted.filter((r) => r.is_revealed === true).length
    const avg = submitted.length === 0 ? 0
      : submitted.reduce((a, r) => a + Number(r.score_total || 0), 0) / submitted.length
    return { total: rows.length, submitted: submitted.length, passed, revealed, avg }
  }, [rows])

  async function revealOne(attemptId, reveal) {
    setRevealBusy((b) => ({ ...b, [attemptId]: true }))
    try {
      const { data, error } = await supabase.rpc('mock_exam_reveal', {
        p_attempt_id: attemptId,
        p_exam_code: null,
        p_reveal: reveal,
      })
      if (error) throw error
      await refetch()
      if (expandedId === attemptId) {
        qc.invalidateQueries({ queryKey: ['mock-exam-result-staff', attemptId] })
      }
    } catch (e) {
      alert(`فشل: ${e?.message || e}`)
    } finally {
      setRevealBusy((b) => ({ ...b, [attemptId]: false }))
    }
  }

  async function revealAll(reveal) {
    const conf = reveal
      ? `تأكيد كشف نتائج كل الطلاب الذين سلموا اختبار ${examCode}؟`
      : `تأكيد إخفاء النتائج عن الطلاب؟`
    if (!window.confirm(conf)) return
    try {
      const { data, error } = await supabase.rpc('mock_exam_reveal', {
        p_attempt_id: null,
        p_exam_code: examCode,
        p_reveal: reveal,
      })
      if (error) throw error
      window.alert(`${reveal ? 'كشف' : 'إخفاء'} ${data.count} نتيجة`)
      await refetch()
    } catch (e) {
      alert(`فشل: ${e?.message || e}`)
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5" dir="rtl">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>
          نتائج الاختبار التجريبي
        </h1>
        <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
          عرض كل المحاولات. الكشف للطلاب يتم من هنا (لا يرون نتائجهم حتى تكشفها).
        </p>
      </header>

      {/* Stuck-attempts intervention panel (auto-refreshes every 60s) */}
      <StuckAttemptsPanel examCode={examCode} />

      {/* Exam tabs */}
      <div className="flex items-center gap-2">
        {EXAM_OPTIONS.map((opt) => (
          <button
            key={opt.code}
            type="button"
            onClick={() => { setExamCode(opt.code); setExpandedId(null) }}
            className="px-3 py-1.5 rounded-full text-sm transition-colors"
            style={{
              background: examCode === opt.code ? 'rgba(56,189,248,0.16)' : 'rgba(255,255,255,0.03)',
              color: examCode === opt.code ? 'var(--ds-accent-info, #38bdf8)' : 'var(--ds-text-secondary)',
              border: examCode === opt.code ? '1px solid var(--ds-accent-info, #38bdf8)' : '1px solid rgba(255,255,255,0.10)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stats + bulk reveal actions */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatBox label="بدأ" value={stats.total} />
        <StatBox label="سلّم" value={stats.submitted} />
        <StatBox label="نجح" value={stats.passed} icon={<Trophy size={14} />} />
        <StatBox label="مكشوف" value={`${stats.revealed}/${stats.submitted}`} icon={<Eye size={14} />} />
        <StatBox label="المتوسط" value={stats.avg.toFixed(1)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => revealAll(true)}
          className="px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
          style={{
            background: 'var(--ds-accent-primary, #e9b949)',
            color: '#0a0d14',
          }}
        >
          <Eye size={14} />
          كشف نتائج كل الطلاب
        </button>
        <button
          type="button"
          onClick={() => revealAll(false)}
          className="px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          style={{
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--ds-text-secondary)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <EyeOff size={14} />
          إخفاء كل النتائج
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <table className="w-full text-sm">
          <thead style={{ background: 'rgba(255,255,255,0.04)' }}>
            <tr>
              <Th>الطالبة</Th>
              <Th>بدأت</Th>
              <Th>سلّمت</Th>
              <Th>الدرجة</Th>
              <Th>كلمات</Th>
              <Th>الحالة</Th>
              <Th>الكشف</Th>
              <Th>تفاصيل</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="py-8 text-center" style={{ color: 'var(--ds-text-tertiary)' }}>...جاري التحميل</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center" style={{ color: 'var(--ds-text-tertiary)' }}>لا توجد محاولات بعد لهذا الاختبار.</td></tr>
            )}
            {rows.map((r) => {
              const submitted = r.is_submitted
              const isOpen = expandedId === r.id
              return (
                <Fragment key={r.id}>
                  <Row>
                    <Td>
                      <div className="font-medium" style={{ color: 'var(--ds-text-primary)' }}>
                        {r.student?.full_name || '—'}
                        {r.student?.is_test_account && (
                          <span
                            className="text-[10px] me-2 px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(56,189,248,0.12)', color: 'var(--ds-accent-info, #38bdf8)' }}
                          >
                            تجريبي
                          </span>
                        )}
                      </div>
                      <div className="text-[11px]" style={{ color: 'var(--ds-text-tertiary)' }}>
                        {r.student?.email}
                      </div>
                    </Td>
                    <Td>{fmtTime(r.started_at)}</Td>
                    <Td>{submitted ? fmtTime(r.submitted_at) : '—'}</Td>
                    <Td>
                      {submitted ? (
                        <span
                          className="font-mono tabular-nums"
                          style={{ color: r.passed ? '#86efac' : 'var(--ds-text-secondary)' }}
                        >
                          {Number(r.score_total).toFixed(1)} / 100
                        </span>
                      ) : '—'}
                    </Td>
                    <Td>{r.writing_word_count ?? 0}</Td>
                    <Td>
                      {submitted
                        ? (r.passed
                          ? <span style={{ color: '#86efac' }}>نجحت ✓</span>
                          : <span style={{ color: 'var(--ds-text-secondary)' }}>لم تنجح</span>)
                        : <span style={{ color: 'var(--ds-text-tertiary)' }}>قيد التنفيذ</span>}
                      {r.is_auto_submitted && (
                        <div className="text-[10px]" style={{ color: 'var(--ds-text-tertiary)' }}>تسليم تلقائي</div>
                      )}
                    </Td>
                    <Td>
                      {submitted ? (
                        <button
                          type="button"
                          onClick={() => revealOne(r.id, !r.is_revealed)}
                          disabled={!!revealBusy[r.id]}
                          className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5"
                          style={{
                            background: r.is_revealed ? 'rgba(233,185,73,0.14)' : 'rgba(148,163,184,0.10)',
                            color: r.is_revealed ? 'var(--ds-accent-primary, #e9b949)' : 'var(--ds-text-secondary)',
                            border: r.is_revealed ? '1px solid rgba(233,185,73,0.35)' : '1px solid rgba(148,163,184,0.20)',
                            opacity: revealBusy[r.id] ? 0.5 : 1,
                          }}
                        >
                          {revealBusy[r.id]
                            ? <Loader2 size={12} className="animate-spin" />
                            : (r.is_revealed ? <Eye size={12} /> : <EyeOff size={12} />)}
                          {r.is_revealed ? 'مكشوف' : 'قيد المراجعة'}
                        </button>
                      ) : '—'}
                    </Td>
                    <Td>
                      {submitted && (
                        <button
                          type="button"
                          onClick={() => setExpandedId(isOpen ? null : r.id)}
                          className="text-xs flex items-center gap-1"
                          style={{ color: 'var(--ds-accent-info, #38bdf8)' }}
                        >
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {isOpen ? 'إخفاء' : 'عرض'}
                        </button>
                      )}
                    </Td>
                  </Row>
                  {isOpen && (
                    <tr>
                      <td colSpan={8} className="p-0" style={{ background: 'rgba(0,0,0,0.18)' }}>
                        <AttemptDetail attemptId={r.id} onMutated={refetch} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AttemptDetail({ attemptId, onMutated }) {
  const qc = useQueryClient()
  const { data: result, isLoading, refetch } = useQuery({
    queryKey: ['mock-exam-result-staff', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('mock_exam_get_result', { p_attempt_id: attemptId })
      if (error) throw error
      return data
    },
    enabled: !!attemptId,
    staleTime: 5_000,
  })

  if (isLoading || !result) {
    return (
      <div className="p-6 text-center text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
        ...جاري التحميل
      </div>
    )
  }

  const sectionGroups = SECTIONS.map((s) => ({
    ...s,
    score: Number(result[s.key] ?? 0),
    questions: (result.questions || []).filter((q) => q.section === s.section),
  })).filter((g) => g.questions.length > 0)

  const writingQ = (result.questions || []).find((q) => q.section === 'writing')

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
        {SECTIONS.map((s) => (
          <div
            key={s.key}
            className="p-2 rounded-md text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div style={{ color: 'var(--ds-text-tertiary)' }}>{s.label}</div>
            <div className="font-mono tabular-nums" style={{ color: 'var(--ds-text-primary)' }}>
              {Number(result[s.key] ?? 0).toFixed(1)}/{s.max}
            </div>
          </div>
        ))}
        <div
          className="p-2 rounded-md text-center"
          style={{ background: 'rgba(233,185,73,0.10)', border: '1px solid rgba(233,185,73,0.30)' }}
        >
          <div style={{ color: 'var(--ds-text-tertiary)' }}>الإجمالي</div>
          <div className="font-mono tabular-nums font-semibold" style={{ color: 'var(--ds-accent-primary, #e9b949)' }}>
            {Number(result.score_total ?? 0).toFixed(1)}/100
          </div>
        </div>
      </div>

      {/* AI writing feedback panel */}
      <AiWritingPanel
        result={result}
        onMutated={async () => { await refetch(); qc.invalidateQueries({ queryKey: ['mock-exam-attempts'] }); onMutated?.() }}
      />

      {/* Writing block — most important */}
      {writingQ && (
        <WritingPanel
          q={writingQ}
          result={result}
          onSaved={async () => { await refetch(); qc.invalidateQueries({ queryKey: ['mock-exam-attempts'] }); onMutated?.() }}
        />
      )}

      {/* Per-section breakdown — staff always sees full detail */}
      <div className="space-y-3">
        {sectionGroups.filter((g) => g.section !== 'writing').map((g) => (
          <SectionAccordion key={g.section} group={g} />
        ))}
      </div>

      {/* Audit footer */}
      <div className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
        {result.is_revealed
          ? <>كُشِفت في {fmtTime(result.revealed_at)}</>
          : 'لم تُكشف بعد للطالبة'}
      </div>
    </div>
  )
}

function WritingPanel({ q, result, onSaved }) {
  const currentScore = result.score_writing
  const maxWriting = q?.points ?? 10
  const [newScore, setNewScore] = useState(
    currentScore !== null && currentScore !== undefined ? String(currentScore) : ''
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  async function save() {
    const n = Number(newScore)
    if (!Number.isFinite(n) || n < 0 || n > maxWriting) {
      setErr(`أدخل رقم بين 0 و ${maxWriting}`)
      return
    }
    setErr(null); setSaving(true)
    try {
      const { error } = await supabase.rpc('mock_exam_set_manual_writing_score', {
        p_attempt_id: result.attempt_id,
        p_score: n,
      })
      if (error) throw error
      await onSaved?.()
    } catch (e) {
      setErr(e?.message || String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
          الكتابة
        </div>
        <div className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
          {result.writing_word_count ?? 0} كلمة · الحد الأدنى {result.min_writing_words}
        </div>
      </div>
      {q?.stem && (
        <div
          className="text-xs leading-relaxed p-3 rounded-md"
          style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--ds-text-secondary)' }}
          dir="rtl"
        >
          {q.stem}
        </div>
      )}
      <div
        className="text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-md"
        dir="ltr"
        style={{
          background: 'rgba(255,255,255,0.04)',
          color: 'var(--ds-text-primary)',
          maxHeight: 280, overflowY: 'auto',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {result.writing_response || '— لم تكتبي شيئاً —'}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs" style={{ color: 'var(--ds-text-secondary)' }}>
          تعديل درجة الكتابة
        </label>
        <input
          type="number" min="0" max={maxWriting} step="0.5"
          value={newScore}
          onChange={(e) => setNewScore(e.target.value)}
          className="w-24 px-2 py-1.5 rounded-md text-sm font-mono tabular-nums"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'var(--ds-text-primary)',
          }}
        />
        <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>/ {maxWriting}</span>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5"
          style={{
            background: 'var(--ds-accent-info, #38bdf8)',
            color: '#0a0d14',
            opacity: saving ? 0.5 : 1,
          }}
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          {saving ? '...جاري الحفظ' : 'حفظ'}
        </button>
        {result.manual_writing_score !== null && result.manual_writing_score !== undefined && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(56,189,248,0.10)', color: 'var(--ds-accent-info, #38bdf8)' }}
          >
            مُعدّلة يدوياً
          </span>
        )}
      </div>
      {err && (
        <div className="text-xs" style={{ color: '#fca5a5' }}>{err}</div>
      )}
    </div>
  )
}

function AiWritingPanel({ result, onMutated }) {
  const [retrying, setRetrying] = useState(false)
  const [err, setErr] = useState(null)
  const status = result.ai_writing_status
  const score = result.ai_writing_score
  const just = result.ai_writing_justification_ar
  const strengths = Array.isArray(result.ai_writing_strengths_ar) ? result.ai_writing_strengths_ar : []
  const imps = Array.isArray(result.ai_writing_improvements_ar) ? result.ai_writing_improvements_ar : []

  async function retry() {
    if (retrying) return
    setRetrying(true); setErr(null)
    try {
      // 1) reset status to 'pending' via RPC (RLS-safe trainer/admin path)
      const { error: rErr } = await supabase.rpc('mock_exam_reset_ai_status', {
        p_attempt_id: result.attempt_id,
      })
      if (rErr) throw rErr
      // 2) invoke the edge function (fire-and-wait so we can refresh after)
      const { data, error: iErr } = await supabase.functions.invoke('mock-exam-grade-writing', {
        body: { attempt_id: result.attempt_id },
      })
      if (iErr) throw iErr
      await onMutated?.()
      if (data?.score !== undefined) {
        // Surface a small toast via alert (consistent with rest of trainer page)
        window.alert(`تم إعادة التقييم. الدرجة الجديدة: ${data.score}/10 (${data.layer || data.status})`)
      }
    } catch (e) {
      setErr(e?.message || String(e))
    } finally {
      setRetrying(false)
    }
  }

  const statusBadge = (() => {
    if (status === 'graded')   return { label: '✓ تم التقييم بنجاح', bg: 'rgba(34,197,94,0.14)', color: '#86efac', border: 'rgba(34,197,94,0.35)' }
    if (status === 'fallback') return { label: '⚠ احتياطي — يحتاج مراجعتك', bg: 'rgba(245,158,11,0.14)', color: '#fcd34d', border: 'rgba(245,158,11,0.35)' }
    if (status === 'pending')  return { label: '⏳ قيد المعالجة', bg: 'rgba(56,189,248,0.14)', color: '#7dd3fc', border: 'rgba(56,189,248,0.35)' }
    if (status === 'manual')   return { label: 'تم التعديل يدوياً', bg: 'rgba(139,92,246,0.14)', color: '#c4b5fd', border: 'rgba(139,92,246,0.35)' }
    if (status === 'failed')   return { label: '✗ فشل', bg: 'rgba(239,68,68,0.10)', color: '#fca5a5', border: 'rgba(239,68,68,0.30)' }
    return { label: status || '—', bg: 'rgba(255,255,255,0.04)', color: 'var(--ds-text-secondary)', border: 'rgba(255,255,255,0.10)' }
  })()

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: 'rgba(139,92,246,0.04)',
        border: '1px solid rgba(139,92,246,0.20)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--ds-text-primary)' }}>
          <Sparkles size={14} style={{ color: '#c4b5fd' }} />
          تقييم الذكاء الاصطناعي للكتابة
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: statusBadge.bg, color: statusBadge.color, border: `1px solid ${statusBadge.border}` }}
        >
          {statusBadge.label}
        </span>
      </div>

      {(score !== null && score !== undefined) && (
        <div className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
          <span>درجة AI: <strong className="font-mono tabular-nums">{Number(score).toFixed(Number(score) % 1 ? 1 : 0)}/10</strong></span>
          {result.manual_writing_score !== null && result.manual_writing_score !== undefined && (
            <span> · الدرجة النهائية: <strong className="font-mono tabular-nums">{Number(result.manual_writing_score).toFixed(Number(result.manual_writing_score) % 1 ? 1 : 0)}/10</strong> <span style={{ color: 'var(--ds-text-tertiary)' }}>(يدوي)</span></span>
          )}
        </div>
      )}

      {just && (
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--ds-text-tertiary)' }}>التبرير:</div>
          <p className="text-sm leading-relaxed" dir="rtl" style={{ color: 'var(--ds-text-primary)' }}>{just}</p>
        </div>
      )}

      {strengths.length > 0 && (
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--ds-text-tertiary)' }}>نقاط القوة:</div>
          <ul className="text-sm space-y-0.5" dir="rtl" style={{ color: 'var(--ds-text-secondary)' }}>
            {strengths.map((s, i) => <li key={i}>✓ {s}</li>)}
          </ul>
        </div>
      )}

      {imps.length > 0 && (
        <div>
          <div className="text-xs mb-1" style={{ color: 'var(--ds-text-tertiary)' }}>للتحسين:</div>
          <ul className="text-sm space-y-0.5" dir="rtl" style={{ color: 'var(--ds-text-secondary)' }}>
            {imps.map((s, i) => <li key={i}>→ {s}</li>)}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={retry}
          disabled={retrying || status === 'pending'}
          className="text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5"
          style={{
            background: 'rgba(139,92,246,0.12)',
            color: '#c4b5fd',
            border: '1px solid rgba(139,92,246,0.30)',
            opacity: retrying || status === 'pending' ? 0.5 : 1,
          }}
        >
          {retrying ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {retrying ? '...جاري إعادة التقييم' : 'إعادة التقييم بالذكاء الاصطناعي'}
        </button>
        {err && (
          <span className="text-xs flex items-center gap-1" style={{ color: '#fca5a5' }}>
            <AlertTriangle size={12} />
            {err}
          </span>
        )}
      </div>
    </div>
  )
}

function SectionAccordion({ group }) {
  return (
    <details
      className="group rounded-xl"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <summary
        className="cursor-pointer p-3 flex items-center justify-between list-none"
        style={{ color: 'var(--ds-text-primary)' }}
      >
        <div className="text-sm font-semibold">
          {group.label} <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>({group.questions.length})</span>
        </div>
        <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--ds-text-secondary)' }}>
          {group.score.toFixed(1)} / {group.max}
        </span>
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-3">
        {group.section === 'reading'
          ? <ReadingGroup questions={group.questions} />
          : group.questions.map((q) => <QuestionRow key={q.question_id} q={q} />)
        }
      </div>
    </details>
  )
}

function ReadingGroup({ questions }) {
  const groups = {}
  for (const q of questions) {
    const k = q.passage_group || 1
    if (!groups[k]) groups[k] = { title: q.passage_title, text: q.passage_text, qs: [] }
    groups[k].qs.push(q)
  }
  return (
    <div className="space-y-4">
      {Object.values(groups).map((g, i) => (
        <div key={i} className="space-y-2">
          <details className="rounded-md" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <summary
              className="cursor-pointer px-3 py-2 text-xs font-semibold list-none"
              style={{ color: 'var(--ds-text-secondary)' }}
            >
              {g.title || `Passage ${i + 1}`} — اضغطي لعرض النص
            </summary>
            <div
              className="text-xs leading-6 px-3 pb-3 whitespace-pre-line"
              dir="ltr"
              style={{ color: 'var(--ds-text-secondary)' }}
            >
              {g.text}
            </div>
          </details>
          {g.qs.map((q) => <QuestionRow key={q.question_id} q={q} />)}
        </div>
      ))}
    </div>
  )
}

function QuestionRow({ q }) {
  const correct = q.is_correct === true
  const answered =
    Number.isInteger(q.student_selected_index) ||
    (q.student_text_answer && q.student_text_answer.trim().length > 0)
  return (
    <div
      className="p-3 rounded-md space-y-2 text-sm"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div dir={/[؀-ۿ]/.test(q.stem) ? 'rtl' : 'ltr'} style={{ color: 'var(--ds-text-primary)' }}>
          {q.stem}
        </div>
        <ScoreBadge correct={correct} answered={answered} p={q.points_awarded} m={q.points} />
      </div>
      {Array.isArray(q.options) && q.options.length > 0 && (
        <div className="space-y-1">
          {q.options.map((opt, idx) => {
            const isCorrect = idx === q.correct_index
            const isPicked = idx === q.student_selected_index
            let bg = 'rgba(255,255,255,0.015)'
            let color = 'var(--ds-text-tertiary)'
            let icon = null
            if (isCorrect) { bg = 'rgba(34,197,94,0.10)'; color = '#86efac'; icon = <Check size={12} /> }
            else if (isPicked) { bg = 'rgba(239,68,68,0.08)'; color = '#fca5a5'; icon = <X size={12} /> }
            const label = q.question_type === 'error_detection'
              ? String(idx + 1)
              : (['A','B','C','D'][idx] || String(idx + 1))
            return (
              <div key={idx} className="text-xs px-2 py-1 rounded flex items-center gap-2"
                style={{ background: bg, color }}
              >
                <span style={{ minWidth: 18, textAlign: 'center', color: 'var(--ds-text-tertiary)' }}>{label}.</span>
                <span dir={/[؀-ۿ]/.test(opt) ? 'rtl' : 'ltr'}>{opt}</span>
                {icon && <span className="ms-auto">{icon}</span>}
                {isPicked && <span className="text-[10px]" style={{ color: 'var(--ds-text-tertiary)' }}>إجابة الطالبة</span>}
              </div>
            )
          })}
        </div>
      )}
      {q.question_type === 'fill_blank' && (
        <div className="text-xs space-y-1">
          <div style={{ color: 'var(--ds-text-secondary)' }}>
            إجابة الطالبة: <span dir="auto" style={{ color: correct ? '#86efac' : '#fca5a5' }}>{q.student_text_answer || '—'}</span>
          </div>
          {Array.isArray(q.acceptable_answers) && q.acceptable_answers.length > 0 && (
            <div style={{ color: 'var(--ds-text-tertiary)' }}>
              المقبول: <span dir="auto" style={{ color: '#86efac' }}>{q.acceptable_answers.join('، ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScoreBadge({ correct, answered, p, m }) {
  const pp = Number(p ?? 0); const mm = Number(m ?? 0)
  if (!answered) return (
    <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{
      background: 'rgba(148,163,184,0.08)', color: 'var(--ds-text-tertiary)',
    }}>—</span>
  )
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1" style={{
      background: correct ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.08)',
      color: correct ? '#86efac' : '#fca5a5',
    }}>
      {correct ? <Check size={10} /> : <X size={10} />}
      {pp.toFixed(pp % 1 ? 1 : 0)}/{mm}
    </span>
  )
}

function StatBox({ label, value, icon }) {
  return (
    <div
      className="p-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="text-xs flex items-center gap-1.5" style={{ color: 'var(--ds-text-tertiary)' }}>
        {icon || <Users size={14} />}
        {label}
      </div>
      <div className="text-xl font-bold tabular-nums" style={{ color: 'var(--ds-text-primary)' }}>{value}</div>
    </div>
  )
}

function Th({ children }) {
  return <th className="text-right text-xs font-semibold px-3 py-2" style={{ color: 'var(--ds-text-tertiary)' }}>{children}</th>
}
function Td({ children }) {
  return <td className="px-3 py-3 align-top" style={{ color: 'var(--ds-text-secondary)' }}>{children}</td>
}
function Row({ children }) {
  return <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>{children}</tr>
}
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' })
}
