// DeskLesson — the premium lesson reader for a single curriculum lesson.
// A long-form, beautifully-typeset study surface: the idea + mental model, model
// phrases (tap-to-hear via on-device speech — creditless), terms, a worked
// mini-dialogue, one interactive practice beat, and the takeaway — then a
// deep-link into the matching roleplay scenario so she applies it live.
import { useMemo, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Volume2, Clock, Check, Lightbulb, MessageSquareQuote, Headset, Sparkles, RotateCcw, CheckCircle2, Cpu } from 'lucide-react'
import { useG } from '@/i18n/gender'
import { getLesson, getNextLesson, getPrevLesson } from '@/data/desk/curriculum'
import { useDeskModules } from './useDeskModules'
import { useCurriculumProgress } from './useCurriculumProgress'
import './desk.css'

function speakEn(text) {
  try {
    if (!window.speechSynthesis || !text) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'; u.rate = 0.92
    window.speechSynthesis.speak(u)
  } catch { /* Web Speech unavailable — silent */ }
}
const PlayBtn = ({ text }) => (
  <button onClick={() => speakEn(text)} className="desk-ghost-btn flex-shrink-0" aria-label="استماع"><Volume2 size={14} /></button>
)

// stable per-lesson shuffle so the practice order is fixed for a given lesson
function seededOrder(n, seedStr) {
  let seed = 0
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const j = seed % (i + 1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  return idx
}

// ── section header ──
const SectionHead = ({ eyebrow, ar, icon: Icon }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <span className="desk-lesson-sec-mark"><Icon size={16} /></span>
    <div>
      <p className="font-['Inter'] text-[11px] tracking-[0.18em]" dir="ltr" style={{ color: 'rgba(201,162,92,0.62)' }}>{eyebrow}</p>
      <h2 className="font-['Tajawal'] font-extrabold text-[20px] leading-tight mt-0.5" style={{ color: 'var(--cream)' }}>{ar}</h2>
    </div>
  </div>
)

// ── CHOOSE practice ──
function ChoosePractice({ practice, onSolved }) {
  const g = useG()
  const [picked, setPicked] = useState(null)
  const chosen = picked != null ? practice.options[picked] : null
  return (
    <div className="space-y-2.5">
      <p className="font-['Tajawal'] text-[14px] font-bold mb-3" style={{ color: 'rgba(243,238,226,0.85)' }}>{practice.prompt_ar}</p>
      {practice.options.map((opt, i) => {
        const isPicked = picked === i
        const state = picked == null ? 'idle' : opt.correct ? 'correct' : isPicked ? 'wrong' : 'dim'
        return (
          <button key={i} disabled={picked != null && opt.correct}
            onClick={() => { if (picked == null) { setPicked(i); if (opt.correct) onSolved?.() } }}
            className={`desk-choose-opt ${state}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-start">
                <p className="font-['Inter'] text-[14px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{opt.en}</p>
                <p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(243,238,226,0.55)' }}>{opt.ar}</p>
              </div>
              {state === 'correct' && <CheckCircle2 size={18} className="flex-shrink-0 desk-pop" style={{ color: '#6ee7b7' }} />}
            </div>
            {picked != null && (state === 'correct' || state === 'wrong') && (
              <p className="font-['Tajawal'] text-[12px] mt-2 pt-2 desk-hair" style={{ color: state === 'correct' ? 'rgba(110,231,183,0.9)' : 'rgba(255,180,164,0.85)' }}>{opt.why_ar}</p>
            )}
          </button>
        )
      })}
      {picked != null && !chosen?.correct && (
        <button onClick={() => setPicked(null)} className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[12px] mt-1" style={{ color: 'var(--brass)' }}>
          <RotateCcw size={13} /> {g('حاول مرة ثانية', 'حاولي مرة ثانية')}
        </button>
      )}
    </div>
  )
}

// ── ORDER practice ──
function OrderPractice({ practice, lessonId, onSolved }) {
  const g = useG()
  const shuffled = useMemo(() => seededOrder(practice.steps.length, lessonId), [practice.steps.length, lessonId])
  const [picked, setPicked] = useState([]) // array of original indices, in chosen order
  const [checked, setChecked] = useState(false)
  const remaining = shuffled.filter((oi) => !picked.includes(oi))
  const correct = checked && picked.every((oi, pos) => oi === pos)

  const check = () => {
    setChecked(true)
    if (picked.every((oi, pos) => oi === pos)) onSolved?.()
  }
  const reset = () => { setPicked([]); setChecked(false) }

  return (
    <div className="space-y-3">
      <p className="font-['Tajawal'] text-[14px] font-bold" style={{ color: 'rgba(243,238,226,0.85)' }}>{practice.prompt_ar}</p>

      {/* your order */}
      <div className="desk-order-tray">
        {picked.length === 0 && <p className="font-['Tajawal'] text-[12px] py-1" style={{ color: 'rgba(243,238,226,0.4)' }}>{g('اضغط الجمل بالترتيب الصح', 'اضغطي الجمل بالترتيب الصح')}</p>}
        {picked.map((oi, pos) => {
          const ok = checked && oi === pos
          const bad = checked && oi !== pos
          return (
            <button key={oi} disabled={checked} onClick={() => setPicked(picked.filter((x) => x !== oi))}
              className={`desk-order-chip is-picked ${ok ? 'ok' : ''} ${bad ? 'bad' : ''}`}>
              <span className="desk-order-num">{pos + 1}</span>
              <span className="font-['Inter'] text-[13px]" dir="ltr">{practice.steps[oi].en}</span>
            </button>
          )
        })}
      </div>

      {/* bank */}
      {remaining.length > 0 && !checked && (
        <div className="flex flex-wrap gap-2">
          {remaining.map((oi) => (
            <button key={oi} onClick={() => setPicked([...picked, oi])} className="desk-order-chip">
              <span className="font-['Inter'] text-[13px]" dir="ltr">{practice.steps[oi].en}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        {!checked && picked.length === practice.steps.length && (
          <button onClick={check} className="desk-cta inline-flex items-center gap-2 px-5 h-10 rounded-xl font-['Tajawal'] font-bold text-[13px]">
            <Check size={15} /> {g('تحقّق', 'تحقّقي')}
          </button>
        )}
        {checked && (
          <>
            <span className="font-['Tajawal'] text-[13px] font-bold" style={{ color: correct ? '#6ee7b7' : 'rgba(255,180,164,0.9)' }}>
              {correct ? g('ترتيب صحيح ✓', 'ترتيب صحيح ✓') : g('راجع الترتيب', 'راجعي الترتيب')}
            </span>
            <button onClick={reset} className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[12px]" style={{ color: 'var(--brass)' }}>
              <RotateCcw size={13} /> {g('من جديد', 'من جديد')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── REFLECT practice ──
function ReflectPractice({ practice, onSolved }) {
  const g = useG()
  const [text, setText] = useState('')
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  return (
    <div className="space-y-3">
      <p className="font-['Tajawal'] text-[14px] font-bold" style={{ color: 'rgba(243,238,226,0.85)' }}>{practice.prompt_ar}</p>
      {practice.hint_ar && (
        <p className="font-['Tajawal'] text-[12px] px-3 py-2 rounded-lg" style={{ color: 'rgba(201,162,92,0.85)', background: 'rgba(201,162,92,0.07)', border: '1px solid rgba(201,162,92,0.14)' }}>💡 {practice.hint_ar}</p>
      )}
      <textarea value={text} onChange={(e) => { setText(e.target.value); if (e.target.value.trim().split(/\s+/).length >= 6) onSolved?.() }}
        dir="ltr" rows={3} placeholder="Write your version in English…"
        className="w-full rounded-xl px-4 py-3 font-['Inter'] text-[14px] resize-none outline-none"
        style={{ background: 'rgba(10,13,20,0.6)', border: '1px solid rgba(201,162,92,0.18)', color: 'var(--cream)' }} />
      <p className="font-['Tajawal'] text-[11px]" style={{ color: 'rgba(243,238,226,0.4)' }}>{words} {g('كلمة', 'كلمة')} · {g('هذا لك — ما يُصحّح، بس يخليك تكتب بنفسك', 'هذا لك — ما يُصحّح، بس يخليك تكتبين بنفسك')}</p>
    </div>
  )
}

export default function DeskLesson() {
  const { lessonId } = useParams()
  const g = useG()
  const rm = useReducedMotion()
  const lesson = getLesson(lessonId)
  const { isCompleted, markComplete } = useCurriculumProgress()
  const { data: modData } = useDeskModules()
  const [practiceSolved, setPracticeSolved] = useState(false)

  if (!lesson) return <Navigate to="/desk/track" replace />

  const done = isCompleted(lesson.id)
  const next = getNextLesson(lesson.id)
  const prev = getPrevLesson(lesson.id)

  // resolve the linked scenario at runtime (module_number → the DB module id)
  const scenarioModule = lesson.scenarioModuleNumber && modData?.modules
    ? modData.modules.find((m) => m.module_number === lesson.scenarioModuleNumber)
    : null

  return (
    <div className="space-y-10 max-w-[720px] mx-auto">
      {/* back */}
      <Link to="/desk/track" className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px] desk-rise" style={{ color: 'rgba(243,238,226,0.5)' }}>
        <ArrowRight size={15} /> {g('المسار', 'المسار')}
      </Link>

      {/* masthead */}
      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-['Inter'] font-black text-[12px] px-2 h-6 grid place-items-center rounded-lg" dir="ltr" style={{ color: '#1a130a', background: 'linear-gradient(135deg,#efd299,#c9a25c)' }}>{lesson.label}</span>
          <span className="font-['Tajawal'] text-[12px] font-bold" style={{ color: 'var(--brass)' }}>{lesson.trackAr}</span>
          {done && <span className="inline-flex items-center gap-1 font-['Tajawal'] text-[11.5px] px-2.5 py-0.5 rounded-full" style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.12)', border: '1px solid rgba(201,162,92,0.3)' }}><Check size={12} strokeWidth={3} /> {g('مكتمل', 'مكتمل')}</span>}
        </div>
        <h1 className="font-['Tajawal'] font-extrabold text-2xl lg:text-[30px] leading-tight" style={{ color: 'var(--cream)' }}>{lesson.ar}</h1>
        <p className="font-['Inter'] text-[13px] mt-1" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>{lesson.en}</p>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[12px]" style={{ color: 'rgba(243,238,226,0.5)' }}><Clock size={13} /> {lesson.minutes} {g('دقائق', 'دقائق')}</span>
          <span className="desk-lesson-outcome font-['Tajawal'] text-[12.5px]">{g('بنهاية الدرس: ', 'بنهاية الدرس: ')}{lesson.outcome_ar}</span>
        </div>
      </div>

      {/* الفكرة */}
      {lesson.idea && (
        <section className="desk-glass p-5 lg:p-6 desk-rise">
          <SectionHead eyebrow="THE IDEA" ar="الفكرة" icon={Lightbulb} />
          <p className="font-['Tajawal'] text-[14.5px] leading-[1.85]" style={{ color: 'rgba(243,238,226,0.82)' }}>{lesson.idea.body_ar}</p>
          {lesson.idea.model_ar && (
            <div className="desk-model-callout mt-4">
              <Sparkles size={15} style={{ color: 'var(--brass-hi)' }} className="flex-shrink-0 mt-0.5" />
              <p className="font-['Tajawal'] text-[13.5px] font-bold leading-relaxed" style={{ color: 'var(--brass-hi)' }}>{lesson.idea.model_ar}</p>
            </div>
          )}
        </section>
      )}

      {/* العبارات */}
      {lesson.phrases?.length > 0 && (
        <section className="desk-rise">
          <SectionHead eyebrow="MODEL PHRASES" ar="العبارات" icon={MessageSquareQuote} />
          <div className="space-y-2.5">
            {lesson.phrases.map((p, i) => (
              <div key={i} className="desk-glass p-5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-['Inter'] text-[18px] leading-snug font-semibold" dir="ltr" style={{ color: 'var(--cream)' }}>{p.en}</p>
                  <p className="font-['Tajawal'] text-[12.5px] mt-1.5" style={{ color: 'rgba(243,238,226,0.6)' }}>{p.ar}</p>
                  {p.when_ar && <p className="font-['Tajawal'] text-[12px] mt-2 inline-flex items-center gap-1" style={{ color: 'rgba(243,238,226,0.5)' }}><span style={{ color: 'rgba(201,162,92,0.7)' }}>{g('متى؟', 'متى؟')}</span> {p.when_ar}</p>}
                </div>
                <PlayBtn text={p.en} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* المصطلحات */}
      {lesson.terms?.length > 0 && (
        <section className="desk-rise">
          <SectionHead eyebrow="TERMS" ar="المصطلحات" icon={Cpu} />
          <div className="grid sm:grid-cols-2 gap-2.5">
            {lesson.terms.map((t, i) => (
              <div key={i} className="desk-glass p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-['Inter'] text-[15px] font-semibold" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{t.term}</p>
                  <PlayBtn text={t.term} />
                </div>
                <p className="font-['Tajawal'] text-[13px] mt-0.5" style={{ color: 'var(--cream)' }}>{t.ar}</p>
                <p className="font-['Inter'] text-[12px] mt-1.5" dir="ltr" style={{ color: 'rgba(243,238,226,0.62)' }}>{t.def_en}</p>
                {t.example && <p className="font-['Inter'] text-[12px] mt-1 italic" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>“{t.example}”</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* مثال حي */}
      {lesson.example && (
        <section className="desk-rise">
          <SectionHead eyebrow="IN ACTION" ar="مثال حيّ" icon={Headset} />
          <div className="desk-glass p-5">
            {lesson.example.setting_ar && <p className="font-['Tajawal'] text-[12px] mb-3 pb-3 desk-hair" style={{ color: 'rgba(201,162,92,0.72)' }}>{lesson.example.setting_ar}</p>}
            <div className="space-y-3">
              {lesson.example.lines.map((ln, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="desk-dialog-who">{ln.who}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-['Inter'] text-[14px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{ln.en}</p>
                      <PlayBtn text={ln.en} />
                    </div>
                    <p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(243,238,226,0.5)' }}>{ln.ar}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* تمرين */}
      {lesson.practice && (
        <section className="desk-rise">
          <SectionHead eyebrow="PRACTICE" ar="تمرين" icon={Sparkles} />
          <div className="desk-glass p-5">
            {lesson.practice.type === 'choose' && <ChoosePractice practice={lesson.practice} onSolved={() => setPracticeSolved(true)} />}
            {lesson.practice.type === 'order' && <OrderPractice practice={lesson.practice} lessonId={lesson.id} onSolved={() => setPracticeSolved(true)} />}
            {lesson.practice.type === 'reflect' && <ReflectPractice practice={lesson.practice} onSolved={() => setPracticeSolved(true)} />}
          </div>
        </section>
      )}

      {/* الخلاصة */}
      {lesson.takeaway_ar && (
        <section className="desk-rise">
          <div className="desk-takeaway">
            <span className="desk-takeaway-mark">✦</span>
            <div>
              <p className="font-['Inter'] text-[11px] tracking-[0.18em] mb-1" dir="ltr" style={{ color: 'rgba(201,162,92,0.7)' }}>TAKEAWAY</p>
              <p className="font-['Tajawal'] font-extrabold text-[16px] leading-relaxed" style={{ color: 'var(--cream)' }}>{lesson.takeaway_ar}</p>
            </div>
          </div>
        </section>
      )}

      {/* apply live — the scenario deep-link */}
      {scenarioModule && (
        <motion.div initial={rm ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="desk-glass overflow-hidden desk-rise" style={{ borderColor: 'rgba(201,162,92,0.24)' }}>
          <Link to={`/desk/scenarios/${scenarioModule.id}`} onClick={() => markComplete(lesson.id)} className="group flex items-center gap-4 p-5">
            <div className="desk-apply-mark"><Headset size={20} /></div>
            <div className="min-w-0 flex-1">
              <p className="font-['Tajawal'] text-[11px] font-bold mb-0.5" style={{ color: 'var(--brass)' }}>{g('طبّقها حيّة', 'طبّقيها حيّة')}</p>
              <h3 className="font-['Tajawal'] font-extrabold text-[15px] leading-tight truncate" style={{ color: 'var(--cream)' }}>{scenarioModule.title_ar}</h3>
              <p className="font-['Inter'] text-[12px] mt-0.5 truncate" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>{scenarioModule.title_en}</p>
            </div>
            <span className="desk-cta flex-shrink-0 inline-flex items-center gap-2 px-5 h-11 rounded-2xl font-['Tajawal'] font-bold text-[13px]">
              {g('جرّبها', 'جرّبيها')} <ArrowLeft size={16} />
            </span>
          </Link>
        </motion.div>
      )}

      {/* footer — mark complete + prev/next */}
      <div className="pt-2 desk-rise">
        {!done ? (
          <button onClick={() => markComplete(lesson.id)}
            className={`w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Tajawal'] font-bold text-[14px] transition ${practiceSolved ? 'desk-cta' : ''}`}
            style={practiceSolved ? undefined : { color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.10)', border: '1px solid rgba(201,162,92,0.28)' }}>
            <Check size={17} /> {g('علّم الدرس كمكتمل', 'علّمي الدرس كمكتمل')}
          </button>
        ) : (
          <div className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Tajawal'] font-bold text-[14px]" style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.1)', border: '1px solid rgba(201,162,92,0.26)' }}>
            <CheckCircle2 size={17} /> {g('أنجزت هذا الدرس', 'أنجزتِ هذا الدرس')}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-4">
          {prev ? (
            <Link to={`/desk/track/${prev.id}`} className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px] min-w-0" style={{ color: 'rgba(243,238,226,0.55)' }}>
              <ArrowRight size={15} className="flex-shrink-0" /> <span className="truncate">{prev.ar}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link to={`/desk/track/${next.id}`} className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px] font-bold min-w-0 justify-end" style={{ color: 'var(--brass-hi)' }}>
              <span className="truncate">{next.ar}</span> <ArrowLeft size={15} className="flex-shrink-0" />
            </Link>
          ) : (
            <Link to="/desk/track" className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px] font-bold" style={{ color: 'var(--brass-hi)' }}>
              {g('رجوع للمسار', 'رجوع للمسار')} <ArrowLeft size={15} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
