import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Target, Link2, BookOpen, Ruler } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useG } from '@/i18n/gender'
import { useStudentId } from '../_helpers/resolveStudentId'
import { LabHeader, Card } from '../_ui/primitives'

// ─── المعايير الأربعة ────────────────────────────────────────────────────────
// The single most consequential thing an IELTS writing candidate can be told is
// that the mark is FOUR marks, weighted equally, and that the essay you think is
// "good" can lose a whole band on one of them alone. The evaluator already
// scores all four and returns Arabic feedback per criterion — that data existed
// with no surface explaining what the four even are.
//
// Band wording below describes the criteria themselves (public IELTS band
// descriptors), not any per-task rubric: `rubric.diagnostic_scoring` is present
// on 1 of 25 rows, far too sparse to drive a page.

const CRITERIA = [
  {
    key: 'ta', altKey: 'task_achievement', altKey2: 'task_response', icon: Target,
    label: 'تحقيق المهمة', en: 'Task Achievement / Response',
    what: 'هل أجبتِ عن السؤال المطروح كاملاً؟ ليس عن سؤال قريب منه، ولا عن جزء منه.',
    bands: {
      5: 'تتناولين الموضوع لكن تُهملين جزءاً من السؤال، أو تُطيلين في نقطة وتُهملين أخرى.',
      6: 'تتناولين كل أجزاء السؤال، لكن بعض الأفكار عامّة أو غير مدعومة بمثال.',
      7: 'تُغطّين كل جزء بوضوح، وموقفك ثابت من أول سطر إلى آخره، ولكل فكرة سند.',
    },
    killer: 'في المهمة الأولى: تقرير بلا Overview محكوم عليه بـ Band 5 مهما كانت لغته. وفي الثانية: سؤال من جزأين أجبتِ عن جزء واحد = سقف ٦.',
  },
  {
    key: 'cc', altKey: 'coherence_cohesion', icon: Link2,
    label: 'الترابط والتماسك', en: 'Coherence & Cohesion',
    what: 'هل يسير النصّ في خطّ واضح؟ فقرات مقسّمة، وكل فقرة لها فكرة واحدة، والانتقال بينها طبيعي.',
    bands: {
      5: 'الأفكار موجودة لكن ترتيبها مربك، أو الفقرات غير مقسّمة، أو الروابط مكرّرة.',
      6: 'التقسيم واضح والترتيب منطقي، مع إفراط أحياناً في الروابط أو ضعف في جملة الفكرة.',
      7: 'كل فقرة تبدأ بفكرتها، والروابط قليلة ومتنوّعة لأنّ الترتيب نفسه يحمل المعنى.',
    },
    killer: 'الإفراط في linkers يُخفض هذا المعيار ولا يرفعه: «Firstly… Secondly… Moreover…» في كل جملة علامة ضعف لا قوّة.',
  },
  {
    key: 'lr', altKey: 'lexical_resource', icon: BookOpen,
    label: 'الثروة اللغوية', en: 'Lexical Resource',
    what: 'تنوّع المفردات ودقّة اختيارها — لا صعوبتها.',
    bands: {
      5: 'مفردات محدودة ومتكرّرة، مع إعادة استخدام كلمات السؤال حرفياً.',
      6: 'مفردات كافية مع محاولات أوسع، وبعض أخطاء اختيار الكلمة.',
      7: 'مرونة واضحة: مرادفات دقيقة، وتعابير طبيعية، وأخطاء نادرة لا تُربك القارئ.',
    },
    killer: 'إعادة كلمات السؤال كما هي أكبر سبب لانخفاض هذا المعيار — أعِيدي صياغتها من أول سطر.',
  },
  {
    key: 'gra', altKey: 'grammatical_range', icon: Ruler,
    label: 'القواعد ودقّتها', en: 'Grammatical Range & Accuracy',
    what: 'تنوّع التراكيب مع سلامتها. التنوّع والدقّة معاً — لا أحدهما.',
    bands: {
      5: 'جمل بسيطة في الغالب، وأخطاء متكرّرة تُربك المعنى أحياناً.',
      6: 'مزيج من البسيط والمركّب، مع أخطاء ملحوظة لا تمنع الفهم.',
      7: 'تنوّع حقيقي في التراكيب، وأغلب الجمل بلا خطأ.',
    },
    killer: 'خطآن شائعان لدى المتحدثات بالعربية: الجملة الطويلة المتّصلة بلا نقطة، وأدوات التعريف (a / an / the) لأنّ العربية لا نكرة فيها.',
  },
]

// The evaluator writes a different key per task type (task_achievement for Task 1,
// task_response for Task 2) — read all spellings so one criterion never appears empty.
function readCriterion(fb, c) {
  if (!fb || typeof fb !== 'object') return null
  const node = fb[c.altKey2] ?? fb[c.altKey] ?? fb[c.key]
  if (node == null) return null
  if (typeof node === 'number') return { score: node }
  if (typeof node === 'object' && node.score != null) return { score: Number(node.score), feedback: node.feedback_ar || node.feedback_en || null }
  return null
}

function useMyWritingScores(studentId) {
  return useQuery({
    queryKey: ['ielts-writing-criteria', studentId],
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
        .order('submitted_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data || []
    },
  })
}

const BAND_COLOR = (b) => (b == null ? 'var(--iel-ink-3)' : b >= 7 ? 'var(--iel-good)' : b >= 6 ? 'var(--iel-warn)' : 'var(--iel-bad)')

