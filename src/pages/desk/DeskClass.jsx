// DeskClass — the debrief + drill reader for one live class. Four movements:
//   الخلاصة (recap) → تأكّدي إنك فهمتِ (check) → مرّني (practice) → خلاصة ذهبية.
// Warm, in-the-teacher's-voice, creditless (authored + on-device speech).
import { useMemo, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Volume2, Clock, Check, CheckCircle2, BookOpen, HelpCircle, Dumbbell, Award, RotateCcw, Eye, Repeat, ListOrdered, Wrench, Languages, Sparkles, CalendarDays } from 'lucide-react'
import { useG } from '@/i18n/gender'
import { getClass, ALL_CLASSES } from '@/data/desk/classes'
import { useClassProgress } from './useClassProgress'
import './desk.css'

function speakEn(text) {
  try {
    if (!window.speechSynthesis || !text) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'; u.rate = 0.92
    window.speechSynthesis.speak(u)
  } catch { /* silent */ }
}
const PlayBtn = ({ text }) => (
  <button onClick={() => speakEn(text)} className="desk-ghost-btn flex-shrink-0" aria-label="استماع"><Volume2 size={14} /></button>
)

const MovementHead = ({ eyebrow, ar, icon: Icon }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <span className="desk-lesson-sec-mark"><Icon size={16} /></span>
    <div>
      <p className="font-['Inter'] text-[11px] tracking-[0.18em]" dir="ltr" style={{ color: 'rgba(201,162,92,0.62)' }}>{eyebrow}</p>
      <h2 className="font-['Tajawal'] font-extrabold text-[20px] leading-tight mt-0.5" style={{ color: 'var(--cream)' }}>{ar}</h2>
    </div>
  </div>
)

