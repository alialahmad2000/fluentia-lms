import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, ArrowLeft, PenLine } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useG } from '@/i18n/gender'
import { useStudentId } from '../_helpers/resolveStudentId'
import { LabHeader, Card } from '../_ui/primitives'

const BASE = '/student/ielts-atelier'

// ─── أخطائي في الكتابة ───────────────────────────────────────────────────────
// Reading's error bank lists wrong answers, because reading HAS wrong answers.
// Writing does not — it has four criteria that move. So the closing loop here is
// a trend: which criterion is persistently lowest, is it moving, and which
// lesson treats it. Everything is derived from ai_feedback that the evaluator
// already stores per submission; no new table, no new column.

const CRITERIA = [
  { key: 'ta', alt: ['task_response', 'task_achievement'], label: 'تحقيق المهمة',
    lesson: { t1: 't1-01', t2: 't2-01' },
    fix: 'ابدئي بالسؤال نفسه: اكتبي تحته ما الذي يطلبه بالضبط (كم جزءاً؟)، ولا تسلّمي قبل أن تتأكّدي أنّ كل جزء له فقرة.' },
  { key: 'cc', alt: ['coherence_cohesion'], label: 'الترابط والتماسك',
    lesson: { t1: 't1-03', t2: 't2-05' },
    fix: 'افتحي كل فقرة بجملة فكرة واضحة، ثم احذفي نصف الروابط التي استعملتِها — الترتيب المنطقي يغني عنها.' },
  { key: 'lr', alt: ['lexical_resource'], label: 'الثروة اللغوية',
    lesson: { t1: 't1-04', t2: 't2-06' },
    fix: 'أعيدي صياغة كلمات السؤال في مقدمتك، ولا تكرّري الكلمة نفسها أكثر من مرّتين في النصّ كلّه.' },
  { key: 'gra', alt: ['grammatical_range'], label: 'القواعد ودقّتها',
    lesson: { t1: 't1-06', t2: 't2-07' },
    fix: 'اقرئي نصّك بصوت عالٍ: كل جملة تتجاوز سطرين اقسميها. ثم راجعي a / an / the وحدها في قراءة ثانية.' },
]

function score(fb, c) {
  if (!fb || typeof fb !== 'object') return null
  for (const k of [...c.alt, c.key]) {
    const n = fb[k]
    if (typeof n === 'number') return n
    if (n && typeof n === 'object' && n.score != null) return Number(n.score)
  }
  return null
}

function useWritingHistory(studentId) {
  return useQuery({
    queryKey: ['ielts-writing-history', studentId],
    enabled: !!studentId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_submissions')
        .select('id, submission_type, band_score, ai_feedback, submitted_at')
        .eq('student_id', studentId)
        .in('submission_type', ['writing_task1', 'writing_task2'])
        .not('ai_feedback', 'is', null)
        .order('submitted_at', { ascending: true })
      if (error) throw error
      return data || []
    },
  })
}

const COLOR = (b) => (b == null ? 'var(--iel-ink-3)' : b >= 7 ? 'var(--iel-good)' : b >= 6 ? 'var(--iel-warn)' : 'var(--iel-bad)')

