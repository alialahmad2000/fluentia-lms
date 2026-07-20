import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Clock, CheckCircle, XCircle, RotateCcw, FileText, Layers, Compass, Gauge, Repeat, Scale, MessageSquare, ListTree, PenLine, GraduationCap, Lightbulb, ArrowLeft } from 'lucide-react'

import BandDisplay from '@/design-system/components/masterclass/BandDisplay'
import { useStudentId } from './_helpers/resolveStudentId'
import { useReadingTests, usePassageMeta, useSubmitReadingTest, useRecentReadingSessions } from '@/hooks/ielts/useReadingLab'
import { gradeQuestions, scoreToBand } from '@/lib/ielts/grading'
import { supabase } from '@/lib/supabase'
import { useG } from '@/i18n/gender'
import { Card, MetaChip, LabHeader } from './_ui/primitives'
import QuestionTypesSection from './_ui/QuestionTypesSection'
import { ReadingDrawer, DrawerLede, DrawerSteps, DrawerExample, DrawerCallout } from './_ui/ReadingDrawer'
import { ExamShell, QuestionPalette } from './_ui/ExamShell'
import { ExamQuestion } from './_ui/ExamQuestions'

const SANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const arDigit = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])
function splitParagraphs(content) {
  return String(content || '').split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
}

// ─── Difficulty visuals (per passage position) ────────────────────────────────
const POS_LABEL = ['نص ١ — أيسر', 'نص ٢ — متوسّط', 'نص ٣ — أصعب']
const POS_LEVEL = ['أيسر', 'متوسّط', 'أصعب']
const BAND_COLOR = {
  band_5_6: '#4ade80',
  band_6_7: 'var(--sunset-amber, #f59e0b)',
  band_7_8: 'var(--sunset-orange, #fb7185)',
  band_8_9: '#c084fc',
}
function posColor(i) {
  return ['#4ade80', 'var(--sunset-amber, #f59e0b)', 'var(--sunset-orange, #fb7185)'][i] || 'var(--iel-ink-3)'
}

function useIsWide(bp = 900) {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth > bp)
  useEffect(() => {
    const fn = () => setWide(window.innerWidth > bp)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [bp])
  return wide
}

// ─── Test card — pick ONE text (prominent, interactive) OR the full 3-passage test ─
function TestCard({ test, meta, session, loading, g, onSelectFull, onSelectSingle }) {
  const ids = Array.isArray(test.passage_ids) ? test.passage_ids : []
  const topics = ids.map((id) => meta?.[id]).filter(Boolean)
  const bestBand = session?.band != null ? session.band : null
  const num = String(test.test_number).padStart(2, '0')
  return (
    <div className="iel-gcard" style={{ display: 'flex', flexDirection: 'column', gap: 13, padding: '18px 20px', background: 'var(--iel-surface)', fontFamily: "'Tajawal', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 6,
          fontSize: 11.5, fontWeight: 800, fontFamily: "'IBM Plex Sans', sans-serif",
          color: 'var(--iel-accent)', background: 'var(--iel-accent-soft)', border: '1px solid color-mix(in srgb, var(--iel-accent) 26%, transparent)',
        }}>
          <Layers size={12} /> TEST {num}
        </span>
        {bestBand != null && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#4ade80' }}>
            <CheckCircle size={13} /> {Number(bestBand).toFixed(1)}
          </span>
        )}
      </div>

      <div>
        <h3 style={{ margin: '2px 0 8px', fontSize: 16.5, fontWeight: 800, color: 'var(--iel-ink)', lineHeight: 1.4, textAlign: 'start' }}>
          {test.title_ar || `اختبار القراءة ${num}`}
        </h3>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          <MetaChip icon={FileText}>{arDigit(test.total_questions || 40)} سؤالاً</MetaChip>
          <MetaChip icon={Clock}>{arDigit(test.total_time_minutes || 60)} دقيقة</MetaChip>
          <MetaChip icon={BookOpen}>٣ نصوص</MetaChip>
        </div>
      </div>

      {/* Choice 1 — practise ONE text (now a clear, interactive choice) */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.04em', color: 'var(--iel-ink-3)', marginBottom: 7 }}>
          {g('تدرّب على نصّ واحد', 'تدرّبي على نصّ واحد')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => !loading && onSelectSingle(test, i)}
              title="تدريب على هذا النص وحده (~٢٠ دقيقة)"
              className="iel-passrow"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'start',
                padding: '9px 11px', borderRadius: 10, cursor: loading ? 'wait' : 'pointer',
                border: '1px solid var(--iel-border)', background: 'color-mix(in srgb, var(--iel-ink) 3%, transparent)',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: '50%', flex: 'none', background: posColor(i), boxShadow: `0 0 8px color-mix(in srgb, ${posColor(i)} 55%, transparent)` }} />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--iel-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {topics[i]?.title || POS_LABEL[i]}
                </span>
                <span style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--iel-ink-3)', marginTop: 1 }}>
                  نص {arDigit(i + 1)} · {POS_LEVEL[i]}
                </span>
              </span>
              <span className="cta" style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 800, color: 'var(--iel-ink-2)' }}>
                {g('تدرّب', 'تدرّبي')} <span className="arrow" style={{ fontSize: 14, display: 'inline-block' }}>←</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '-1px 0' }}>
        <span style={{ flex: 1, height: 1, background: 'var(--iel-border)' }} />
        <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--iel-ink-3)' }}>أو</span>
        <span style={{ flex: 1, height: 1, background: 'var(--iel-border)' }} />
      </div>

      {/* Choice 2 — full test */}
      <button
        type="button"
        onClick={() => !loading && onSelectFull(test)}
        disabled={loading}
        className="iel-primary"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          padding: '12px 14px', borderRadius: 12, border: 0, cursor: loading ? 'wait' : 'pointer',
          background: 'var(--iel-accent)', color: '#fff', fontSize: 13.5, fontWeight: 800, fontFamily: "'Tajawal', sans-serif",
          position: 'relative', overflow: 'hidden',
        }}
      >
        {loading ? 'جارٍ…' : <>الاختبار الكامل — ٣ نصوص · ٦٠ دقيقة <span style={{ fontSize: 15 }}>←</span></>}
      </button>
    </div>
  )
}

