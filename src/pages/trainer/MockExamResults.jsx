import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Users, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const EXAM_OPTIONS = [
  { code: 'midterm-mock-a1', label: 'A1 — مستوى ١' },
  { code: 'midterm-mock-b1', label: 'B1 — مستوى ٣' },
]

export default function MockExamResults() {
  const [examCode, setExamCode] = useState('midterm-mock-a1')
  const [expandedId, setExpandedId] = useState(null)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['mock-exam-attempts', examCode],
    queryFn: async () => {
      const { data: exam } = await supabase
        .from('mock_exams').select('id, title_ar, pass_threshold').eq('code', examCode).single()
      if (!exam) return []
      const { data, error } = await supabase
        .from('mock_exam_attempts')
        .select(`
          id, started_at, submitted_at, is_submitted, is_auto_submitted,
          score_total, passed, writing_word_count, writing_response, manual_writing_score,
          student:profiles!student_id(id, full_name, is_test_account, email)
        `)
        .eq('exam_id', exam.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 15_000,
  })

  const stats = useMemo(() => {
    const submitted = rows.filter((r) => r.is_submitted)
    const passed = submitted.filter((r) => r.passed === true).length
    const avg = submitted.length === 0 ? 0
      : submitted.reduce((a, r) => a + Number(r.score_total || 0), 0) / submitted.length
    return {
      total: rows.length,
      submitted: submitted.length,
      passed,
      avg,
    }
  }, [rows])

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5" dir="rtl">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>
          نتائج الاختبار التجريبي
        </h1>
        <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
          عرض كل المحاولات لكل اختبار. صفحة قراءة فقط — تعديل الدرجات يتم عبر قاعدة البيانات.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {EXAM_OPTIONS.map((opt) => (
          <button
            key={opt.code}
            type="button"
            onClick={() => setExamCode(opt.code)}
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="بدأ" value={stats.total} />
        <StatBox label="سلّم" value={stats.submitted} />
        <StatBox label="نجح" value={stats.passed} icon={<Trophy size={14} />} />
        <StatBox label="المتوسط" value={stats.avg.toFixed(1)} />
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
              <Th>كلمات الكتابة</Th>
              <Th>الحالة</Th>
              <Th>الكتابة</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="py-8 text-center" style={{ color: 'var(--ds-text-tertiary)' }}>...جاري التحميل</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center" style={{ color: 'var(--ds-text-tertiary)' }}>لا توجد محاولات بعد لهذا الاختبار.</td></tr>
            )}
            {rows.map((r) => {
              const submitted = r.is_submitted
              const isOpen = expandedId === r.id
              return (
                <Row key={r.id}>
                  <Td>
                    <div className="font-medium" style={{ color: 'var(--ds-text-primary)' }}>
                      {r.student?.full_name || '—'}
                      {r.student?.is_test_account && (
                        <span
                          className="text-[10px] me-2 px-1.5 py-0.5 rounded-full"
                          style={{
                            background: 'rgba(56,189,248,0.12)',
                            color: 'var(--ds-accent-info, #38bdf8)',
                          }}
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
                    {submitted ? (
                      r.passed
                        ? <span style={{ color: '#86efac' }}>نجحت ✓</span>
                        : <span style={{ color: 'var(--ds-text-secondary)' }}>لم تنجح</span>
                    ) : <span style={{ color: 'var(--ds-text-tertiary)' }}>قيد التنفيذ</span>}
                    {r.is_auto_submitted && (
                      <div className="text-[10px]" style={{ color: 'var(--ds-text-tertiary)' }}>تسليم تلقائي</div>
                    )}
                  </Td>
                  <Td>
                    {r.writing_response && (
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
                    {isOpen && r.writing_response && (
                      <div
                        className="mt-2 p-3 rounded-lg text-xs whitespace-pre-wrap text-left"
                        dir="ltr"
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: 'var(--ds-text-secondary)',
                          maxWidth: 320,
                        }}
                      >
                        {r.writing_response}
                      </div>
                    )}
                  </Td>
                </Row>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
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
  const d = new Date(iso)
  return d.toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' })
}