export default function WritingErrors() {
  const g = useG()
  const navigate = useNavigate()
  const studentId = useStudentId()
  const { data: subs = [], isLoading } = useWritingHistory(studentId)

  const stats = useMemo(() => {
    if (!subs.length) return null
    const rows = CRITERIA.map((c) => {
      const series = subs.map((s) => score(s.ai_feedback, c)).filter((v) => typeof v === 'number' && !Number.isNaN(v))
      if (!series.length) return { c, avg: null, series: [], delta: null }
      const avg = series.reduce((a, b) => a + b, 0) / series.length
      // Trend = the last three graded pieces against the three before them, so a
      // single unusual essay cannot look like progress.
      const recent = series.slice(-3)
      const prior = series.slice(0, -3)
      const delta = prior.length
        ? (recent.reduce((a, b) => a + b, 0) / recent.length) - (prior.reduce((a, b) => a + b, 0) / prior.length)
        : null
      return { c, avg, series, delta }
    }).filter((r) => r.avg != null)
    if (!rows.length) return null
    const sorted = [...rows].sort((a, b) => a.avg - b.avg)
    return { rows, weakest: sorted[0] }
  }, [subs])

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 40 }}>
      <LabHeader eyebrow="حلقة الإغلاق · التشخيص" title="أخطائي في الكتابة">
        {g('الكتابة لا إجابة خاطئة فيها — فيها أربعة معايير تتحرّك. هذه الصفحة تقول لك أيّها يتأخّر باستمرار، وأيّ درس يعالجه.',
           'الكتابة لا إجابة خاطئة فيها — فيها أربعة معايير تتحرّك. هذه الصفحة تقول لكِ أيّها يتأخّر باستمرار، وأيّ درس يعالجه.')}
      </LabHeader>

      {isLoading ? (
        <Card style={{ padding: '26px', color: 'var(--iel-ink-3)', fontSize: 13 }}>…</Card>
      ) : !stats ? (
        <Card style={{ padding: '30px 22px', textAlign: 'center' }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 7 }}>لا توجد تسليمات مُقيَّمة بعد</div>
          <div style={{ fontSize: 13, color: 'var(--iel-ink-3)', lineHeight: 1.85, maxWidth: 460, margin: '0 auto 16px' }}>
            {g('تمتلئ هذه الصفحة تلقائياً من تقييماتك. اكتب مهمة واحدة كاملة، وسيظهر هنا أيّ معيار يسحب درجتك ومعه الدرس الذي يعالجه.',
               'تمتلئ هذه الصفحة تلقائياً من تقييماتك. اكتبي مهمة واحدة كاملة، وسيظهر هنا أيّ معيار يسحب درجتك ومعه الدرس الذي يعالجه.')}
          </div>
          <button
            onClick={() => navigate(`${BASE}/writing/task1`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 18px', borderRadius: 11, border: 0, cursor: 'pointer', background: 'var(--iel-accent)', color: '#fff', fontFamily: "'Tajawal', sans-serif", fontSize: 13.5, fontWeight: 800 }}
          >
            <PenLine size={15} /> {g('ابدأ مهمة كاملة', 'ابدئي مهمة كاملة')}
          </button>
        </Card>
      ) : (
        <>
          <Card style={{ padding: '17px 19px', borderColor: 'color-mix(in srgb, var(--iel-bad) 30%, var(--iel-border))' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: 'var(--iel-ink-3)', marginBottom: 6 }}>الأولوية الآن</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 6 }}>{stats.weakest.c.label}</div>
            <div style={{ fontSize: 13, color: 'var(--iel-ink-2)', lineHeight: 1.85 }}>{stats.weakest.c.fix}</div>
          </Card>

          <Card style={{ padding: '17px 19px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 3 }}>معاييرك عبر الزمن</div>
            <div style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', marginBottom: 14 }}>
              من {subs.length} تسليم مُقيَّم · السهم يقارن آخر ثلاثة بما قبلها
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {stats.rows.map(({ c, avg, series, delta }) => {
                const up = delta != null && delta >= 0.25
                const down = delta != null && delta <= -0.25
                const T = up ? TrendingUp : down ? TrendingDown : Minus
                const tc = up ? 'var(--iel-good)' : down ? 'var(--iel-bad)' : 'var(--iel-ink-3)'
                return (
                  <div key={c.key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--iel-ink)' }}>{c.label}</div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 800, color: tc }}>
                        <T size={12} />{delta != null ? (delta > 0 ? '+' : '') + delta.toFixed(1) : '—'}
                      </span>
                      <div style={{ marginInlineStart: 'auto', fontSize: 13, fontWeight: 800, color: COLOR(avg) }}>{avg.toFixed(1)}</div>
                    </div>
                    {/* sparkline: one bar per graded piece, oldest → newest */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 26 }}>
                      {series.map((v, i) => (
                        <div
                          key={i}
                          title={`${v}`}
                          style={{ flex: 1, minWidth: 4, maxWidth: 22, height: `${Math.max(12, (v / 9) * 100)}%`, borderRadius: 3, background: COLOR(v), opacity: i === series.length - 1 ? 1 : .45 }}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card style={{ padding: '17px 19px' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 11 }}>الدرس الذي يعالج كل معيار</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.rows.map(({ c, avg }) => (
                <button
                  key={c.key}
                  onClick={() => navigate(`${BASE}/writing`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 11, cursor: 'pointer', textAlign: 'start', background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', fontFamily: "'Tajawal', sans-serif" }}
                >
                  <span style={{ flex: 'none', width: 6, height: 6, borderRadius: '50%', background: COLOR(avg) }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: 'var(--iel-ink)' }}>{c.label}</span>
                    <span style={{ display: 'block', fontSize: 11.5, color: 'var(--iel-ink-3)' }}>افتحي الدرس في دليل الكتابة</span>
                  </span>
                  <ArrowLeft size={15} style={{ color: 'var(--iel-ink-3)', flex: 'none' }} />
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
