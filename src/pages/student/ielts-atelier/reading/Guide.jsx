import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, Gauge, Repeat, Scale, MessageSquare, ListTree, PenLine, Clock, Lightbulb, Search, Radar, AlertTriangle } from 'lucide-react'
import { LabHeader } from '../_ui/primitives'
import { ReadingDrawer, DrawerLede, DrawerSteps, DrawerExample, DrawerCallout } from '../_ui/ReadingDrawer'
import { useG } from '@/i18n/gender'

const BASE = '/student/ielts-atelier'
const SANS = "-apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
const arDigit = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])

// ─── Reading lessons guide (teach-first) ─────────────────────────────────────────
const READING_LESSONS = [
  {
    id: 'map', icon: Compass, color: '#4ade80',
    title: 'خريطة الاختبار', subtitle: 'كيف يُبنى قسم القراءة وكيف تُحسب الدرجة',
    concept: 'قسم القراءة الأكاديمي = ثلاثة نصوص تتدرّج في الصعوبة (النص الأول أيسر، الثالث أصعب)، أربعون سؤالاً، وستون دقيقة فقط. في النسخة الأكاديمية لا يوجد وقت إضافيّ لنقل الإجابات، فاكتبي إجابتك مباشرة. كل إجابة صحيحة = علامة واحدة، ثم تُحوَّل العلامات من ٤٠ إلى نطاق (Band).',
    steps: [
      'خصّصي نحو ٢٠ دقيقة لكل نص — لا أكثر، حتى لا يسرق النص الأول وقت الثالث.',
      'الأسئلة عادةً بترتيب ورودها في النص (ما عدا مطابقة العناوين والمعلومات) — استغلّي ذلك.',
      'لا تتركي أي فراغ: كل سؤال بلا إجابة = صفر، والتخمين قد يصيب.',
    ],
    tip: 'حوالي ٣٠ إجابة صحيحة من ٤٠ ≈ Band 7. اعرفي هدفك بالأرقام.',
  },
  {
    id: 'skim', icon: Gauge, color: '#4ade80',
    title: 'القراءة السريعة: تصفّح ومسح', subtitle: 'Skimming & Scanning',
    concept: 'لا تقرئي كل كلمة. «التصفّح» (Skimming) قراءة سريعة لالتقاط الفكرة العامة وبنية النص وموضوع كل فقرة. «المسح» (Scanning) بحث سريع عن معلومة محددة كاسم أو رقم أو تاريخ دون قراءة الجُمل كاملة.',
    steps: [
      'ابدئي بتصفّح سريع (دقيقة–دقيقتان): العنوان، أول جملة من كل فقرة، والكلمات البارزة.',
      'اقرئي السؤال أولاً، حدّدي كلمته المفتاحية، ثم «امسحي» النص عنها.',
      'حين تجدين المكان المناسب، اقرئي الجملة وما حولها بعناية لتأكيد الإجابة.',
    ],
    tip: 'الأرقام والأسماء والحروف الكبيرة أسهل ما يُمسَح — اجعليها نقطة انطلاقك.',
  },
  {
    id: 'paraphrase', icon: Repeat, color: 'var(--sunset-amber, #f59e0b)',
    title: 'إعادة الصياغة والكلمات المفتاحية', subtitle: 'لماذا لا تجدين نفس الكلمات؟',
    concept: 'أهم مهارة في القراءة: الأسئلة تُعيد صياغة النص بمرادفات، ونادراً ما تستخدم كلماته نفسها. فمن يبحث عن الكلمة الحرفية يضيع؛ ومن يبحث عن المعنى والمرادف يصيب.',
    steps: [
      'تحت كل كلمة مفتاحية في السؤال، فكّري: ما مرادفها المحتمل في النص؟',
      'احذري «الفخّ»: كلمة من السؤال تظهر حرفياً في النص لكن في سياق مختلف — ليست دائماً الإجابة.',
      'ركّزي على الفعل والفكرة، لا على الاسم وحده.',
    ],
    example: { text_en: 'Question: "The bridge was expensive to build." · Passage: "…the construction of the bridge came at a considerable cost."', why_ar: '«expensive» ← «considerable cost»، و«to build» ← «construction»: نفس المعنى بكلمات مختلفة.' },
    tip: 'درّبي عينك على المرادفات، لا على تطابق الحروف.',
  },
  {
    id: 'tfng', icon: Scale, color: 'var(--sunset-orange, #fb7185)',
    title: 'صح / خطأ / غير مذكور', subtitle: 'True / False / Not Given',
    concept: 'أكثر نوع يخلط بين الطلاب. TRUE = المعلومة تتفق مع النص. FALSE = النص يناقضها صراحةً. NOT GIVEN = النص لا يذكرها ولا ينفيها. القاعدة الذهبية: احكمي من النص فقط، لا من معلوماتك الخارجية.',
    steps: [
      'اسألي: هل النص يؤكّد العبارة؟ (TRUE) هل يناقضها؟ (FALSE) أم يسكت عنها؟ (NOT GIVEN).',
      'الفرق بين FALSE و NOT GIVEN هو الأصعب: FALSE يحتاج تناقضاً واضحاً في النص، أما NOT GIVEN فلا أثر للمعلومة أصلاً.',
      'لا تفترضي؛ «يبدو منطقياً» ليس دليلاً.',
    ],
    tip: 'لو ترددتِ بين FALSE و NOT GIVEN: هل يوجد جملة في النص تقول العكس؟ إن لم توجد فهي غالباً NOT GIVEN.',
  },
  {
    id: 'ynng', icon: MessageSquare, color: 'var(--sunset-orange, #fb7185)',
    title: 'نعم / لا / غير مذكور', subtitle: "Yes / No / Not Given — رأي الكاتب",
    concept: 'يشبه صح/خطأ لكنّه يخصّ رأي الكاتب وادّعاءاته لا الحقائق. YES = العبارة تتفق مع رأي الكاتب. NO = تناقض رأيه. NOT GIVEN = لم يُبدِ رأياً فيها.',
    steps: [
      'انتبهي لكلمات الرأي في النص: «يرى، يعتقد، من الواضح، للأسف، من المرجّح».',
      'ميّزي بين ما يذكره الكاتب كحقيقة وما يتبنّاه كرأي.',
      'إن ذكر الكاتب رأياً لغيره دون أن يوافقه، فرأيه هو NOT GIVEN.',
    ],
    tip: 'اسألي دائماً: ما رأيُ الكاتب نفسه، لا ما هو صحيح في الواقع.',
  },
  {
    id: 'headings', icon: ListTree, color: 'var(--sunset-amber, #f59e0b)',
    title: 'مطابقة العناوين', subtitle: 'Matching Headings',
    concept: 'تختارين عنواناً لكل فقرة من قائمة. عدد العناوين أكثر من الفقرات، فبعضها فخّ. العنوان الصحيح يلخّص الفكرة الرئيسة للفقرة كلها، لا تفصيلة صغيرة فيها.',
    steps: [
      'اقرئي جملة الفقرة الأولى والأخيرة — غالباً فيهما الفكرة الرئيسة.',
      'احذري العنوان الذي يذكر تفصيلة صحيحة لكنها ليست موضوع الفقرة.',
      'اتركي الفقرات الصعبة للنهاية، فحلّ الأسهل يقلّص خيارات الأصعب.',
    ],
    tip: 'اسألي: «عن ماذا تتحدث هذه الفقرة ككل؟» لا «أي تفصيلة وردت فيها؟».',
  },
  {
    id: 'completion', icon: PenLine, color: '#4ade80',
    title: 'أسئلة الإكمال', subtitle: 'إكمال الجُمل والملخّص والجداول',
    concept: 'تملئين الفراغ بكلمات مأخوذة حرفياً من النص. احترمي حدّ الكلمات («كلمة واحدة»، «كلمتان كحدّ أقصى») وإلا احتُسبت الإجابة خطأ حتى لو كان معناها صحيحاً.',
    steps: [
      'حدّدي نوع الكلمة الناقصة قبل البحث: اسم؟ فعل؟ رقم؟ (من قواعد الجملة).',
      'انسخي الكلمة كما هي في النص تماماً — لا تغيّري صيغتها.',
      'تأكّدي أن الجملة بعد الملء صحيحة نحوياً.',
    ],
    tip: '«NO MORE THAN TWO WORDS» تعني كلمتين على الأكثر — عُدّيها قبل أن تكتبي.',
  },
  {
    id: 'time', icon: Clock, color: 'var(--sunset-orange, #fb7185)',
    title: 'إدارة الوقت والأعصاب', subtitle: 'كيف لا تضيّعين الساعة',
    concept: 'أكثر ما يخفض الدرجة ليس صعوبة النص بل سوء إدارة الوقت. النصوص تتدرّج في الصعوبة، فلا تعلَقي في سؤال واحد.',
    steps: [
      'إن استعصى سؤال بعد دقيقة، ضعي تخميناً وضعي علامة وانتقلي — عودي إليه إن بقي وقت.',
      'راقبي الساعة: نص كل ٢٠ دقيقة تقريباً.',
      'في آخر دقيقتين، تأكّدي أن كل الأربعين خانة مملوءة (خمّني ما تبقّى).',
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
      <span style={{ width: 38, height: 38, borderRadius: 11, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in oklab, ${lesson.color} 15%, transparent)`, border: `1px solid color-mix(in oklab, ${lesson.color} 30%, transparent)`, color: lesson.color }}>
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


// ── The method ──────────────────────────────────────────────────────────────
// Reading is not a language test, it is a speed-and-location test. Everything
// below is organised around that single claim, because it is the one that
// changes how a student spends the sixty minutes.

const FAILURES = [
  { icon: Search, tone: 'bad',    label: 'ما وجدتُ الجواب',   cure: 'القنص',              to: `${BASE}/reading/micro?kind=scan` },
  { icon: Radar, tone: 'gold',    label: 'فهمتُه خطأ',        cure: 'رادار إعادة الصياغة', to: `${BASE}/reading/micro?kind=paraphrase` },
  { icon: Clock, tone: 'accent',  label: 'خلص الوقت',         cure: 'تحت الساعة',          to: `${BASE}/reading/clock` },
]
const TONE = { bad: '#fca5a5', gold: 'var(--iel-gold-ink)', accent: 'var(--iel-accent-ink)' }

const PLAN = [
  { t: '١٧', l: 'القطعة الأولى', s: 'الأيسر · ابدأ منها' },
  { t: '٢٠', l: 'القطعة الثانية', s: 'متوسطة' },
  { t: '٢٠', l: 'القطعة الثالثة', s: 'الأصعب · الأطول' },
  { t: '٣',  l: 'المراجعة',      s: 'الفراغات فقط' },
]

const ROUTINE = (g) => [
  { n: '١', h: g('اقرأ الأسئلة أولاً — لا القطعة', 'اقرئي الأسئلة أولاً — لا القطعة'), p: g('تسعون ثانية. تحدّد ما الذي تبحث عنه قبل أن تقرأ كلمة واحدة من النص. القراءة بلا هدف أكبر مضيّعة للوقت في الامتحان.', 'تسعون ثانية. تحدّدين ما الذي تبحثين عنه قبل أن تقرئي كلمة واحدة من النص. القراءة بلا هدف أكبر مضيّعة للوقت في الامتحان.') },
  { n: '٢', h: 'سطر أول وأخير من كل فقرة', p: g('دقيقتان. لا تقرأ النص كاملاً — ارسم خريطة: أين يقع كل موضوع. هذه الخريطة هي ما يجعلك تجد الجواب لاحقاً في ثوانٍ.', 'دقيقتان. لا تقرئي النص كاملاً — ارسمي خريطة: أين يقع كل موضوع. هذه الخريطة هي ما يجعلك تجدين الجواب لاحقاً في ثوانٍ.') },
  { n: '٣', h: g('حلّ بالترتيب — إلا العناوين', 'حلّي بالترتيب — إلا العناوين'), p: 'معظم الأنواع تتبع ترتيب النص، فجواب السؤال التالي يقع بعد سابقه. الاستثناء: مطابقة العناوين ومطابقة المعلومات — تُترك للآخر.' },
  { n: '٤', h: 'قاعدة الدقيقة الواحدة', p: g('إذا مرّت دقيقة على سؤال واحد، اتركه وضع علامة وانتقل. السؤال الواحد درجة واحدة، والدقيقتان الضائعتان تساويان ثلاث درجات في القطعة الأخيرة.', 'إذا مرّت دقيقة على سؤال واحد، اتركيه وضعي علامة وانتقلي. السؤال الواحد درجة واحدة، والدقيقتان الضائعتان تساويان ثلاث درجات في القطعة الأخيرة.'), gold: true },
  { n: '٥', h: g('لا تترك فراغاً أبداً', 'لا تتركي فراغاً أبداً'), p: g('لا خصم على الخطأ. أي فراغ في ورقتك درجة تبرّعت بها. خمّن، ثم انتقل.', 'لا خصم على الخطأ. أي فراغ في ورقتك درجة تبرّعتِ بها. خمّني، ثم انتقلي.') },
]

const LADDER = (g) => [
  { k: 'الدرجة ١ و ٢', h: g('اعرف الطريقة والفخ', 'اعرفي الطريقة والفخ'), p: 'دليل القراءة ثم أنواع الأسئلة — كيف يُبنى كل نوع وأين يُخدَع الطالب.', to: `${BASE}/reading/types`, tone: 'accent' },
  { k: 'الدرجة ٣',     h: g('درّب المهارة الخام', 'درّبي المهارة الخام'),  p: 'المهارات المصغّرة: تكرارات من ١٥ إلى ٩٠ ثانية على المهارة وحدها.', to: `${BASE}/reading/micro`, tone: 'gold' },
  { k: 'الدرجة ٤',     h: 'قطعة واحدة تحت ساعة',  p: g('ثلاثة عشر سؤالاً في عشرين دقيقة — الدرجة التي ستعيش عليها أسابيع.', 'ثلاثة عشر سؤالاً في عشرين دقيقة — الدرجة التي ستعيشين عليها أسابيع.'), to: `${BASE}/reading/clock`, tone: 'gold' },
  { k: 'الدرجة ٥',     h: 'الامتحان الكامل',      p: 'ثلاث قطع، أربعون سؤالاً، ستون دقيقة، بلا إيقاف.', to: `${BASE}/reading/tests`, tone: 'accent' },
]

export default function ReadingGuide() {
  const navigate = useNavigate()
  const g = useG()
  const [open, setOpen] = useState(null)
  const routine = ROUTINE(g)
  const ladder = LADDER(g)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26, paddingTop: 2, maxWidth: 940 }}>
      <LabHeader eyebrow="الدرجة الأولى · الطريقة" title="دليل القراءة">
        القراءة في الآيلتس ليست اختبار لغة — هي اختبار سرعة وتحديد موقع. هذا الدليل يشرح الطريقة كاملة: {g('كيف توزّع الستين دقيقة، وكيف تتعامل مع أي قطعة في خمس خطوات، وأين تُفقَد الدرجات فعلياً.', 'كيف توزّعين الستين دقيقة، وكيف تتعاملين مع أي قطعة في خمس خطوات، وأين تُفقَد الدرجات فعلياً.')}
      </LabHeader>

      {/* The one claim the whole section is built on */}
      <div className="iel-coach">
        <div className="iel-coach-glow" />
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-accent)', letterSpacing: '.06em', marginBottom: 10 }}>الحقيقة التي تحدّد درجتك</div>
          <h3 style={{ fontFamily: 'var(--iel-display)', fontSize: 24, fontWeight: 700, color: 'var(--iel-ink)', lineHeight: 1.5, margin: '0 0 9px' }}>
            سقف درجتك تحدّده ثلاثة أخطاء فقط، لا أكثر
          </h3>
          <p style={{ fontSize: 14, color: 'var(--iel-ink-2)', lineHeight: 1.85, margin: '0 0 17px', maxWidth: '60ch' }}>
            {g('مهما تعدّدت الأسئلة، كل إجابة خاطئة ترجع إلى واحد من ثلاثة: ما وجدت الجواب، أو وجدته وفهمته خطأ، أو انتهى الوقت. كل قسم في القراءة مبنيّ لعلاج واحد منها.', 'مهما تعدّدت الأسئلة، كل إجابة خاطئة ترجع إلى واحد من ثلاثة: ما وجدتِ الجواب، أو وجدتِه وفهمتِه خطأ، أو انتهى الوقت. كل قسم في القراءة مبنيّ لعلاج واحد منها.')}
          </p>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', position: 'relative' }}>
            {FAILURES.map((f) => (
              <button key={f.label} type="button" onClick={() => navigate(f.to)} className="iel-metachip"
                style={{ cursor: 'pointer', color: TONE[f.tone], borderColor: f.tone === 'bad' ? 'rgba(248,113,113,.3)' : f.tone === 'gold' ? 'rgba(234,179,8,.3)' : 'rgba(16,185,129,.3)' }}>
                <f.icon size={13} /> {f.label} ← {f.cure}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 60 minutes */}
      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 13 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--iel-ink)' }}>خطة الستين دقيقة</h2>
          <span style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 600 }}>لا وقت إضافي لنقل الإجابات — الوقت هو الامتحان</span>
        </div>
        <div style={{ display: 'flex', borderRadius: 14, overflow: 'hidden', border: '1px solid var(--iel-border)', flexWrap: 'wrap' }}>
          {PLAN.map((p, i) => (
            <div key={p.l} style={{ flex: '1 1 150px', padding: '15px 12px', textAlign: 'center', background: 'var(--iel-surface-2)', borderInlineStart: i ? '1px solid var(--iel-border)' : 0 }}>
              <div className="iel-serif" style={{ fontSize: 24, fontWeight: 700, color: 'var(--iel-accent-ink)' }}>{p.t}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--iel-ink-2)', marginTop: 5 }}>{p.l}</div>
              <div style={{ fontSize: 11.5, color: 'var(--iel-ink-3)', marginTop: 2 }}>{p.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 5-step routine */}
      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 13 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--iel-ink)' }}>روتين القطعة الواحدة</h2>
          <span style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 600 }}>خمس خطوات، بنفس الترتيب، في كل مرة</span>
        </div>
        <div className="iel-gcard" style={{ padding: '22px 24px' }}>
          {routine.map((r, i) => (
            <div key={r.n} style={{ display: 'flex', gap: 15, position: 'relative', paddingBottom: i === routine.length - 1 ? 0 : 19 }}>
              {i !== routine.length - 1 && (
                <span style={{ position: 'absolute', insetInlineStart: 19, top: 42, bottom: 0, width: 2, background: 'linear-gradient(180deg, rgba(16,185,129,.4), rgba(16,185,129,.1))' }} />
              )}
              <span style={{
                width: 40, height: 40, borderRadius: 13, flex: 'none', display: 'grid', placeItems: 'center',
                fontWeight: 900, fontSize: 15, position: 'relative', zIndex: 1,
                background: r.gold ? 'var(--iel-gold-soft)' : 'var(--iel-accent-soft)',
                border: `1px solid ${r.gold ? 'rgba(234,179,8,.34)' : 'rgba(16,185,129,.34)'}`,
                color: r.gold ? 'var(--iel-gold-ink)' : 'var(--iel-accent-ink)',
              }}>{r.n}</span>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                <h4 style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 5 }}>{r.h}</h4>
                <p style={{ fontSize: 13.5, color: 'var(--iel-ink-2)', lineHeight: 1.8, margin: 0 }}>{r.p}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* the ladder */}
      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 13 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--iel-ink)' }}>سلّم القراءة</h2>
          <span style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 600 }}>{g('كل درجة تُبنى على ما قبلها — وأخطاؤك تُرجعك إلى التي سقطت منها', 'كل درجة تُبنى على ما قبلها — وأخطاؤك تُرجعك إلى التي سقطتِ منها')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          {ladder.map((l) => (
            <button key={l.h} type="button" onClick={() => navigate(l.to)} className="iel-gcard"
              style={{ padding: 18, textAlign: 'start', cursor: 'pointer', fontFamily: "'Tajawal', sans-serif" }}>
              <span className="iel-metachip" style={{
                marginBottom: 10,
                background: l.tone === 'gold' ? 'var(--iel-gold-soft)' : 'var(--iel-accent-soft)',
                borderColor: l.tone === 'gold' ? 'rgba(234,179,8,.3)' : 'rgba(16,185,129,.3)',
                color: l.tone === 'gold' ? 'var(--iel-gold-ink)' : 'var(--iel-accent-ink)',
              }}>{l.k}</span>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--iel-ink)', margin: '0 0 6px' }}>{l.h}</h4>
              <p style={{ fontSize: 13, color: 'var(--iel-ink-2)', lineHeight: 1.75, margin: 0 }}>{l.p}</p>
            </button>
          ))}
        </div>
      </section>

      {/* the original eight lessons — kept in full, now framed as the detail
          layer beneath the method rather than the whole of it */}
      <section>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 13 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--iel-ink)' }}>الدروس المفصّلة</h2>
          <span style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 600 }}>كل درس فيه الفكرة وخطوات واضحة ومثال</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))', gap: 12 }}>
          {READING_LESSONS.map((l) => <LessonCard key={l.id} lesson={l} onOpen={setOpen} />)}
        </div>
      </section>

      <ReadingDrawer open={!!open} onClose={() => setOpen(null)} icon={open?.icon} color={open?.color} kicker="درس القراءة" title={open?.title} subtitle={open?.subtitle}>
        {open && (
          <>
            <DrawerLede>{open.concept}</DrawerLede>
            <DrawerSteps title="الخطوات" steps={open.steps} color={open.color} span={open.example ? 1 : 2} />
            {open.example && (
              <DrawerExample title="مثال" span={1}>
                <p style={{ margin: '0 0 8px', fontSize: 13, lineHeight: 1.7, color: 'var(--iel-ink)', direction: 'ltr', textAlign: 'left', fontFamily: SANS }}>{open.example.text_en}</p>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.8, color: 'var(--iel-ink-3)' }}>{open.example.why_ar}</p>
              </DrawerExample>
            )}
            <DrawerCallout icon={Lightbulb} tone="gold" title="نصيحة" span={2}>{open.tip}</DrawerCallout>
          </>
        )}
      </ReadingDrawer>
    </div>
  )
}
