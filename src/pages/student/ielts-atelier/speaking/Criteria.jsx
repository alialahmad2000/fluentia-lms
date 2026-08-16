import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Waves, BookOpen, Ruler, Volume2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useG } from '@/i18n/gender'
import { useStudentId } from '../_helpers/resolveStudentId'
import { LabHeader, Card } from '../_ui/primitives'

// ─── المعايير الأربعة (المحادثة) ─────────────────────────────────────────────
// Same premise as writing's criteria page: the mark is FOUR equally-weighted
// marks, and one weak criterion drags the band down. But speaking's four are NOT
// writing's four — Task Achievement and Coherence&Cohesion are replaced by
// Fluency&Coherence and Pronunciation, and Pronunciation has no counterpart in
// writing at all. Reusing the writing page here would have taught the wrong
// rubric, so this is a separate set.
//
// Band wording describes the public IELTS speaking descriptors. Per-topic rows
// in ielts_speaking_questions carry `band_descriptors`, but that column holds
// {grammar, arabic_tip, common_mistakes_ar} — per-topic coaching, not band
// descriptors — so it feeds «عبارات وتراكيب» and «أخطاء شائعة» instead of this page.

const CRITERIA = [
  {
    key: 'fc', altKeys: ['fluency_coherence', 'fluency', 'fluency_and_coherence'], icon: Waves,
    label: 'الطلاقة والترابط', en: 'Fluency & Coherence',
    what: 'هل تتكلّمين باسترسال دون توقّف يُربك السامع، وهل يتّصل كلامك بعضه ببعض؟ السرعة ليست مقصودة — الاسترسال هو المقصود.',
    bands: {
      5: 'توقّفات ملحوظة للبحث عن الكلمة، وتكرار للجملة نفسها، وإجابات قصيرة تحتاج إلى دفع.',
      6: 'كلام مسترسل في الغالب مع تردّد عند الأفكار الأصعب، والروابط بسيطة ومتكرّرة.',
      7: 'استرسال دون جهد ظاهر، والتردّد — إن وُجد — للتفكير في الفكرة لا في الكلمة.',
    },
    killer: 'الصمت الطويل للبحث عن الكلمة المثالية يُخفض هذه الدرجة أكثر من استخدام كلمة أبسط. تابعي الكلام بكلمة أضعف — الطلاقة أثمن هنا من دقّة المفردة.',
  },
  {
    key: 'lr', altKeys: ['lexical_resource', 'lexis', 'vocabulary'], icon: BookOpen,
    label: 'الثروة اللغوية', en: 'Lexical Resource',
    what: 'تنوّع مفرداتك ودقّة اختيارها، وقدرتك على إعادة الصياغة حين تنقصك الكلمة.',
    bands: {
      5: 'مفردات محدودة تكفي المواضيع المألوفة، مع تكرار واضح.',
      6: 'مفردات كافية للحديث بإسهاب، مع أخطاء في اختيار الكلمة وقلّة في التعابير الطبيعية.',
      7: 'مرونة في المفردات، واستخدام تعابير اصطلاحية أحياناً، وقدرة على الالتفاف حول الكلمة الناقصة.',
    },
    killer: 'حين تنقصك الكلمة لا تتوقّفي: الالتفاف حولها بوصف قصير يُحتسب مهارةً في هذا المعيار، والصمت يُحتسب ضعفاً في المعيار الذي قبله.',
  },
  {
    key: 'gra', altKeys: ['grammatical_range', 'grammar', 'grammatical_range_accuracy'], icon: Ruler,
    label: 'القواعد ودقّتها', en: 'Grammatical Range & Accuracy',
    what: 'تنوّع تراكيبك مع سلامتها — التنوّع والدقّة معاً، لا أحدهما.',
    bands: {
      5: 'جمل بسيطة في الغالب، وأخطاء متكرّرة في الأزمنة.',
      6: 'مزيج من البسيط والمركّب، مع أخطاء ملحوظة لا تمنع الفهم.',
      7: 'تنوّع حقيقي في التراكيب، وكثير من الجمل بلا خطأ.',
    },
    killer: 'أكثر ما يُفقد هنا لدى المتحدثات بالعربية: الزمن الماضي في السرد (قصّةٌ تبدأ بالماضي ثم تنزلق إلى المضارع)، وأدوات التعريف a / an / the لأنّ العربية لا نكرة فيها.',
  },
  {
    key: 'pr', altKeys: ['pronunciation', 'pron'], icon: Volume2,
    label: 'النطق', en: 'Pronunciation',
    what: 'هل يُفهم كلامك بلا جهد من السامع؟ المطلوب الوضوح، لا لهجة بريطانية أو أمريكية.',
    bands: {
      5: 'يُفهم كلامك عموماً لكن بعض الكلمات تحتاج إعادة، والنبر في غير موضعه أحياناً.',
      6: 'واضح في أغلبه، مع كلمات مفردة تُنطق خطأً وتأثير ظاهر للّغة الأم.',
      7: 'واضح طوال الحديث، ونبرك يخدم المعنى بدل أن يشوّشه.',
    },
    killer: 'هذا المعيار الوحيد الذي لا مقابل له في الكتابة، ولذلك يُهمَل — وهو ربع الدرجة. أوضح ما يُخفضه: نبر المقطع الخطأ في الكلمة الطويلة، وحذف الحرف الساكن في آخر الكلمة (asked ← ask).',
  },
]