export default function WritingCriteria() {
  const g = useG()
  const studentId = useStudentId()
  const { data: subs = [] } = useMyWritingScores(studentId)

  // Average each criterion across her graded submissions. Only shown when she
  // actually has some — an empty chart is worse than no chart.
  const mine = useMemo(() => {
    const acc = {}
    for (const c of CRITERIA) {
      const vals = subs.map((s) => readCriterion(s.ai_feedback, c)?.score).filter((v) => typeof v === 'number' && !Number.isNaN(v))
      if (vals.length) acc[c.key] = { avg: vals.reduce((a, b) => a + b, 0) / vals.length, n: vals.length }
    }
    return acc
  }, [subs])
  const hasMine = Object.keys(mine).length > 0
  const weakest = useMemo(() => {
    const entries = Object.entries(mine)
    if (!entries.length) return null
    return entries.sort((a, b) => a[1].avg - b[1].avg)[0][0]
  }, [mine])

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 40 }}>
      <LabHeader eyebrow="الدرجة الأولى · كيف تُحسب درجتك" title="المعايير الأربعة">
        {g('درجتك في الكتابة ليست رقماً واحداً — بل أربعة أرقام بوزن متساوٍ، ومتوسطها هو الباند. لهذا قد يكون نصّك جميلاً وتظلّ درجتك ٦: معيار واحد ضعيف يسحب الأربعة معه.',
           'درجتك في الكتابة ليست رقماً واحداً — بل أربعة أرقام بوزن متساوٍ، ومتوسطها هو الباند. لهذا قد يكون نصّك جميلاً وتظلّ درجتك ٦: معيار واحد ضعيف يسحب الأربعة معه.')}
      </LabHeader>

      {hasMine && (
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 3 }}>معاييرك أنتِ</div>
          <div style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', marginBottom: 13 }}>
            متوسط تقييماتك في آخر {subs.length} تسليم
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {CRITERIA.map((c) => {
              const m = mine[c.key]
              const pct = m ? Math.max(4, Math.min(100, (m.avg / 9) * 100)) : 0
              return (
                <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 'none', width: 96, fontSize: 12, fontWeight: 700, color: c.key === weakest ? 'var(--iel-bad)' : 'var(--iel-ink-2)' }}>{c.label}</div>
                  <div style={{ flex: 1, height: 7, borderRadius: 99, background: 'var(--iel-track)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: BAND_COLOR(m?.avg), transition: 'width .4s var(--iel-ease)' }} />
                  </div>
                  <div style={{ flex: 'none', width: 34, textAlign: 'end', fontSize: 12.5, fontWeight: 800, color: BAND_COLOR(m?.avg) }}>
                    {m ? m.avg.toFixed(1) : '—'}
                  </div>
                </div>
              )
            })}
          </div>
          {weakest && (
            <div style={{ marginTop: 13, padding: '10px 12px', borderRadius: 10, background: 'color-mix(in oklab, var(--iel-bad) 8%, transparent)', border: '1px solid color-mix(in oklab, var(--iel-bad) 22%, transparent)', fontSize: 12.5, color: 'var(--iel-ink-2)', lineHeight: 1.8 }}>
              أضعف معيار لديكِ الآن: <b style={{ color: 'var(--iel-ink)' }}>{CRITERIA.find((c) => c.key === weakest)?.label}</b> — وهو الذي سيرفع باندك أسرع من غيره لو عالجتِه أوّلاً.
            </div>
          )}
        </Card>
      )}

      {CRITERIA.map((c) => {
        const I = c.icon
        const isWeak = c.key === weakest
        return (
          <Card key={c.key} style={{ padding: '17px 19px', ...(isWeak ? { borderColor: 'color-mix(in oklab, var(--iel-bad) 32%, var(--iel-border))' } : null) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
              <span style={{ display: 'inline-flex', width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', background: 'var(--iel-accent-soft)', color: 'var(--iel-accent-ink)', flex: 'none' }}><I size={15} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)' }}>{c.label}</div>
                <div dir="ltr" style={{ fontSize: 11, color: 'var(--iel-ink-3)', fontWeight: 600, textAlign: 'start' }}>{c.en}</div>
              </div>
              <div style={{ marginInlineStart: 'auto', fontSize: 11, fontWeight: 800, color: 'var(--iel-ink-3)' }}>٢٥٪ من الدرجة</div>
            </div>

            <div style={{ fontSize: 13, color: 'var(--iel-ink-2)', lineHeight: 1.85, marginBottom: 12 }}>{c.what}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[5, 6, 7].map((b) => (
                <div key={b} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ flex: 'none', minWidth: 46, textAlign: 'center', fontSize: 11, fontWeight: 800, padding: '3px 0', borderRadius: 7, background: b === 7 ? 'color-mix(in oklab, var(--iel-good) 14%, transparent)' : 'var(--iel-surface-2)', color: b === 7 ? 'var(--iel-good)' : 'var(--iel-ink-3)', border: `1px solid ${b === 7 ? 'color-mix(in oklab, var(--iel-good) 30%, transparent)' : 'var(--iel-border)'}` }}>
                    Band {b}
                  </span>
                  <div style={{ fontSize: 12.5, color: 'var(--iel-ink-2)', lineHeight: 1.8 }}>{c.bands[b]}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--iel-gold-soft, rgba(234,179,8,.1))', border: '1px solid color-mix(in oklab, var(--iel-gold) 26%, transparent)', fontSize: 12.5, color: 'var(--iel-ink-2)', lineHeight: 1.8 }}>
              <b style={{ color: 'var(--iel-gold-ink)' }}>ما يُسقط الدرجة: </b>{c.killer}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