function StatBox({ label, value, accent }) {
  return (
    <Card style={{ padding: '14px 18px', flex: '0 0 auto' }}>
      <div style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div className="iel-serif" style={{ fontSize: 24, fontWeight: 600, color: accent || 'var(--iel-ink)' }}>{value}</div>
    </Card>
  )
}

// ─── Reading lessons guide (teach-first) ─────────────────────────────────────────
const READING_LESSONS = [
  {
    id: 'map', icon: Compass, color: '#4ade80',
    title: 'خريطة الاختبار', subtitle: 'كيف يُبنى قسم القراءة وكيف تُحسب الدرجة',
    concept: 'قسم القراءة الأكاديمي = ثلاثة نصوص تتدرّج في الصعوبة (النص الأول أيسر، الثالث أصعب)، أربعون سؤالاً، وستون دقيقة فقط. في النسخة الأكاديمية لا يوجد وقت إضافيّ لنقل الإجابات، فاكتب إجابتك مباشرة. كل إجابة صحيحة = علامة واحدة، ثم تُحوَّل العلامات من ٤٠ إلى نطاق (Band).',
    steps: [
      'خصّص نحو ٢٠ دقيقة لكل نص — لا أكثر، حتى لا يسرق النص الأول وقت الثالث.',
      'الأسئلة عادةً بترتيب ورودها في النص (ما عدا مطابقة العناوين والمعلومات) — استغلّ ذلك.',
      'لا تترك أي فراغ: كل سؤال بلا إجابة = صفر، والتخمين قد يصيب.',
    ],
    tip: 'حوالي ٣٠ إجابة صحيحة من ٤٠ ≈ Band 7. اعرف هدفك بالأرقام.',
  },
  {
    id: 'skim', icon: Gauge, color: '#4ade80',
    title: 'القراءة السريعة: تصفّح ومسح', subtitle: 'Skimming & Scanning',
    concept: 'لا تقرأ كل كلمة. «التصفّح» (Skimming) قراءة سريعة لالتقاط الفكرة العامة وبنية النص وموضوع كل فقرة. «المسح» (Scanning) بحث سريع عن معلومة محددة كاسم أو رقم أو تاريخ دون قراءة الجُمل كاملة.',
    steps: [
      'ابدأ بتصفّح سريع (دقيقة–دقيقتان): العنوان، أول جملة من كل فقرة، والكلمات البارزة.',
      'اقرأ السؤال أولاً، حدّد كلمته المفتاحية، ثم «امسح» النص عنها.',
      'حين تجد المكان المناسب، اقرأ الجملة وما حولها بعناية لتأكيد الإجابة.',
    ],
    tip: 'الأرقام والأسماء والحروف الكبيرة أسهل ما يُمسَح — اجعلها نقطة انطلاقك.',
  },
  {
    id: 'paraphrase', icon: Repeat, color: 'var(--sunset-amber, #f59e0b)',
    title: 'إعادة الصياغة والكلمات المفتاحية', subtitle: 'لماذا لا تجد نفس الكلمات؟',
    concept: 'أهم مهارة في القراءة: الأسئلة تُعيد صياغة النص بمرادفات، ونادراً ما تستخدم كلماته نفسها. فمن يبحث عن الكلمة الحرفية يضيع؛ ومن يبحث عن المعنى والمرادف يصيب.',
    steps: [
      'تحت كل كلمة مفتاحية في السؤال، فكّر: ما مرادفها المحتمل في النص؟',
      'احذر «الفخّ»: كلمة من السؤال تظهر حرفياً في النص لكن في سياق مختلف — ليست دائماً الإجابة.',
      'ركّز على الفعل والفكرة، لا على الاسم وحده.',
    ],
    example: { text_en: 'Question: "The bridge was expensive to build." · Passage: "…the construction of the bridge came at a considerable cost."', why_ar: '«expensive» ← «considerable cost»، و«to build» ← «construction»: نفس المعنى بكلمات مختلفة.' },
    tip: 'درّب عينك على المرادفات، لا على تطابق الحروف.',
  },
  {
    id: 'tfng', icon: Scale, color: 'var(--sunset-orange, #fb7185)',
    title: 'صح / خطأ / غير مذكور', subtitle: 'True / False / Not Given',
    concept: 'أكثر نوع يخلط بين الطلاب. TRUE = المعلومة تتفق مع النص. FALSE = النص يناقضها صراحةً. NOT GIVEN = النص لا يذكرها ولا ينفيها. القاعدة الذهبية: احكم من النص فقط، لا من معلوماتك الخارجية.',
    steps: [
      'اسأل: هل النص يؤكّد العبارة؟ (TRUE) هل يناقضها؟ (FALSE) أم يسكت عنها؟ (NOT GIVEN).',
      'الفرق بين FALSE و NOT GIVEN هو الأصعب: FALSE يحتاج تناقضاً واضحاً في النص، أما NOT GIVEN فلا أثر للمعلومة أصلاً.',
      'لا تفترض؛ «يبدو منطقياً» ليس دليلاً.',
    ],
    tip: 'لو ترددت بين FALSE و NOT GIVEN: هل يوجد جملة في النص تقول العكس؟ إن لم توجد فهي غالباً NOT GIVEN.',
  },
  {
    id: 'ynng', icon: MessageSquare, color: 'var(--sunset-orange, #fb7185)',
    title: 'نعم / لا / غير مذكور', subtitle: "Yes / No / Not Given — رأي الكاتب",
    concept: 'يشبه صح/خطأ لكنّه يخصّ رأي الكاتب وادّعاءاته لا الحقائق. YES = العبارة تتفق مع رأي الكاتب. NO = تناقض رأيه. NOT GIVEN = لم يُبدِ رأياً فيها.',
    steps: [
      'انتبه لكلمات الرأي في النص: «يرى، يعتقد، من الواضح، للأسف، من المرجّح».',
      'ميّز بين ما يذكره الكاتب كحقيقة وما يتبنّاه كرأي.',
      'إن ذكر الكاتب رأياً لغيره دون أن يوافقه، فرأيه هو NOT GIVEN.',
    ],
    tip: 'اسأل دائماً: ما رأيُ الكاتب نفسه، لا ما هو صحيح في الواقع.',
  },
  {
    id: 'headings', icon: ListTree, color: 'var(--sunset-amber, #f59e0b)',
    title: 'مطابقة العناوين', subtitle: 'Matching Headings',
    concept: 'تختار عنواناً لكل فقرة من قائمة. عدد العناوين أكثر من الفقرات، فبعضها فخّ. العنوان الصحيح يلخّص الفكرة الرئيسة للفقرة كلها، لا تفصيلة صغيرة فيها.',
    steps: [
      'اقرأ جملة الفقرة الأولى والأخيرة — غالباً فيهما الفكرة الرئيسة.',
      'احذر العنوان الذي يذكر تفصيلة صحيحة لكنها ليست موضوع الفقرة.',
      'اترك الفقرات الصعبة للنهاية، فحلّ الأسهل يقلّص خيارات الأصعب.',
    ],
    tip: 'اسأل: «عن ماذا تتحدث هذه الفقرة ككل؟» لا «أي تفصيلة وردت فيها؟».',
  },
  {
    id: 'completion', icon: PenLine, color: '#4ade80',
    title: 'أسئلة الإكمال', subtitle: 'إكمال الجُمل والملخّص والجداول',
    concept: 'تملأ الفراغ بكلمات مأخوذة حرفياً من النص. احترم حدّ الكلمات («كلمة واحدة»، «كلمتان كحدّ أقصى») وإلا احتُسبت الإجابة خطأ حتى لو كان معناها صحيحاً.',
    steps: [
      'حدّد نوع الكلمة الناقصة قبل البحث: اسم؟ فعل؟ رقم؟ (من قواعد الجملة).',
      'انسخ الكلمة كما هي في النص تماماً — لا تغيّر صيغتها.',
      'تأكد أن الجملة بعد الملء صحيحة نحوياً.',
    ],
    tip: '«NO MORE THAN TWO WORDS» تعني كلمتين على الأكثر — عُدّها قبل أن تكتب.',
  },
  {
    id: 'time', icon: Clock, color: 'var(--sunset-orange, #fb7185)',
    title: 'إدارة الوقت والأعصاب', subtitle: 'كيف لا تضيّع الساعة',
    concept: 'أكثر ما يخفض الدرجة ليس صعوبة النص بل سوء إدارة الوقت. النصوص تتدرّج في الصعوبة، فلا تعلَق في سؤال واحد.',
    steps: [
      'إن استعصى سؤال بعد دقيقة، ضع تخميناً وضع علامة وانتقل — عُد إليه إن بقي وقت.',
      'راقب الساعة: نص كل ٢٠ دقيقة تقريباً.',
      'في آخر دقيقتين، تأكد أن كل الأربعين خانة مملوءة (خمّن ما تبقّى).',
    ],
    tip: 'الكمال عدوّ الإنجاز؛ إجابة مخمّنة خير من خانة فارغة.',
  },
]