// Speaking.jsx writes ai_feedback as { criteria: { fluency_coherence: 6.5, … },
// feedback_ar, strengths, weaknesses, per_question_feedback } — the four scores
// are NESTED under `criteria` and are bare numbers, unlike writing where they sit
// at the top level as objects. Read the nested shape first, then fall back to the
// flat one, so this page works no matter which evaluator version wrote the row.
function readCriterion(fb, c) {
  if (!fb || typeof fb !== 'object') return null
  const sources = [fb.criteria, fb].filter((s) => s && typeof s === 'object')
  for (const src of sources) {
    for (const k of [...c.altKeys, c.key]) {
      const node = src[k]
      if (node == null) continue
      if (typeof node === 'number') return { score: node }
      if (typeof node === 'string' && node.trim() !== '' && !Number.isNaN(Number(node))) return { score: Number(node) }
      if (typeof node === 'object' && node.score != null) {
        return { score: Number(node.score), feedback: node.feedback_ar || node.feedback_en || null }
      }
    }
  }
  return null
}

function useMySpeakingScores(studentId) {
  return useQuery({
    queryKey: ['ielts-speaking-criteria', studentId],
    enabled: !!studentId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_submissions')
        .select('id, submission_type, band_score, ai_feedback, submitted_at')
        .eq('student_id', studentId)
        .like('submission_type', 'speaking%')
        .not('ai_feedback', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data || []
    },
  })
}

const BAND_COLOR = (b) => (b == null ? 'var(--iel-ink-3)' : b >= 7 ? 'var(--iel-good)' : b >= 6 ? 'var(--iel-warn)' : 'var(--iel-bad)')

export default function SpeakingCriteria() {
  const g = useG()
  const studentId = useStudentId()
  const { data: subs = [] } = useMySpeakingScores(studentId)

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
        {g('درجتك في المحادثة أربعة أرقام بوزن متساوٍ، ومتوسطها هو الباند. وأحد الأربعة — النطق — لا وجود له في الكتابة، ولهذا يُهمَل كثيراً وهو ربع الدرجة.',
           'درجتك في المحادثة أربعة أرقام بوزن متساوٍ، ومتوسطها هو الباند. وأحد الأربعة — النطق — لا وجود له في الكتابة، ولهذا يُهمَل كثيراً وهو ربع الدرجة.')}
      </LabHeader>

      {hasMine && (
        <Card style={{ padding: '16px 18px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 3 }}>معاييرك أنتِ</div>
          <div style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', marginBottom: 13 }}>
            متوسط تقييماتك في آخر {subs.length} جلسة
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {CRITERIA.map((c) => {
              const m = mine[c.key]
              const pct = m ? Math.max(4, Math.min(100, (m.avg / 9) * 100)) : 0
              return (
                <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 'none', width: 104, fontSize: 12, fontWeight: 700, color: c.key === weakest ? 'var(--iel-bad)' : 'var(--iel-ink-2)' }}>{c.label}</div>
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
