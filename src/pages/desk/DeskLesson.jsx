// DeskLesson — the premium lesson reader for a single curriculum lesson.
// A long-form, beautifully-typeset study surface: the idea + mental model, model
// phrases (tap-to-hear via on-device speech — creditless), terms, a worked
// mini-dialogue, one interactive practice beat, and the takeaway — then a
// deep-link into the matching roleplay scenario so she applies it live.
// English-primary: English is the large teaching text; Arabic is a small gloss.
import { useMemo, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Volume2, Clock, Check, Lightbulb, MessageSquareQuote, Headset, Sparkles, RotateCcw, CheckCircle2, Cpu } from 'lucide-react'
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
  <button onClick={() => speakEn(text)} className="desk-ghost-btn flex-shrink-0" aria-label="Listen"><Volume2 size={14} /></button>
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

// ── section header (English-primary, small Arabic gloss) ──
const SectionHead = ({ eyebrow, title, gloss, icon: Icon }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <span className="desk-lesson-sec-mark"><Icon size={16} /></span>
    <div>
      <p className="font-['Hanken_Grotesk'] text-[11px] tracking-[0.18em]" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.46)' }}>{eyebrow}</p>
      <h2 className="font-['Hanken_Grotesk'] font-extrabold text-[20px] leading-tight mt-0.5" dir="ltr" style={{ color: 'var(--cream)' }}>{title}</h2>
      {gloss && <p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(42, 33, 64,0.42)' }}>{gloss}</p>}
    </div>
  </div>
)

