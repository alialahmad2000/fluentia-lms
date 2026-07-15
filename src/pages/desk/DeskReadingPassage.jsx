// DeskReadingPassage — one IT reading passage: read → key terms → check yourself →
// takeaway. Self-checking (creditless), English-primary with Arabic term glosses.
import { useState, useMemo } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Volume2, Check, CheckCircle2, RotateCcw, Clock, BookOpen, Sparkles, Lightbulb, HelpCircle } from 'lucide-react'
import { DESK_READING, getReading } from '@/data/desk/reading'
import { useReadingProgress } from './useReadingProgress'
import './desk.css'

function speakEn(text) { try { if (!window.speechSynthesis || !text) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.94; window.speechSynthesis.speak(u) } catch {} }
const PlayBtn = ({ text }) => (<button onClick={() => speakEn(text)} className="desk-ghost-btn flex-shrink-0" aria-label="Listen"><Volume2 size={14} /></button>)

export default function DeskReadingPassage() {
  const { readingId } = useParams()
  const r = getReading(readingId)
  const { isDone, markDone } = useReadingProgress()
  const [results, setResults] = useState({}) // qIndex -> boolean (first pick)

  const passageText = useMemo(() => (r ? r.paragraphs.join(' ') : ''), [r])
  if (!r) return <Navigate to="/desk/reading" replace />

  const done = isDone(r.id)
  const i = DESK_READING.findIndex((x) => x.id === r.id)
  const next = i + 1 < DESK_READING.length ? DESK_READING[i + 1] : null
  const answered = Object.keys(results).length
  const correct = Object.values(results).filter(Boolean).length
  const score = r.questions.length ? Math.round((correct / r.questions.length) * 100) : 100
  const allAnswered = answered >= r.questions.length

  return (
    <div className="space-y-10 max-w-[720px] mx-auto">
      <Link to="/desk/reading" className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[13px] desk-rise" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.62)' }}><ArrowLeft size={15} /> Reading</Link>

      {/* masthead */}
      <div className="desk-glass desk-station-head p-6 lg:p-7 desk-rise">
        <div className="flex items-center gap-2 mb-2.5 flex-wrap font-['Hanken_Grotesk'] text-[11.5px]" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.62)' }}>
          <span className="px-2 py-0.5 rounded-md font-bold" style={{ color: 'var(--brass-hi)', background: 'rgba(239, 106, 67,0.14)' }}>{r.level}</span>
          <span className="inline-flex items-center gap-1"><Clock size={12} /> {r.minutes} min</span>
          <span>· {r.topic}</span>
          {done && <span className="inline-flex items-center gap-1 ms-1" style={{ color: 'var(--brass-hi)' }}><Check size={12} strokeWidth={3} /> Read</span>}
        </div>
        <h1 className="font-['Hanken_Grotesk'] font-extrabold text-2xl lg:text-[28px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>{r.title}</h1>
        <p className="font-['Tajawal'] text-[14px] mt-1" style={{ color: 'rgba(240, 234, 224,0.62)' }}>{r.title_ar}</p>
        <p className="font-['Hanken_Grotesk'] text-[13.5px] mt-3 leading-relaxed" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.62)' }}>{r.intro}</p>
      </div>

      {/* the passage */}
      <section className="desk-rise">
        <div className="flex items-center gap-2.5 mb-4"><span className="desk-lesson-sec-mark"><BookOpen size={16} /></span><div><p className="font-['Hanken_Grotesk'] text-[12px] tracking-[0.18em]" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.56)' }}>THE PASSAGE</p><h2 className="font-['Hanken_Grotesk'] font-extrabold text-[20px] leading-tight mt-0.5" dir="ltr" style={{ color: 'var(--cream)' }}>Read</h2></div></div>
        <div className="desk-glass p-6 lg:p-7">
          <div className="flex items-center justify-end mb-2"><PlayBtn text={passageText} /></div>
          <div className="space-y-4" dir="ltr">
            {r.paragraphs.map((p, k) => (
              <p key={k} className="font-['Hanken_Grotesk'] text-[15.5px] leading-[1.95]" style={{ color: 'rgba(240, 234, 224,0.86)' }}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* key terms */}
      {r.key_terms?.length > 0 && (
        <section className="desk-rise">
          <div className="flex items-center gap-2.5 mb-4"><span className="desk-lesson-sec-mark"><Sparkles size={16} /></span><div><p className="font-['Hanken_Grotesk'] text-[12px] tracking-[0.18em]" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.56)' }}>KEY TERMS</p><h2 className="font-['Hanken_Grotesk'] font-extrabold text-[20px] leading-tight mt-0.5" dir="ltr" style={{ color: 'var(--cream)' }}>Words that matter</h2></div></div>
          <div className="space-y-2">
            {r.key_terms.map((t, k) => (
              <div key={k} className="desk-glass p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <p className="font-['Hanken_Grotesk'] text-[15.5px] font-semibold" dir="ltr" style={{ color: 'var(--cream)' }}>{t.term}</p>
                    {t.ipa && <span className="font-['Hanken_Grotesk'] text-[12px]" dir="ltr" style={{ color: 'rgba(239, 106, 67,0.7)' }}>/{t.ipa}/</span>}
                    <span className="font-['Tajawal'] text-[13px]" style={{ color: 'var(--brass-hi)' }}>{t.ar}</span>
                  </div>
                  <p className="font-['Hanken_Grotesk'] text-[12.5px] mt-1 leading-snug" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.65)' }}>{t.def_en}</p>
                </div>
                <PlayBtn text={t.term} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* comprehension */}
      {r.questions?.length > 0 && (
        <section className="desk-rise">
          <div className="flex items-center gap-2.5 mb-4"><span className="desk-lesson-sec-mark"><HelpCircle size={16} /></span><div><p className="font-['Hanken_Grotesk'] text-[12px] tracking-[0.18em]" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.56)' }}>CHECK</p><h2 className="font-['Hanken_Grotesk'] font-extrabold text-[20px] leading-tight mt-0.5" dir="ltr" style={{ color: 'var(--cream)' }}>Did you get it?</h2></div></div>
          <div className="space-y-3">
            {r.questions.map((c, k) => (
              <ReadingQ key={k} q={c} onResolve={(ok) => setResults((prev) => (k in prev ? prev : { ...prev, [k]: ok }))} />
            ))}
          </div>
        </section>
      )}

      {/* takeaway */}
      {r.takeaway && (
        <div className="desk-model-callout desk-rise"><Lightbulb size={15} style={{ color: 'var(--brass-hi)' }} className="flex-shrink-0 mt-0.5" /><p className="font-['Hanken_Grotesk'] text-[13.5px] font-bold leading-relaxed" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{r.takeaway}</p></div>
      )}

      {/* footer */}
      <div className="pt-1 desk-rise">
        {!done ? (
          <button onClick={() => markDone(r.id, score)} className="desk-cta w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[14px]" dir="ltr"><Check size={17} /> {allAnswered ? `Mark as read · ${correct}/${r.questions.length}` : 'Mark as read'}</button>
        ) : (
          <div className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[14px]" dir="ltr" style={{ color: 'var(--brass-hi)', background: 'rgba(239, 106, 67,0.1)', border: '1px solid rgba(239, 106, 67,0.26)' }}><CheckCircle2 size={17} /> You've read this passage</div>
        )}
        <div className="flex items-center justify-between gap-3 mt-4">
          <Link to="/desk/reading" className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[13px]" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.65)' }}><ArrowLeft size={15} /> Library</Link>
          {next && <Link to={`/desk/reading/${next.id}`} onClick={() => markDone(r.id, score)} className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[13px] font-bold min-w-0 justify-end" dir="ltr" style={{ color: 'var(--brass-hi)' }}><span className="truncate">{next.title}</span> <ArrowRight size={15} className="flex-shrink-0" /></Link>}
        </div>
      </div>
    </div>
  )
}

// question with its own explanation reveal
function ReadingQ({ q, onResolve }) {
  const [picked, setPicked] = useState(null)
  const chosen = picked != null ? q.options[picked] : null
  const pick = (idx) => { if (picked != null) return; setPicked(idx); onResolve?.(!!q.options[idx].correct) }
  return (
    <div className="desk-glass p-6">
      <p className="font-['Hanken_Grotesk'] text-[14.5px] font-semibold mb-3.5 leading-relaxed" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.9)' }}>{q.q}</p>
      <div className="space-y-2.5">
        {q.options.map((opt, i) => {
          const state = picked == null ? 'idle' : opt.correct ? 'correct' : picked === i ? 'wrong' : 'dim'
          return (
            <button key={i} disabled={picked != null && opt.correct} onClick={() => pick(i)} className={`desk-choose-opt ${state}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-['Hanken_Grotesk'] text-[14px] leading-snug text-start" dir="ltr" style={{ color: 'var(--cream)' }}>{opt.en}</p>
                {state === 'correct' && <CheckCircle2 size={18} className="flex-shrink-0 desk-pop" style={{ color: '#8fd6a0' }} />}
              </div>
            </button>
          )
        })}
      </div>
      {picked != null && q.why && (
        <p className="font-['Hanken_Grotesk'] text-[12.5px] mt-3 pt-3 desk-hair leading-relaxed" dir="ltr" style={{ color: chosen?.correct ? 'rgba(148,214,157,0.9)' : 'rgba(255,180,164,0.85)' }}>{q.why}</p>
      )}
      {picked != null && !chosen?.correct && (
        <button onClick={() => setPicked(null)} className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[12.5px] mt-2.5" dir="ltr" style={{ color: 'var(--brass)' }}><RotateCcw size={13} /> Try again</button>
      )}
    </div>
  )
}