// ── recap concept card ──
function RecapCard({ c }) {
  return (
    <div className="desk-glass p-6">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="font-['Tajawal'] font-extrabold text-[16px] leading-tight" style={{ color: 'var(--cream)' }}>{c.ar}</h3>
        {c.en && <span className="font-['Inter'] text-[11.5px] flex-shrink-0" dir="ltr" style={{ color: 'rgba(243,238,226,0.42)' }}>{c.en}</span>}
      </div>
      <p className="font-['Tajawal'] text-[14px] leading-[1.85]" style={{ color: 'rgba(243,238,226,0.8)' }}>{c.body_ar}</p>
      {c.model_ar && (
        <div className="desk-model-callout mt-3.5">
          <Sparkles size={15} style={{ color: 'var(--brass-hi)' }} className="flex-shrink-0 mt-0.5" />
          <p className="font-['Tajawal'] text-[13px] font-bold leading-relaxed" style={{ color: 'var(--brass-hi)' }}>{c.model_ar}</p>
        </div>
      )}
      {c.examples?.length > 0 && (
        <div className="mt-3.5 space-y-2">
          {c.examples.map((ex, i) => (
            <div key={i} className="desk-eg-row">
              <div className="min-w-0 flex-1">
                <p className="font-['Inter'] text-[14px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{ex.en}</p>
                {ex.ar && <p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(243,238,226,0.55)' }}>{ex.ar}{ex.note_ar ? <span style={{ color: 'rgba(201,162,92,0.7)' }}> · {ex.note_ar}</span> : ''}</p>}
                {!ex.ar && ex.note_ar && <p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(201,162,92,0.7)' }}>{ex.note_ar}</p>}
              </div>
              <PlayBtn text={ex.en} />
            </div>
          ))}
        </div>
      )}
      {c.rule_ar && (
        <p className="font-['Tajawal'] text-[12.5px] mt-3.5 pt-3 desk-hair" style={{ color: 'rgba(201,162,92,0.8)' }}>⚑ {c.rule_ar}</p>
      )}
    </div>
  )
}

// ── MCQ (used for check + the 'choose' practice) ──
function MCQ({ q_ar, prompt_ar, options }) {
  const g = useG()
  const [picked, setPicked] = useState(null)
  const chosen = picked != null ? options[picked] : null
  return (
    <div className="desk-glass p-6">
      <p className="font-['Tajawal'] text-[14px] font-bold mb-3.5 leading-relaxed" style={{ color: 'rgba(243,238,226,0.9)' }} dir="auto">{q_ar || prompt_ar}</p>
      <div className="space-y-2.5">
        {options.map((opt, i) => {
          const isPicked = picked === i
          const state = picked == null ? 'idle' : opt.correct ? 'correct' : isPicked ? 'wrong' : 'dim'
          return (
            <button key={i} disabled={picked != null && opt.correct}
              onClick={() => { if (picked == null) setPicked(i) }} className={`desk-choose-opt ${state}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-start">
                  {opt.en && <p className="font-['Inter'] text-[14px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{opt.en}</p>}
                  {opt.ar && <p className={`font-['Tajawal'] text-[13px] ${opt.en ? 'mt-0.5' : ''}`} style={{ color: opt.en ? 'rgba(243,238,226,0.55)' : 'var(--cream)' }}>{opt.ar}</p>}
                </div>
                {state === 'correct' && <CheckCircle2 size={18} className="flex-shrink-0 desk-pop" style={{ color: '#6ee7b7' }} />}
              </div>
              {picked != null && (state === 'correct' || state === 'wrong') && (
                <p className="font-['Tajawal'] text-[12px] mt-2 pt-2 desk-hair" style={{ color: state === 'correct' ? 'rgba(110,231,183,0.9)' : 'rgba(255,180,164,0.85)' }}>{opt.why_ar}</p>
              )}
            </button>
          )
        })}
      </div>
      {picked != null && !chosen?.correct && (
        <button onClick={() => setPicked(null)} className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[12px] mt-2.5" style={{ color: 'var(--brass)' }}>
          <RotateCcw size={13} /> {g('حاول مرة ثانية', 'حاولي مرة ثانية')}
        </button>
      )}
    </div>
  )
}

// ── ladder (retrieve → reveal) ──
function Ladder({ p }) {
  const g = useG()
  return (
    <div className="desk-glass p-6">
      <p className="font-['Tajawal'] text-[13px] leading-relaxed mb-4" style={{ color: 'rgba(243,238,226,0.7)' }}>{p.intro_ar}</p>
      {/* base */}
      <div className="desk-ladder-base">
        <span className="font-['Tajawal'] text-[11px] font-bold" style={{ color: 'var(--brass)' }}>{g('الجملة الأساس', 'الجملة الأساس')}</span>
        <div className="flex items-center justify-between gap-3 mt-1">
          <div>
            <p className="font-['Inter'] text-[16px] font-semibold" dir="ltr" style={{ color: 'var(--cream)' }}>{p.base.en}</p>
            <p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(243,238,226,0.55)' }}>{p.base.ar}</p>
          </div>
          <PlayBtn text={p.base.en} />
        </div>
      </div>
      {/* rungs */}
      <div className="mt-3 space-y-2.5">
        {p.rungs.map((r, i) => <LadderRung key={i} r={r} n={i + 1} g={g} />)}
      </div>
    </div>
  )
}
function LadderRung({ r, n, g }) {
  const rm = useReducedMotion()
  const [open, setOpen] = useState(false)
  return (
    <div className={`desk-rung ${open ? 'is-open' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="desk-rung-num">{n}</span>
        <p className="font-['Tajawal'] text-[13.5px] font-bold flex-1" style={{ color: 'var(--cream)' }}>{r.task_ar}</p>
        {!open && (
          <button onClick={() => setOpen(true)} className="desk-reveal-btn">
            <Eye size={13} /> {g('أظهر', 'أظهري')}
          </button>
        )}
      </div>
      {open && (
        <motion.div initial={rm ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
          <div className="flex items-start justify-between gap-3 mt-2.5 pt-2.5 desk-hair">
            <div className="min-w-0">
              <p className="font-['Inter'] text-[14.5px] font-semibold leading-snug" dir="ltr" style={{ color: '#a9e7c9' }}>{r.en}</p>
              {r.why_ar && <p className="font-['Tajawal'] text-[12px] mt-1.5" style={{ color: 'rgba(243,238,226,0.6)' }}>{r.why_ar}</p>}
            </div>
            <PlayBtn text={r.en} />
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ── fix-it ──
function FixIt({ p }) {
  const g = useG()
  return (
    <div className="desk-glass p-6">
      <p className="font-['Tajawal'] text-[13px] leading-relaxed mb-4" style={{ color: 'rgba(243,238,226,0.7)' }}>{p.intro_ar}</p>
      <div className="space-y-3">
        {p.items.map((it, i) => <FixRow key={i} it={it} g={g} />)}
      </div>
    </div>
  )
}
function FixRow({ it, g }) {
  const rm = useReducedMotion()
  const [open, setOpen] = useState(false)
  return (
    <div className="desk-fix-row">
      <div className="flex items-start justify-between gap-3">
        <p className="font-['Inter'] text-[14px] leading-snug line-through" dir="ltr" style={{ color: 'rgba(255,180,164,0.72)' }}>{it.wrong}</p>
        {!open && <button onClick={() => setOpen(true)} className="desk-reveal-btn flex-shrink-0"><Wrench size={12} /> {g('صحّح', 'صحّحي')}</button>}
      </div>
      {open && (
        <motion.div initial={rm ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between gap-3 mt-2.5 pt-2.5 desk-hair">
            <div className="min-w-0">
              <p className="font-['Inter'] text-[14.5px] font-semibold leading-snug desk-pop" dir="ltr" style={{ color: '#a9e7c9' }}>{it.right}</p>
              {it.why_ar && <p className="font-['Tajawal'] text-[12px] mt-1.5" style={{ color: 'rgba(243,238,226,0.6)' }}>{it.why_ar}</p>}
            </div>
            <PlayBtn text={it.right} />
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ── irregular flip-trainer ──
function Irregular({ p }) {
  const g = useG()
  return (
    <div className="desk-glass p-6">
      <p className="font-['Tajawal'] text-[13px] leading-relaxed mb-4" style={{ color: 'rgba(243,238,226,0.7)' }}>{p.intro_ar}</p>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {p.verbs.map((v, i) => <IrregularCard key={i} v={v} g={g} />)}
      </div>
    </div>
  )
}
function IrregularCard({ v, g }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <button onClick={() => setFlipped((f) => !f)} className={`desk-flip ${flipped ? 'is-flipped' : ''}`}>
      {!flipped ? (
        <div className="flex items-center justify-between w-full gap-2">
          <div className="text-start">
            <p className="font-['Inter'] text-[17px] font-bold" dir="ltr" style={{ color: 'var(--cream)' }}>{v.base}</p>
            <p className="font-['Tajawal'] text-[12px]" style={{ color: 'rgba(243,238,226,0.5)' }}>{v.ar}</p>
          </div>
          <Repeat size={15} style={{ color: 'rgba(201,162,92,0.6)' }} />
        </div>
      ) : (
        <div className="flex items-center justify-between w-full gap-2">
          <div className="text-start" dir="ltr">
            <p className="font-['Inter'] text-[14.5px] font-semibold desk-pop" style={{ color: 'var(--brass-hi)' }}>{v.base} · {v.past} · {v.pp}</p>
            <p className="font-['Tajawal'] text-[11px] mt-0.5" dir="rtl" style={{ color: 'rgba(243,238,226,0.5)' }}>{g('المصدر · الماضي · اسم المفعول', 'المصدر · الماضي · اسم المفعول')}</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); speakEn(`${v.base}, ${v.past}, ${v.pp}`) }} className="desk-ghost-btn flex-shrink-0"><Volume2 size={13} /></button>
        </div>
      )}
    </button>
  )
}

// ── translate (attempt → reveal) ──
function Translate({ p }) {
  const g = useG()
  return (
    <div className="desk-glass p-6">
      <p className="font-['Tajawal'] text-[13px] leading-relaxed mb-4" style={{ color: 'rgba(243,238,226,0.7)' }}>{p.intro_ar}</p>
      <div className="space-y-3">
        {p.items.map((it, i) => <TranslateRow key={i} it={it} g={g} />)}
      </div>
    </div>
  )
}
function TranslateRow({ it, g }) {
  const rm = useReducedMotion()
  const [open, setOpen] = useState(false)
  return (
    <div className="desk-fix-row">
      <div className="flex items-start justify-between gap-3">
        <p className="font-['Tajawal'] text-[14px] font-bold leading-snug" style={{ color: 'var(--cream)' }}>{it.ar}</p>
        {!open && <button onClick={() => setOpen(true)} className="desk-reveal-btn flex-shrink-0"><Eye size={12} /> {g('النموذج', 'النموذج')}</button>}
      </div>
      {open && (
        <motion.div initial={rm ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between gap-3 mt-2.5 pt-2.5 desk-hair">
            <div className="min-w-0">
              <p className="font-['Inter'] text-[14.5px] font-semibold leading-snug desk-pop" dir="ltr" style={{ color: '#a9e7c9' }}>{it.en}</p>
              {it.alt_en && <p className="font-['Inter'] text-[13px] mt-1" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>{g('أو:', 'أو:')} {it.alt_en}</p>}
            </div>
            <PlayBtn text={it.en} />
          </div>
        </motion.div>
      )}
    </div>
  )
}

const PRACTICE_META = {
  ladder: { icon: ListOrdered },
  fix: { icon: Wrench },
  irregular: { icon: Repeat },
  translate: { icon: Languages },
  choose: { icon: Sparkles },
}

export default function DeskClass() {
  const { classId } = useParams()
  const g = useG()
  const cls = getClass(classId)
  const { isDone, markDone } = useClassProgress()

  const next = useMemo(() => {
    // next = the class with the next-higher number (chronological "next")
    if (!cls) return null
    return ALL_CLASSES.find((c) => c.number === cls.number + 1) || null
  }, [cls])

  if (!cls) return <Navigate to="/desk/classes" replace />
  const done = isDone(cls.id)

  return (
    <div className="space-y-12 max-w-[720px] mx-auto">
      <Link to="/desk/classes" className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px] desk-rise" style={{ color: 'rgba(243,238,226,0.5)' }}>
        <ArrowRight size={15} /> {g('حصصي', 'حصصي')}
      </Link>

      {/* masthead */}
      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-['Inter'] font-black text-[12px] px-2.5 h-6 grid place-items-center rounded-lg" dir="ltr" style={{ color: '#1a130a', background: 'linear-gradient(135deg,#efd299,#c9a25c)' }}>{g('الحصة', 'الحصة')} {cls.number}</span>
          {done && <span className="inline-flex items-center gap-1 font-['Tajawal'] text-[11.5px] px-2.5 py-0.5 rounded-full" style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.12)', border: '1px solid rgba(201,162,92,0.3)' }}><Check size={12} strokeWidth={3} /> {g('راجعتها', 'راجعتيها')}</span>}
        </div>
        <h1 className="font-['Tajawal'] font-extrabold text-2xl lg:text-[30px] leading-tight" style={{ color: 'var(--cream)' }}>{cls.title_ar}</h1>
        <p className="font-['Inter'] text-[13px] mt-1" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>{cls.title_en}</p>
        <p className="font-['Tajawal'] text-[13.5px] mt-3 leading-relaxed max-w-[600px]" style={{ color: 'rgba(243,238,226,0.6)' }}>{cls.tagline_ar}</p>
      </div>

      {/* الخلاصة */}
      {cls.recap?.length > 0 && (
        <section className="desk-rise">
          <MovementHead eyebrow="RECAP" ar="الخلاصة" icon={BookOpen} />
          <div className="space-y-3">
            {cls.recap.map((c) => <RecapCard key={c.id} c={c} />)}
          </div>
        </section>
      )}

      {/* تأكّدي إنك فهمتِ */}
      {cls.check?.length > 0 && (
        <section className="desk-rise">
          <MovementHead eyebrow="UNDERSTANDING CHECK" ar="تأكّدي إنك فهمتِ" icon={HelpCircle} />
          <div className="space-y-3">
            {cls.check.map((q, i) => <MCQ key={i} q_ar={q.q_ar} options={q.options} />)}
          </div>
        </section>
      )}

      {/* مرّني */}
      {cls.practice?.length > 0 && (
        <section className="desk-rise">
          <MovementHead eyebrow="PRACTICE" ar="تمرّني" icon={Dumbbell} />
          <div className="space-y-5">
            {cls.practice.map((p, i) => {
              const Icon = (PRACTICE_META[p.type] || {}).icon || Sparkles
              return (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <Icon size={15} style={{ color: 'var(--brass)' }} />
                    <h3 className="font-['Tajawal'] font-bold text-[15px]" style={{ color: 'var(--cream)' }}>{p.title_ar}</h3>
                  </div>
                  {p.type === 'ladder' && <Ladder p={p} />}
                  {p.type === 'fix' && <FixIt p={p} />}
                  {p.type === 'irregular' && <Irregular p={p} />}
                  {p.type === 'translate' && <Translate p={p} />}
                  {p.type === 'choose' && <MCQ prompt_ar={p.prompt_ar} options={p.options} />}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* خلاصة ذهبية */}
      {cls.takeaways_ar?.length > 0 && (
        <section className="desk-rise">
          <MovementHead eyebrow="GOLDEN TAKEAWAYS" ar="خلاصة ذهبية" icon={Award} />
          <div className="desk-glass p-6 space-y-2.5" style={{ borderColor: 'rgba(201,162,92,0.22)' }}>
            {cls.takeaways_ar.map((t, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="desk-gold-dot">{i + 1}</span>
                <p className="font-['Tajawal'] text-[14px] font-bold leading-relaxed" style={{ color: 'var(--cream)' }}>{t}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* footer */}
      <div className="pt-2 desk-rise">
        {!done ? (
          <button onClick={() => markDone(cls.id)} className="desk-cta w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Tajawal'] font-bold text-[14px]">
            <Check size={17} /> {g('تمّت المراجعة', 'تمّت المراجعة')}
          </button>
        ) : (
          <div className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Tajawal'] font-bold text-[14px]" style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.1)', border: '1px solid rgba(201,162,92,0.26)' }}>
            <CheckCircle2 size={17} /> {g('راجعت هذي الحصة — أحسنت', 'راجعتِ هذي الحصة — أحسنتِ')}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 mt-4">
          <Link to="/desk/classes" className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px]" style={{ color: 'rgba(243,238,226,0.55)' }}>
            <ArrowRight size={15} /> {g('كل الحصص', 'كل الحصص')}
          </Link>
          {next && (
            <Link to={`/desk/classes/${next.id}`} className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px] font-bold" style={{ color: 'var(--brass-hi)' }}>
              {g('الحصة الجاية', 'الحصة الجاية')} <ArrowLeft size={15} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
