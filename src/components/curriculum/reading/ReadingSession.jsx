// The «session» shape of a reading: a contract before it, and a take-away after.
//
// WHY THIS EXISTS
// Production says the reading section asks nothing of the student. Across 325
// completed readings by 33 students: 71% score a perfect 100, 28% finish the
// whole section in under two minutes, and the median is 236 seconds. The owner's
// own custom student finished her unit-1 reading with 100/100 in 101 seconds —
// while scoring 63 on that same unit's grammar, which is exactly the grammar her
// reading's study sheet teaches.
//
// Nothing here changes what is graded, what is saved, or what the student has
// already answered. It changes the SHAPE of the visit: you arrive knowing what
// this text is going to give you and what to look for, and you leave holding a
// named list of it. Both blocks are derived entirely from content that already
// exists on the row — no new columns, no new authoring.
//
// Rendered only when curriculum_readings.experience_version = 'session'. Every
// other reading renders exactly as before.
import { GraduationCap, Target, BookOpen, Quote, Layers, EyeOff } from 'lucide-react'
import { useG } from '@/i18n/gender'

const T = {
  ink: 'var(--ds-text-primary, #faf5e6)',
  body: 'var(--ds-text-secondary, #c9c3b0)',
  muted: 'var(--ds-text-tertiary, #8b8578)',
  gold: 'var(--ds-accent-primary, #e9b949)',
  rule: 'var(--ds-accent-rule, rgba(233,185,73,.42))',
  wash: 'var(--ds-accent-wash, rgba(233,185,73,.08))',
  ground: 'var(--ds-bg-elevated, #0d111b)',
  raise: 'var(--ds-surface-1, rgba(255,255,255,0.028))',
  warm: 'var(--ds-surface-2, rgba(255,215,140,0.055))',
  edge: 'var(--ds-border-subtle, rgba(255,255,255,0.07))',
}
const GOLD_EDGE = 'rgba(233,185,73,0.26)'

function Shell({ icon: Icon, title, sub, children }) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl"
      style={{ background: T.ground, border: `1px solid ${T.edge}` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{ background: `radial-gradient(120% 70% at 50% 0%, ${T.wash}, transparent 70%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(to right, transparent, ${T.rule}, transparent)` }}
      />
      <div className="relative">
        <div
          className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6"
          style={{ borderBottom: `1px solid ${T.edge}` }}
        >
          <span
            className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
            style={{ background: T.wash, border: `1px solid ${GOLD_EDGE}` }}
          >
            <Icon size={17} style={{ color: T.gold }} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-['Tajawal'] text-[16px] font-bold" style={{ color: T.ink }}>{title}</h3>
            <p className="font-['Tajawal'] text-[12.5px]" style={{ color: T.body }}>{sub}</p>
          </div>
        </div>
        <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>
      </div>
    </section>
  )
}

function Stat({ n, label }) {
  return (
    <div className="rounded-xl px-3.5 py-3" style={{ background: T.raise, border: `1px solid ${T.edge}` }}>
      <div dir="ltr" className="text-right font-en text-[19px] font-bold" style={{ color: T.gold }}>{n}</div>
      <div className="font-['Tajawal'] text-[11.5px]" style={{ color: T.muted }}>{label}</div>
    </div>
  )
}

/**
 * What this text is about to give you, and the one thing to hold while reading.
 * Purpose-setting before a passage is the cheapest real gain in reading
 * pedagogy, and it fills a slot that is literally empty in the data:
 * before_read_exercise_a is NULL on all 260 readings.
 */