function LessonCard({ lesson, onOpen }) {
  const I = lesson.icon
  return (
    <button type="button" onClick={() => onOpen(lesson)} className="iel-gcard" style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px', width: '100%', cursor: 'pointer',
      textAlign: 'start', background: 'var(--iel-surface)', fontFamily: "'Tajawal', sans-serif",
    }}>
      <span style={{ width: 38, height: 38, borderRadius: 11, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in srgb, ${lesson.color} 15%, transparent)`, border: `1px solid color-mix(in srgb, ${lesson.color} 30%, transparent)`, color: lesson.color }}>
        <I size={18} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--iel-ink)', lineHeight: 1.3 }}>{lesson.title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lesson.subtitle}</div>
      </div>
      <span style={{ color: 'var(--iel-ink-3)', flex: 'none', fontSize: 15 }}>←</span>
    </button>
  )
}

// ─── Sub-page: teaching guide ────────────────────────────────────────────────────
function ReadingGuidePage() {
  const [open, setOpen] = useState(null)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 2, maxWidth: 940 }}>
      <LabHeader eyebrow="القراءة · تعلّم أولاً" title="دليل القراءة">
        دروس أساسية في استراتيجية قراءة الآيلتس — ابدأ بها قبل أن تختبر. كل درس فيه الفكرة، خطوات واضحة، ومثال يوضّحها.
      </LabHeader>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))', gap: 12 }}>
        {READING_LESSONS.map((l) => <LessonCard key={l.id} lesson={l} onOpen={setOpen} />)}
      </div>
      <ReadingDrawer open={!!open} onClose={() => setOpen(null)} icon={open?.icon} color={open?.color} kicker="درس القراءة" title={open?.title} subtitle={open?.subtitle}>
        {open && (
          <>
            <DrawerLede>{open.concept}</DrawerLede>
            <DrawerSteps title="الخطوات" steps={open.steps} color={open.color} />
            {open.example && (
              <DrawerExample title="مثال">
                <p style={{ margin: '0 0 8px', fontSize: 13, lineHeight: 1.7, color: 'var(--iel-ink)', direction: 'ltr', textAlign: 'left', fontFamily: SANS }}>{open.example.text_en}</p>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.8, color: 'var(--iel-ink-3)' }}>{open.example.why_ar}</p>
              </DrawerExample>
            )}
            <DrawerCallout icon={Lightbulb} tone="gold" title="نصيحة">{open.tip}</DrawerCallout>
          </>
        )}
      </ReadingDrawer>
    </div>
  )
}

// ─── Sub-page: question types ────────────────────────────────────────────────────
function ReadingTypesPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 2, maxWidth: 940 }}>
      <LabHeader eyebrow="القراءة · الاستراتيجية" title="أنواع الأسئلة">
        لكل نوع سؤال طريقة تعامل مختلفة. اضغط أي نوع لتعرف خطوات حلّه، الأخطاء الشائعة، ومثالاً محلولاً.
      </LabHeader>
      <QuestionTypesSection hideHeader />
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function Reading() {
  const { pathname } = useLocation()
  const section = pathname.endsWith('/reading/types') ? 'types' : pathname.endsWith('/reading/tests') ? 'tests' : 'guide'

  const g = useG()
  const studentId = useStudentId()
  const testsQ = useReadingTests()
  const metaQ = usePassageMeta()
  const recentQ = useRecentReadingSessions(studentId, 60)
  const submitTest = useSubmitReadingTest()
  const isWide = useIsWide()

  const [act, setAct] = useState('library')
  const [test, setTest] = useState(null)         // selected test + loaded .passages
  const [loadingTestId, setLoadingTestId] = useState(null)
  const [answers, setAnswers] = useState({})     // keyed `${pi}_${qNum}`
  const [timeLeft, setTimeLeft] = useState(0)
  const [gradeResult, setGradeResult] = useState(null)
  const [showReview, setShowReview] = useState(false)
  const [current, setCurrent] = useState(null)
  const [tabIdx, setTabIdx] = useState(0)
  const [mobilePane, setMobilePane] = useState('passage')

  const timerRef = useRef(null)
  const qScrollRef = useRef(null)

  // Best band per test id from recent sessions
  const bestByTest = useMemo(() => {
    const m = {}
    for (const s of (recentQ.data || [])) {
      const band = s.band_score != null ? Number(s.band_score) : null
      if (s.source_id == null || band == null) continue
      if (m[s.source_id] == null || band > m[s.source_id]) m[s.source_id] = band
    }
    return m
  }, [recentQ.data])

  // Submit ref so the timer can call it safely
  const submitRef = useRef(null)
  submitRef.current = function doSubmit() {
    clearInterval(timerRef.current)
    const passages = test?.passages || []
    let correct = 0, total = 0
    const perPassage = []
    passages.forEach((p, pi) => {
      const sa = {}
      ;(Array.isArray(p.questions) ? p.questions : []).forEach((q) => {
        const v = answers[`${pi}_${q.question_number}`]
        if (v != null && v !== '') sa[String(q.question_number)] = v
      })
      const r = gradeQuestions({ questions: p.questions, answerKey: p.answer_key, studentAnswers: sa })
      correct += r.correct
      total += r.total
      perPassage.push({ pi, title: p.title, band: r.band, correct: r.correct, total: r.total, perQuestion: r.perQuestion })
    })
    const band = scoreToBand(correct, total || 1)
    const result = { correct, total, band, perPassage }
    setGradeResult(result)
    if (studentId && test) {
      const elapsed = Math.max(1, (test.total_time_minutes || 60) * 60 - timeLeft)
      submitTest.mutate({
        studentId, test, result, durationSeconds: elapsed,
        sourceId: test.single ? test.singleSourceId : test.id,
        kind: test.single ? 'reading_passage' : 'reading_test',
      })
    }
    setAct('results')
  }

  // Timer
  useEffect(() => {
    if (act !== 'session') return
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); submitRef.current(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [act]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSelectTest(t) {
    setLoadingTestId(t.id)
    const ids = Array.isArray(t.passage_ids) ? t.passage_ids : []
    const { data, error } = await supabase
      .from('ielts_reading_passages')
      .select('id, title, content, questions, answer_key, difficulty_band, topic_category')
      .in('id', ids)
    if (error || !data?.length) { setLoadingTestId(null); return }
    const order = new Map(ids.map((id, i) => [id, i]))
    const passages = data.slice().sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    setTest({ ...t, passages, single: false, total_time_minutes: t.total_time_minutes || 60 })
    setAnswers({})
    setTimeLeft((t.total_time_minutes || 60) * 60)
    setGradeResult(null)
    setShowReview(false)
    setTabIdx(0)
    setMobilePane('passage')
    const firstQ = passages[0]?.questions?.[0]?.question_number
    setCurrent(firstQ != null ? `0_${firstQ}` : null)
    setLoadingTestId(null)
    setAct('session')
  }

  // Practise ONE passage on its own (~20 min); numbering normalised to 1..N for a standalone session
  async function handleSelectSingle(t, pi) {
    setLoadingTestId(t.id)
    const ids = Array.isArray(t.passage_ids) ? t.passage_ids : []
    const targetId = ids[pi]
    if (!targetId) { setLoadingTestId(null); return }
    const { data, error } = await supabase
      .from('ielts_reading_passages')
      .select('id, title, content, questions, answer_key, difficulty_band, topic_category')
      .eq('id', targetId)
      .single()
    if (error || !data) { setLoadingTestId(null); return }
    const questions = (Array.isArray(data.questions) ? data.questions : []).map((q, i) => ({ ...q, question_number: i + 1 }))
    const answer_key = (Array.isArray(data.answer_key) ? data.answer_key : []).map((e, i) => ({ ...e, question_number: i + 1 }))
    const passage = { ...data, questions, answer_key }
    const DUR = 20
    setTest({
      id: t.id, test_number: t.test_number, title_ar: t.title_ar,
      passages: [passage], single: true, singleSourceId: passage.id, single_title: passage.title,
      total_time_minutes: DUR,
    })
    setAnswers({})
    setTimeLeft(DUR * 60)
    setGradeResult(null)
    setShowReview(false)
    setTabIdx(0)
    setMobilePane('passage')
    setCurrent(`0_${questions[0]?.question_number ?? 1}`)
    setLoadingTestId(null)
    setAct('session')
  }

  // Retry the CURRENT session (single or full) without re-fetching — reuses loaded passages
  function restartSession() {
    if (!test) return
    setAnswers({})
    setGradeResult(null)
    setShowReview(false)
    setTabIdx(0)
    setMobilePane('passage')
    setTimeLeft((test.total_time_minutes || 60) * 60)
    const firstQ = test.passages?.[0]?.questions?.[0]?.question_number
    setCurrent(firstQ != null ? `0_${firstQ}` : null)
    setAct('session')
  }

  function handleAnswer(pi, qNum, val) {
    setAnswers((prev) => ({ ...prev, [`${pi}_${qNum}`]: val }))
    setCurrent(`${pi}_${qNum}`)
  }

  function jump(gi, n) {
    if (gi !== tabIdx) { setTabIdx(gi); setMobilePane('questions') }
    setCurrent(`${gi}_${n}`)
    setTimeout(() => {
      const el = (qScrollRef.current || document).querySelector(`[data-q="${n}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, gi !== tabIdx ? 120 : 0)
  }

  function selectPassageTab(pi) {
    setTabIdx(pi)
    setMobilePane('questions')
    const firstQ = test?.passages?.[pi]?.questions?.[0]?.question_number
    if (firstQ != null) setCurrent(`${pi}_${firstQ}`)
  }

  // ── Teaching sub-pages (no session state involved) ────────────────────────────
  if (section === 'guide') return <ReadingGuidePage />
  if (section === 'types') return <ReadingTypesPage />

  // ── TESTS: ACT 1 — LIBRARY ────────────────────────────────────────────────────
  if (act === 'library') {
    const tests = testsQ.data || []
    const meta = metaQ.data || {}
    const completedCount = tests.filter((t) => bestByTest[t.id] != null).length
    const bestBand = Object.keys(bestByTest).length ? Math.max(...Object.values(bestByTest)) : null

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingTop: 2, maxWidth: 940 }}>
        <LabHeader eyebrow="القراءة · التدرّب" title="الاختبارات">
          اختر نصّاً واحداً للتركيز (نحو ٢٠ دقيقة)، أو ابدأ اختباراً كاملاً من ثلاثة نصوص وأربعين سؤالاً في ساعة. تصحيح فوري وشرح عربيّ لكل إجابة، وتُضاف أخطاؤك إلى بنك المراجعة.
        </LabHeader>

        {(completedCount > 0) && (
          <div style={{ display: 'flex', gap: 12 }}>
            <StatBox label="اختبارات مكتملة" value={completedCount} />
            {bestBand != null && <StatBox label="أفضل Band" value={bestBand.toFixed(1)} accent="var(--iel-accent)" />}
          </div>
        )}

        {testsQ.isLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} style={{ height: 260, borderRadius: 18, background: 'color-mix(in srgb, var(--ds-surface) 35%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 35%, transparent)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <div style={{ padding: '40px 24px', borderRadius: 20, background: 'color-mix(in srgb, var(--ds-surface) 40%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 40%, transparent)', textAlign: 'center' }}>
            <BookOpen size={32} color="var(--ds-text-muted)" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>لا توجد اختبارات متاحة حالياً</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}
          >
            {tests.map((t) => (
              <TestCard key={t.id} test={t} meta={meta} session={{ band: bestByTest[t.id] }} loading={loadingTestId === t.id} g={g} onSelectFull={handleSelectTest} onSelectSingle={handleSelectSingle} />
            ))}
          </motion.div>
        )}
      </div>
    )
  }

  // ── ACT 2: SESSION (3 passages) ────────────────────────────────────────────────
  if (act === 'session' && test) {
    const passages = test.passages || []
    const p = passages[tabIdx]
    const paras = splitParagraphs(p?.content)
    const paraLetters = paras.map((_, i) => String.fromCharCode(65 + i))

    const answeredSet = new Set()
    passages.forEach((pp, pi) => (Array.isArray(pp.questions) ? pp.questions : []).forEach((q) => {
      const v = answers[`${pi}_${q.question_number}`]
      if (v != null && v !== '') answeredSet.add(`${pi}_${q.question_number}`)
    }))
    const groups = passages.map((pp, pi) => ({ label: `Passage ${pi + 1}`, numbers: (Array.isArray(pp.questions) ? pp.questions : []).map((q) => q.question_number) }))

    const PassageTabs = (
      <div style={{ flex: 'none', display: 'flex', gap: 6, padding: '9px 16px', borderBottom: '1px solid var(--iel-border)', overflowX: 'auto' }}>
        {passages.map((pp, pi) => {
          const on = pi === tabIdx
          return (
            <button key={pi} onClick={() => selectPassageTab(pi)} style={{
              flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 9, cursor: 'pointer',
              fontFamily: "'Tajawal', sans-serif", fontSize: 12.5, fontWeight: 700,
              border: `1.5px solid ${on ? 'var(--iel-accent)' : 'var(--iel-border)'}`,
              background: on ? 'var(--iel-accent-soft)' : 'transparent',
              color: on ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: BAND_COLOR[pp.difficulty_band] || 'var(--iel-ink-3)' }} />
              نص {arDigit(pi + 1)}
            </button>
          )
        })}
      </div>
    )

    const PassagePane = (
      <div style={{ padding: isWide ? '24px 30px' : '18px 18px', overflowY: 'auto', height: '100%', direction: 'ltr' }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 18px', fontFamily: SANS, textAlign: 'left', lineHeight: 1.3 }}>{p?.title}</h2>
        {paras.map((para, i) => (
          <p key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '0 0 15px', fontSize: 15.5, color: 'var(--iel-ink)', fontFamily: SANS, lineHeight: 1.75, textAlign: 'left' }}>
            <span style={{ flex: 'none', width: 16, fontWeight: 800, color: 'var(--iel-ink-2)', fontFamily: SANS, fontSize: 14 }}>{paraLetters[i]}</span>
            <span>{para}</span>
          </p>
        ))}
      </div>
    )

    const QuestionsPane = (
      <div ref={qScrollRef} style={{ padding: isWide ? '22px 24px' : '18px 16px', overflowY: 'auto', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {(Array.isArray(p?.questions) ? p.questions : []).map((q) => (
            <ExamQuestion key={q.question_number} q={q} value={answers[`${tabIdx}_${q.question_number}`]} onChange={(v) => handleAnswer(tabIdx, q.question_number, v)} paragraphLetters={paraLetters} />
          ))}
        </div>
      </div>
    )

    return (
      <ExamShell
        sectionLabel="القراءة"
        partLabel={test.single ? (test.single_title || 'نص واحد') : `Reading Passage ${tabIdx + 1} / ${passages.length}`}
        secsLeft={timeLeft}
        onSubmit={() => submitRef.current()}
        submitting={submitTest.isPending}
        submitLabel={test.single ? 'تسليم النص' : 'تسليم الاختبار'}
        onExit={() => { clearInterval(timerRef.current); setAct('library') }}
        footer={<QuestionPalette groups={groups} answered={answeredSet} current={current} onJump={jump} />}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          {passages.length > 1 ? PassageTabs : null}
          <div style={{ flex: 1, minHeight: 0 }}>
            {isWide ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', minHeight: 0 }}>
                <div style={{ minHeight: 0, borderInlineStart: '1px solid var(--iel-border)', order: 2 }}>{PassagePane}</div>
                <div style={{ minHeight: 0, order: 1 }}>{QuestionsPane}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <div style={{ flex: 'none', display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid var(--iel-border)' }}>
                  {[['passage', 'النص'], ['questions', 'الأسئلة']].map(([k, l]) => (
                    <button key={k} onClick={() => setMobilePane(k)} style={{ flex: 1, padding: '9px', borderRadius: 9, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 13.5, fontWeight: 700, border: `1.5px solid ${mobilePane === k ? 'var(--iel-accent)' : 'var(--iel-border)'}`, background: mobilePane === k ? 'var(--iel-accent-soft)' : 'transparent', color: mobilePane === k ? 'var(--iel-accent-ink)' : 'var(--iel-ink-2)' }}>{l}</button>
                  ))}
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>{mobilePane === 'passage' ? PassagePane : QuestionsPane}</div>
              </div>
            )}
          </div>
        </div>
      </ExamShell>
    )
  }

  // ── ACT 3: RESULTS ──────────────────────────────────────────────────────────────
  if (act === 'results' && gradeResult) {
    const { correct, total, band, perPassage } = gradeResult

    return (
      <div dir="rtl" style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Score */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ padding: '40px 32px', borderRadius: 24, background: 'color-mix(in srgb, var(--sunset-base-mid, #1a1220) 48%, transparent)', border: '1px solid color-mix(in srgb, var(--sunset-amber, #f59e0b) 22%, transparent)', backdropFilter: 'blur(10px)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
        >
          {test?.single ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", direction: 'ltr' }}>{test.single_title || 'نص واحد'}</p>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Reading Test {String(test?.test_number || '').padStart(2, '0')}
            </p>
          )}
          <BandDisplay band={band} size="xl" animate />
          <p style={{ margin: 0, fontSize: 15, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>{correct} من {total} إجابة صحيحة</p>
        </motion.div>

        {/* Per-passage breakdown (only for the full 3-passage test) */}
        {perPassage.length > 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.4 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {perPassage.map((pp) => (
              <div key={pp.pi} style={{ padding: '14px 12px', borderRadius: 14, background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', border: '1px solid color-mix(in srgb, var(--ds-border) 45%, transparent)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", marginBottom: 6 }}>نص {arDigit(pp.pi + 1)}</div>
                <div className="iel-serif" style={{ fontSize: 20, fontWeight: 700, color: posColor(pp.pi) }}>{pp.correct}/{pp.total}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.4 }} style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setAct('library')} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--ds-border) 55%, transparent)', background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', color: 'var(--ds-text-muted)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
            كل الاختبارات
          </button>
          <button onClick={restartSession} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--sunset-orange, #fb7185) 38%, transparent)', background: 'color-mix(in srgb, var(--sunset-orange, #fb7185) 13%, transparent)', color: 'var(--ds-text)', fontSize: 14, fontWeight: 700, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
            <RotateCcw size={13} /> {g('حاول مرة أخرى', 'حاولي مرة أخرى')}
          </button>
        </motion.div>

        {/* Review */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.4 }}>
          <button onClick={() => setShowReview((r) => !r)} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--ds-border) 45%, transparent)', background: 'color-mix(in srgb, var(--ds-surface) 45%, transparent)', color: 'var(--ds-text-muted)', fontSize: 14, fontFamily: "'Tajawal', sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {showReview ? 'إخفاء المراجعة' : 'مراجعة الإجابات'}
          </button>

          <AnimatePresence>
            {showReview && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} style={{ overflow: 'hidden', marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {perPassage.map((pp) => (
                  <div key={pp.pi} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, color: 'var(--iel-ink-2)', fontFamily: "'Tajawal', sans-serif" }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: posColor(pp.pi) }} />
                      نص {arDigit(pp.pi + 1)} — {pp.correct}/{pp.total}
                    </div>
                    {pp.perQuestion.map((r) => (
                      <div key={r.qNum} style={{ padding: '12px 16px', borderRadius: 12, background: r.isCorrect ? 'color-mix(in srgb, #4ade80 7%, transparent)' : 'color-mix(in srgb, #f87171 7%, transparent)', border: `1px solid ${r.isCorrect ? 'rgba(74,222,128,0.18)' : 'rgba(248,113,113,0.18)'}`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ flexShrink: 0, marginTop: 3 }}>
                          {r.isCorrect ? <CheckCircle size={15} color="#4ade80" /> : <XCircle size={15} color="#f87171" />}
                        </div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.65 }}>
                            <span style={{ fontWeight: 800, color: 'var(--iel-ink-3)' }}>{r.qNum}. </span>{r.text}
                          </p>
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif" }}>
                            إجابتك: <span style={{ color: r.isCorrect ? '#4ade80' : '#f87171', fontWeight: 700 }}>{r.given || '—'}</span>
                            {!r.isCorrect && <>{' '}· الصحيح: <span style={{ color: '#4ade80', fontWeight: 700 }}>{String(r.expected)}</span></>}
                          </p>
                          {r.explanation && !r.isCorrect && (
                            <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ds-text-muted)', fontFamily: "'Tajawal', sans-serif", lineHeight: 1.6 }}>{r.explanation}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    )
  }

  return null
}