// ── CHOOSE practice ──
function ChoosePractice({ practice, onSolved }) {
  const [picked, setPicked] = useState(null)
  const chosen = picked != null ? practice.options[picked] : null
  return (
    <div className="space-y-2.5">
      <p className="font-['Hanken_Grotesk'] text-[14px] font-bold mb-3" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.85)' }}>{practice.prompt}</p>
      {practice.options.map((opt, i) => {
        const isPicked = picked === i
        const state = picked == null ? 'idle' : opt.correct ? 'correct' : isPicked ? 'wrong' : 'dim'
        return (
          <button key={i} disabled={picked != null && opt.correct}
            onClick={() => { if (picked == null) { setPicked(i); if (opt.correct) onSolved?.() } }}
            className={`desk-choose-opt ${state}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-start">
                <p className="font-['Hanken_Grotesk'] text-[14px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{opt.en}</p>
                <p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(42, 33, 64,0.55)' }}>{opt.ar}</p>
              </div>
              {state === 'correct' && <CheckCircle2 size={18} className="flex-shrink-0 desk-pop" style={{ color: '#6ee7b7' }} />}
            </div>
            {picked != null && (state === 'correct' || state === 'wrong') && (
              <p className="font-['Hanken_Grotesk'] text-[12px] mt-2 pt-2 desk-hair" dir="ltr" style={{ color: state === 'correct' ? 'rgba(110,231,183,0.9)' : 'rgba(255,180,164,0.85)' }}>{opt.why}</p>
            )}
          </button>
        )
      })}
      {picked != null && !chosen?.correct && (
        <button onClick={() => setPicked(null)} className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[12px] mt-1" dir="ltr" style={{ color: 'var(--brass)' }}>
          <RotateCcw size={13} /> Try again
        </button>
      )}
    </div>
  )
}

// ── ORDER practice ──
function OrderPractice({ practice, lessonId, onSolved }) {
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
      <p className="font-['Hanken_Grotesk'] text-[14px] font-bold" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.85)' }}>{practice.prompt}</p>

      {/* your order */}
      <div className="desk-order-tray">
        {picked.length === 0 && <p className="font-['Hanken_Grotesk'] text-[12px] py-1" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.4)' }}>Tap the sentences in the right order</p>}
        {picked.map((oi, pos) => {
          const ok = checked && oi === pos
          const bad = checked && oi !== pos
          return (
            <button key={oi} disabled={checked} onClick={() => setPicked(picked.filter((x) => x !== oi))}
              className={`desk-order-chip is-picked ${ok ? 'ok' : ''} ${bad ? 'bad' : ''}`}>
              <span className="desk-order-num">{pos + 1}</span>
              <span className="font-['Hanken_Grotesk'] text-[13px]" dir="ltr">{practice.steps[oi].en}</span>
            </button>
          )
        })}
      </div>

      {/* bank */}
      {remaining.length > 0 && !checked && (
        <div className="flex flex-wrap gap-2">
          {remaining.map((oi) => (
            <button key={oi} onClick={() => setPicked([...picked, oi])} className="desk-order-chip">
              <span className="font-['Hanken_Grotesk'] text-[13px]" dir="ltr">{practice.steps[oi].en}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        {!checked && picked.length === practice.steps.length && (
          <button onClick={check} className="desk-cta inline-flex items-center gap-2 px-5 h-10 rounded-xl font-['Hanken_Grotesk'] font-bold text-[13px]" dir="ltr">
            <Check size={15} /> Check
          </button>
        )}
        {checked && (
          <>
            <span className="font-['Hanken_Grotesk'] text-[13px] font-bold" dir="ltr" style={{ color: correct ? '#6ee7b7' : 'rgba(255,180,164,0.9)' }}>
              {correct ? 'Correct order ✓' : 'Check the order'}
            </span>
            <button onClick={reset} className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[12px]" dir="ltr" style={{ color: 'var(--brass)' }}>
              <RotateCcw size={13} /> Reset
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── REFLECT practice ──
function ReflectPractice({ practice, onSolved }) {
  const [text, setText] = useState('')
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  return (
    <div className="space-y-3">
      <p className="font-['Hanken_Grotesk'] text-[14px] font-bold" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.85)' }}>{practice.prompt}</p>
      {practice.hint && (
        <p className="font-['Hanken_Grotesk'] text-[12px] px-3 py-2 rounded-lg" dir="ltr" style={{ color: 'rgba(239, 106, 67,0.85)', background: 'rgba(239, 106, 67,0.07)', border: '1px solid rgba(239, 106, 67,0.14)' }}>💡 {practice.hint}</p>
      )}
      <textarea value={text} onChange={(e) => { setText(e.target.value); if (e.target.value.trim().split(/\s+/).length >= 6) onSolved?.() }}
        dir="ltr" rows={3} placeholder="Write your version in English…"
        className="w-full rounded-xl px-4 py-3 font-['Hanken_Grotesk'] text-[14px] resize-none outline-none"
        style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(58,42,84,0.14)', color: 'var(--ink)' }} />
      <p className="font-['Hanken_Grotesk'] text-[11px]" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.4)' }}>{words} words · This one's for you — it isn't graded, it just gets you writing.</p>
    </div>
  )
}

export default function DeskLesson() {
  const { lessonId } = useParams()
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
      <Link to="/desk/track" className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[13px] desk-rise" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.5)' }}>
        <ArrowLeft size={15} /> The Track
      </Link>

      {/* masthead */}
      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-['Hanken_Grotesk'] font-black text-[12px] px-2 h-6 grid place-items-center rounded-lg" dir="ltr" style={{ color: '#fff3ee', background: 'linear-gradient(135deg,#ef6a43,#cf4a1c)' }}>{lesson.label}</span>
          <span className="font-['Hanken_Grotesk'] text-[12px] font-bold" dir="ltr" style={{ color: 'var(--brass)' }}>{lesson.trackEn}</span>
          {done && <span className="inline-flex items-center gap-1 font-['Hanken_Grotesk'] text-[11.5px] px-2.5 py-0.5 rounded-full" dir="ltr" style={{ color: 'var(--brass-hi)', background: 'rgba(239, 106, 67,0.12)', border: '1px solid rgba(239, 106, 67,0.3)' }}><Check size={12} strokeWidth={3} /> Done</span>}
        </div>
        <h1 className="font-['Hanken_Grotesk'] font-extrabold text-2xl lg:text-[30px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>{lesson.en}</h1>
        <p className="font-['Tajawal'] text-[13px] mt-1" style={{ color: 'rgba(42, 33, 64,0.5)' }}>{lesson.ar}</p>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[12px]" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.5)' }}><Clock size={13} /> {lesson.minutes} min</span>
          <span className="desk-lesson-outcome font-['Hanken_Grotesk'] text-[12.5px]" dir="ltr">By the end: {lesson.outcome}</span>
        </div>
      </div>

      {/* the idea */}
      {lesson.idea && (
        <section className="desk-glass p-5 lg:p-6 desk-rise">
          <SectionHead eyebrow="THE IDEA" title="The core idea" gloss="الفكرة" icon={Lightbulb} />
          <p className="font-['Hanken_Grotesk'] text-[14.5px] leading-[1.85]" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.82)' }}>{lesson.idea.body}</p>
          {lesson.idea.model && (
            <div className="desk-model-callout mt-4">
              <Sparkles size={15} style={{ color: 'var(--brass-hi)' }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-['Hanken_Grotesk'] text-[13.5px] font-bold leading-relaxed" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{lesson.idea.model}</p>
                {lesson.idea.model_ar && <p className="font-['Tajawal'] text-[12px] mt-1" style={{ color: 'rgba(42, 33, 64,0.45)' }}>{lesson.idea.model_ar}</p>}
              </div>
            </div>
          )}
        </section>
      )}

      {/* model phrases */}
      {lesson.phrases?.length > 0 && (
        <section className="desk-rise">
          <SectionHead eyebrow="MODEL PHRASES" title="Phrases that work" gloss="العبارات" icon={MessageSquareQuote} />
          <div className="space-y-2.5">
            {lesson.phrases.map((p, i) => (
              <div key={i} className="desk-glass p-5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-['Hanken_Grotesk'] text-[18px] leading-snug font-semibold" dir="ltr" style={{ color: 'var(--cream)' }}>{p.en}</p>
                  <p className="font-['Tajawal'] text-[12.5px] mt-1.5" style={{ color: 'rgba(42, 33, 64,0.6)' }}>{p.ar}</p>
                  {p.when && <p className="font-['Hanken_Grotesk'] text-[12px] mt-2 inline-flex items-center gap-1" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.5)' }}><span style={{ color: 'rgba(239, 106, 67,0.7)' }}>When:</span> {p.when}</p>}
                </div>
                <PlayBtn text={p.en} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* terms */}
      {lesson.terms?.length > 0 && (
        <section className="desk-rise">
          <SectionHead eyebrow="TERMS" title="Key terms" gloss="المصطلحات" icon={Cpu} />
          <div className="grid sm:grid-cols-2 gap-2.5">
            {lesson.terms.map((t, i) => (
              <div key={i} className="desk-glass p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-['Hanken_Grotesk'] text-[15px] font-semibold" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{t.term}</p>
                  <PlayBtn text={t.term} />
                </div>
                <p className="font-['Tajawal'] text-[13px] mt-0.5" style={{ color: 'var(--cream)' }}>{t.ar}</p>
                <p className="font-['Hanken_Grotesk'] text-[12px] mt-1.5" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.62)' }}>{t.def_en}</p>
                {t.example && <p className="font-['Hanken_Grotesk'] text-[12px] mt-1 italic" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.5)' }}>“{t.example}”</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* in action */}
      {lesson.example && (
        <section className="desk-rise">
          <SectionHead eyebrow="IN ACTION" title="See it in action" gloss="مثال حيّ" icon={Headset} />
          <div className="desk-glass p-5">
            {lesson.example.setting && <p className="font-['Hanken_Grotesk'] text-[12px] mb-3 pb-3 desk-hair" dir="ltr" style={{ color: 'rgba(239, 106, 67,0.72)' }}>{lesson.example.setting}</p>}
            <div className="space-y-3">
              {lesson.example.lines.map((ln, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="desk-dialog-who">{ln.who}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-['Hanken_Grotesk'] text-[14px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{ln.en}</p>
                      <PlayBtn text={ln.en} />
                    </div>
                    <p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(42, 33, 64,0.5)' }}>{ln.ar}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* practice */}
      {lesson.practice && (
        <section className="desk-rise">
          <SectionHead eyebrow="PRACTICE" title="Your turn" gloss="تمرين" icon={Sparkles} />
          <div className="desk-glass p-5">
            {lesson.practice.type === 'choose' && <ChoosePractice practice={lesson.practice} onSolved={() => setPracticeSolved(true)} />}
            {lesson.practice.type === 'order' && <OrderPractice practice={lesson.practice} lessonId={lesson.id} onSolved={() => setPracticeSolved(true)} />}
            {lesson.practice.type === 'reflect' && <ReflectPractice practice={lesson.practice} onSolved={() => setPracticeSolved(true)} />}
          </div>
        </section>
      )}

      {/* takeaway */}
      {lesson.takeaway && (
        <section className="desk-rise">
          <div className="desk-takeaway">
            <span className="desk-takeaway-mark">✦</span>
            <div>
              <p className="font-['Hanken_Grotesk'] text-[11px] tracking-[0.18em] mb-1" dir="ltr" style={{ color: 'rgba(239, 106, 67,0.7)' }}>TAKEAWAY</p>
              <p className="font-['Hanken_Grotesk'] font-extrabold text-[16px] leading-relaxed" dir="ltr" style={{ color: 'var(--cream)' }}>{lesson.takeaway}</p>
              {lesson.takeaway_ar && <p className="font-['Tajawal'] text-[12.5px] mt-1" style={{ color: 'rgba(42, 33, 64,0.45)' }}>{lesson.takeaway_ar}</p>}
            </div>
          </div>
        </section>
      )}

      {/* apply live — the scenario deep-link */}
      {scenarioModule && (
        <motion.div initial={rm ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="desk-glass overflow-hidden desk-rise" style={{ borderColor: 'rgba(239, 106, 67,0.24)' }}>
          <Link to={`/desk/scenarios/${scenarioModule.id}`} onClick={() => markComplete(lesson.id)} className="group flex items-center gap-4 p-5">
            <div className="desk-apply-mark"><Headset size={20} /></div>
            <div className="min-w-0 flex-1">
              <p className="font-['Hanken_Grotesk'] text-[11px] font-bold mb-0.5 uppercase tracking-wider" dir="ltr" style={{ color: 'var(--brass)' }}>Apply it live</p>
              <h3 className="font-['Hanken_Grotesk'] font-extrabold text-[15px] leading-tight truncate" dir="ltr" style={{ color: 'var(--cream)' }}>{scenarioModule.title_en || scenarioModule.title_ar}</h3>
              {scenarioModule.title_en && scenarioModule.title_ar && <p className="font-['Tajawal'] text-[12px] mt-0.5 truncate" style={{ color: 'rgba(42, 33, 64,0.5)' }}>{scenarioModule.title_ar}</p>}
            </div>
            <span className="desk-cta flex-shrink-0 inline-flex items-center gap-2 px-5 h-11 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[13px]" dir="ltr">
              Try it <ArrowRight size={16} />
            </span>
          </Link>
        </motion.div>
      )}

      {/* footer — mark complete + prev/next */}
      <div className="pt-2 desk-rise">
        {!done ? (
          <button onClick={() => markComplete(lesson.id)}
            className={`w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[14px] transition ${practiceSolved ? 'desk-cta' : ''}`}
            dir="ltr"
            style={practiceSolved ? undefined : { color: 'var(--brass-hi)', background: 'rgba(239, 106, 67,0.10)', border: '1px solid rgba(239, 106, 67,0.28)' }}>
            <Check size={17} /> Mark lesson complete
          </button>
        ) : (
          <div className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[14px]" dir="ltr" style={{ color: 'var(--brass-hi)', background: 'rgba(239, 106, 67,0.1)', border: '1px solid rgba(239, 106, 67,0.26)' }}>
            <CheckCircle2 size={17} /> You've completed this lesson
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-4">
          {prev ? (
            <Link to={`/desk/track/${prev.id}`} className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[13px] min-w-0" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.55)' }}>
              <ArrowLeft size={15} className="flex-shrink-0" /> <span className="truncate">{prev.en}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link to={`/desk/track/${next.id}`} className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[13px] font-bold min-w-0 justify-end" dir="ltr" style={{ color: 'var(--brass-hi)' }}>
              <span className="truncate">{next.en}</span> <ArrowRight size={15} className="flex-shrink-0" />
            </Link>
          ) : (
            <Link to="/desk/track" className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[13px] font-bold" dir="ltr" style={{ color: 'var(--brass-hi)' }}>
              Back to the Track <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
