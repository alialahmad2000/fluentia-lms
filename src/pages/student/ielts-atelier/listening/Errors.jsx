import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Headphones, SpellCheck, Hash, Undo2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useG } from '@/i18n/gender'
import { useStudentId } from '../_helpers/resolveStudentId'
import { LabHeader, Card } from '../_ui/primitives'

const BASE = '/student/ielts-atelier'

// ─── أخطائي في الاستماع ──────────────────────────────────────────────────────
// Reading's error page groups by CAUSE, using classifyCause() from the shared
// grader. Listening errors carry no cause: useListeningLab never sets the column,
// and the four reading causes (paraphrase_trap / not_located / misread /
// ran_out_of_time) do not describe listening failures anyway — in listening you
// lose marks to spelling, to number confusion, and to a speaker's correction.
//
// So this page does not invent a diagnosis. It shows what was actually recorded —
// her answer against the key — and groups by a pattern that can be read straight
// off the pair without guessing at intent.

const PATTERNS = [
  {
    key: 'spelling', icon: SpellCheck, label: 'إملاء',
    hint: 'الحروف قريبة من الصحيح — الإجابة سُمعت صح وكُتبت خطأ. في الاستماع هذا يُحتسب خطأً كاملاً.',
    test: (given, exp) => given && exp && !/\d/.test(exp) && near(given, exp),
  },
  {
    key: 'number', icon: Hash, label: 'أرقام وتواريخ',
    hint: 'الأرقام والتواريخ والأوقات — انتبهي إلى نبر -teen مقابل -ty، وإلى صيغة التاريخ.',
    test: (_g, exp) => /\d/.test(exp || ''),
  },
  {
    key: 'form', icon: Undo2, label: 'صياغة زائدة',
    hint: 'المعنى صحيح لكن الإجابة أطول من المطلوب. احترمي حدّ الكلمات: الزيادة تُلغي الإجابة الصحيحة.',
    test: (given, exp) => given && exp && given.trim().split(/\s+/).length > exp.replace(/[()]/g, '').trim().split(/\s+/).length + 1,
  },
]

// crude closeness: same first letter and within two edits of length — enough to
// separate a misspelling from a completely different word, without pretending to
// be a real edit-distance diagnosis
function near(a, b) {
  const x = String(a).trim().toLowerCase().replace(/[^a-z]/g, '')
  const y = String(b).trim().toLowerCase().replace(/[^a-z]/g, '')
  if (!x || !y) return false
  return x[0] === y[0] && Math.abs(x.length - y.length) <= 3
}

function classify(given, expected) {
  for (const p of PATTERNS) {
    try { if (p.test(given, expected)) return p } catch { /* ignore */ }
  }
  return null
}

function useListeningErrors(studentId) {
  return useQuery({
    queryKey: ['ielts-listening-errors', studentId],
    enabled: !!studentId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_error_bank')
        .select('id, question_type, question_text, student_answer, correct_answer, explanation, mastered, first_seen_at')
        .eq('student_id', studentId)
        .eq('skill_type', 'listening')
        .eq('mastered', false)
        .order('first_seen_at', { ascending: false })
        .limit(60)
      if (error) throw error
      return data || []
    },
  })
}

const PART_AR = { section_1: 'الجزء الأول', section_2: 'الجزء الثاني', section_3: 'الجزء الثالث', section_4: 'الجزء الرابع' }