export function ReadingContract({ reading, vocabCount = 0 }) {
  const g = useG()
  const sheet = reading?.study_sheet
  if (!sheet) return null

  const patterns = sheet.teach?.length || 0
  const phrases = sheet.phrases?.length || 0
  const words = reading.passage_word_count || 0
  // Read + study + prove. Deliberately rounded and conservative so the number
  // is never a promise the section cannot keep.
  const minutes = Math.max(4, Math.round(words / 110 + patterns * 1.6 + 2))

  const nodes = sheet.map?.nodes?.length || 0
  const purpose = nodes
    ? `${sheet.map.label_ar || 'خريطة النص'} — ${nodes} محطات. ما هي، وبأي ترتيب؟`
    : reading.reading_skill_name_ar
      ? `${reading.reading_skill_name_ar} — ${g('ابحث', 'ابحثي')} عن هذا أثناء القراءة.`
      : sheet.digest_ar?.[0] || null

  return (
    <Shell
      icon={Target}
      title={g('قبل أن تقرأ', 'قبل أن تقرئي')}
      sub={g('ما الذي يعطيك هذا النص', 'ما الذي يعطيكِ هذا النص')}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat n={patterns} label="تراكيب تُذاكَر" />
        <Stat n={phrases} label="عبارات جاهزة" />
        <Stat n={vocabCount} label="كلمة في النص" />
        <Stat n={`~${minutes}`} label="دقائق" />
      </div>

      {purpose && (
        <div
          className="mt-4 rounded-xl px-4 py-3.5"
          style={{ background: T.warm, border: `1px dashed ${GOLD_EDGE}` }}
        >
          <div className="mb-1.5 font-['Tajawal'] text-[11px] font-bold" style={{ color: T.gold }}>
            {g('اقرأ وأنت تبحث عن هذا', 'اقرئي وأنتِ تبحثين عن هذا')}
          </div>
          <p dir="rtl" className="font-['Tajawal'] text-[14.5px] leading-[1.95]" style={{ color: T.ink }}>
            {purpose}
          </p>
        </div>
      )}
    </Shell>
  )
}

/** The bar that stands in for the passage while the check is being answered. */
export function PassageFoldedBar({ title, onUnfold }) {
  const g = useG()
  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4"
      style={{ background: T.raise, border: `1px solid ${T.edge}` }}
    >
      <EyeOff size={15} style={{ color: T.gold }} className="flex-none" />
      <span className="min-w-0 flex-1 truncate font-['Tajawal'] text-[13.5px]" style={{ color: T.body }}>
        {g('النص مطويّ', 'النص مطويّ')} — {title}
      </span>
      <button
        onClick={onUnfold}
        style={{ background: T.wash, color: T.gold, border: `1px solid ${GOLD_EDGE}` }}
        className="min-h-[38px] flex-none rounded-lg px-3.5 py-1.5 font-['Tajawal'] text-[12.5px] font-bold transition-opacity hover:opacity-80 [@media(pointer:coarse)]:min-h-[44px]"
      >
        {g('أظهر النص', 'أظهري النص')}
      </button>
    </div>
  )
}

/**
 * What leaves the page with the student.
 *
 * Deliberately makes NO claim that anything is transferred automatically —
 * nothing is wired to do that yet, and a surface that promises a transfer it
 * does not perform is worse than one that promises nothing.
 */
export function ReadingOutcome({ reading, vocabCount = 0 }) {
  const g = useG()
  const sheet = reading?.study_sheet
  if (!sheet) return null
  const patterns = sheet.teach?.length || 0
  const phrases = sheet.phrases?.length || 0

  const items = [
    { icon: Quote, n: phrases, h: 'عبارات جاهزة',
      p: g('انقلها كما هي إلى كتابتك ومحادثتك — هي عبارات تتكرر في عملك.',
           'انقليها كما هي إلى كتابتكِ ومحادثتكِ — هي عبارات تتكرر في عملكِ.') },
    { icon: BookOpen, n: vocabCount, h: 'كلمة في هذا النص',
      p: g('نفس الكلمات في قسم المفردات لهذه الوحدة.',
           'نفس الكلمات في قسم المفردات لهذه الوحدة.') },
    { icon: Layers, n: patterns, h: 'تراكيب تُذاكَر',
      p: g('راجعها من ورقة المذاكرة قبل قسم القواعد في هذه الوحدة.',
           'راجعيها من ورقة المذاكرة قبل قسم القواعد في هذه الوحدة.') },
  ].filter((i) => i.n > 0)

  if (!items.length) return null

  return (
    <Shell
      icon={GraduationCap}
      title="الحصيلة"
      sub={g('ما الذي خرجت به من هذا النص', 'ما الذي خرجتِ به من هذا النص')}
    >
      <div className="grid gap-2.5 sm:grid-cols-3">
        {items.map(({ icon: Icon, n, h, p }) => (
          <div key={h} className="rounded-xl px-4 py-4" style={{ background: T.raise, border: `1px solid ${T.edge}` }}>
            <Icon size={15} style={{ color: T.gold }} />
            <div dir="ltr" className="mt-2 text-right font-en text-[19px] font-bold" style={{ color: T.gold }}>{n}</div>
            <h4 className="mt-0.5 font-['Tajawal'] text-[13.5px] font-bold" style={{ color: T.ink }}>{h}</h4>
            <p className="mt-1 font-['Tajawal'] text-[12px] leading-[1.8]" style={{ color: T.muted }}>{p}</p>
          </div>
        ))}
      </div>
    </Shell>
  )
}