export default function ListeningErrors() {
  const g = useG()
  const navigate = useNavigate()
  const studentId = useStudentId()
  const { data: errors = [], isLoading } = useListeningErrors(studentId)

  const grouped = useMemo(() => {
    const counts = {}
    for (const e of errors) {
      const p = classify(e.student_answer, e.correct_answer)
      if (p) counts[p.key] = (counts[p.key] || 0) + 1
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return { counts, top: top ? PATTERNS.find((p) => p.key === top[0]) : null, topN: top ? top[1] : 0 }
  }, [errors])

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 40, maxWidth: 940 }}>
      <LabHeader eyebrow="حلقة الإغلاق · التشخيص" title="أخطائي في الاستماع">
        {g('كل إجابة فاتتك، ومعها ما كتبتَه وما كان مطلوباً. في الاستماع أكثر الدرجات تُفقد في الكتابة لا في السمع — إجابة سُمعت صح وكُتبت خطأ تُحتسب صفراً.',
           'كل إجابة فاتتكِ، ومعها ما كتبتِه وما كان مطلوباً. في الاستماع أكثر الدرجات تُفقد في الكتابة لا في السمع — إجابة سُمعت صح وكُتبت خطأ تُحتسب صفراً.')}
      </LabHeader>

      {isLoading ? (
        <Card style={{ padding: 26, color: 'var(--iel-ink-3)', fontSize: 13 }}>…</Card>
      ) : errors.length === 0 ? (
        <Card style={{ padding: '30px 22px', textAlign: 'center' }}>
          <Headphones size={26} style={{ color: 'var(--iel-ink-3)', marginBottom: 10 }} />
          <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 7 }}>لا أخطاء مسجّلة بعد</div>
          <div style={{ fontSize: 13, color: 'var(--iel-ink-3)', lineHeight: 1.85, maxWidth: 460, margin: '0 auto 16px' }}>
            {g('تمتلئ هذه الصفحة تلقائياً من تمارينك. اجلس قسماً واحداً وسيظهر هنا كل ما فاتك ومعه الإجابة الصحيحة.',
               'تمتلئ هذه الصفحة تلقائياً من تمارينك. اجلسي قسماً واحداً وسيظهر هنا كل ما فاتكِ ومعه الإجابة الصحيحة.')}
          </div>
          <button
            onClick={() => navigate(`${BASE}/listening`)}
            style={{ padding: '11px 18px', borderRadius: 11, border: 0, cursor: 'pointer', background: 'var(--iel-accent)', color: '#fff', fontFamily: "'Tajawal', sans-serif", fontSize: 13.5, fontWeight: 800 }}
          >
            {g('ابدأ قسماً', 'ابدئي قسماً')}
          </button>
        </Card>
      ) : (
        <>
          {/* Only claim a pattern when enough errors share it to mean something. */}
          {grouped.top && grouped.topN >= 3 && (
            <Card style={{ padding: '17px 19px', borderColor: 'color-mix(in srgb, var(--iel-gold) 30%, var(--iel-border))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', background: 'var(--iel-gold-soft, rgba(234,179,8,.14))', color: 'var(--iel-gold-ink)', flex: 'none' }}>
                  <grouped.top.icon size={15} />
                </span>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--iel-ink)' }}>
                  أكثر ما يتكرّر: {grouped.top.label}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--iel-ink-2)', lineHeight: 1.85 }}>{grouped.top.hint}</div>
            </Card>
          )}

          <Card style={{ padding: '15px 17px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 12 }}>
              {errors.length} إجابة تحتاج مراجعة
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {errors.map((e) => {
                const p = classify(e.student_answer, e.correct_answer)
                return (
                  <div key={e.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--iel-ink-3)' }}>{PART_AR[e.question_type] || e.question_type}</span>
                      {p && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, background: 'var(--iel-gold-soft, rgba(234,179,8,.12))', color: 'var(--iel-gold-ink)' }}>{p.label}</span>
                      )}
                    </div>
                    {e.question_text && (
                      <div dir="auto" style={{ fontSize: 12.5, color: 'var(--iel-ink-2)', lineHeight: 1.7, marginBottom: 8 }}>{e.question_text}</div>
                    )}
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5 }}>
                      <span dir="ltr" style={{ color: 'var(--iel-bad)', textDecoration: 'line-through', fontFamily: "-apple-system, Arial, sans-serif" }}>
                        {e.student_answer || '—'}
                      </span>
                      <span dir="ltr" style={{ color: 'var(--iel-good)', fontWeight: 700, fontFamily: "-apple-system, Arial, sans-serif" }}>
                        {e.correct_answer || '—'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
