// DeskGrammarPoint — one grammar point: The rule (rule + mental model + examples)
// → Check (a quick check) → "Got it". English-primary, Arabic kept as small glosses.
import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { ArrowRight, ArrowLeft, Volume2, Check, CheckCircle2, RotateCcw, Sparkles, Lightbulb, HelpCircle } from 'lucide-react'
import { DESK_GRAMMAR, getPoint } from '@/data/desk/grammar'
import { useDailyProgress } from './useDailyProgress'
import './desk.css'

function speakEn(text) { try { if (!window.speechSynthesis || !text) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.92; window.speechSynthesis.speak(u) } catch {} }
const PlayBtn = ({ text }) => (<button onClick={() => speakEn(text)} className="desk-ghost-btn flex-shrink-0" aria-label="Listen"><Volume2 size={14} /></button>)

function MCQ({ q, options }) {
  const [picked, setPicked] = useState(null)
  const chosen = picked != null ? options[picked] : null
  return (
    <div className="desk-glass p-6">
      {q && <p className="font-['Inter'] text-[14.5px] font-semibold mb-3.5 leading-relaxed" dir="ltr" style={{ color: 'rgba(243,238,226,0.9)' }}>{q}</p>}
      <div className="space-y-2.5">
        {options.map((opt, i) => {
          const state = picked == null ? 'idle' : opt.correct ? 'correct' : picked === i ? 'wrong' : 'dim'
          return (
            <button key={i} disabled={picked != null && opt.correct} onClick={() => { if (picked == null) setPicked(i) }} className={`desk-choose-opt ${state}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-start">
                  <p className="font-['Inter'] text-[14px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{opt.en}</p>
                </div>
                {state === 'correct' && <CheckCircle2 size={18} className="flex-shrink-0 desk-pop" style={{ color: '#6ee7b7' }} />}
              </div>
              {picked != null && (state === 'correct' || state === 'wrong') && (
                <p className="font-['Inter'] text-[12.5px] mt-2 pt-2 desk-hair leading-relaxed text-start" dir="ltr" style={{ color: state === 'correct' ? 'rgba(110,231,183,0.9)' : 'rgba(255,180,164,0.85)' }}>{opt.why}</p>
              )}
            </button>
          )
        })}
      </div>
      {picked != null && !chosen?.correct && (
        <button onClick={() => setPicked(null)} className="inline-flex items-center gap-1.5 font-['Inter'] text-[12.5px] mt-2.5" dir="ltr" style={{ color: 'var(--brass)' }}><RotateCcw size={13} /> Try again</button>
      )}
    </div>
  )
}

export default function DeskGrammarPoint() {
  const { pointId } = useParams()
  const pt = getPoint(pointId)
  const { isGrammarDone, markGrammarDone } = useDailyProgress()

  if (!pt) return <Navigate to="/desk/daily/grammar" replace />
  const done = isGrammarDone(pt.id)
  const i = DESK_GRAMMAR.findIndex((x) => x.id === pt.id)
  const next = i + 1 < DESK_GRAMMAR.length ? DESK_GRAMMAR[i + 1] : null

  return (
    <div className="space-y-11 max-w-[680px] mx-auto">
      <Link to="/desk/daily/grammar" className="inline-flex items-center gap-1.5 font-['Inter'] text-[13px] desk-rise" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}><ArrowRight size={15} /> Grammar bank</Link>

      <div className="desk-glass desk-station-head p-6 lg:p-7 desk-rise">
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className="font-['Inter'] font-extrabold text-[12px] px-3 h-6 inline-flex items-center rounded-lg" dir="ltr" style={{ color: '#1a130a', background: 'linear-gradient(135deg,#efd299,#c9a25c)' }}>Rule {i + 1}</span>
          {done && <span className="inline-flex items-center gap-1 font-['Inter'] text-[12px] px-2.5 py-0.5 rounded-full" dir="ltr" style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.12)', border: '1px solid rgba(201,162,92,0.3)' }}><Check size={12} strokeWidth={3} /> Reviewed</span>}
        </div>
        <h1 className="font-['Inter'] font-extrabold text-2xl lg:text-[28px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>{pt.en}</h1>
        <p className="font-['Tajawal'] text-[14px] mt-1" style={{ color: 'rgba(243,238,226,0.5)' }}>{pt.ar}</p>
      </div>

      {/* The rule */}
      <section className="desk-rise">
        <div className="flex items-center gap-2.5 mb-4"><span className="desk-lesson-sec-mark"><Lightbulb size={16} /></span><div><p className="font-['Inter'] text-[12px] tracking-[0.18em]" dir="ltr" style={{ color: 'rgba(201,162,92,0.62)' }}>THE RULE</p><h2 className="font-['Inter'] font-extrabold text-[20px] leading-tight mt-0.5" dir="ltr" style={{ color: 'var(--cream)' }}>How to use it</h2></div></div>
        <div className="desk-glass p-6">
          <p className="font-['Inter'] text-[14.5px] leading-[1.85]" dir="ltr" style={{ color: 'rgba(243,238,226,0.85)' }}>{pt.rule}</p>
          {pt.rule_ar && <p className="font-['Tajawal'] text-[12.5px] mt-2 leading-relaxed" style={{ color: 'rgba(243,238,226,0.5)' }}>{pt.rule_ar}</p>}
          {pt.model && (
            <div className="desk-model-callout mt-4"><Sparkles size={15} style={{ color: 'var(--brass-hi)' }} className="flex-shrink-0 mt-0.5" /><div className="min-w-0"><p className="font-['Inter'] text-[13.5px] font-bold leading-relaxed" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{pt.model}</p>{pt.model_ar && <p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(201,162,92,0.7)' }}>{pt.model_ar}</p>}</div></div>
          )}
          {pt.examples?.length > 0 && (
            <div className="mt-4 space-y-2">
              {pt.examples.map((ex, k) => (
                <div key={k} className="desk-eg-row">
                  <div className="min-w-0 flex-1">
                    <p className="font-['Inter'] text-[14px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{ex.en}</p>
                    <p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(243,238,226,0.55)' }}>{ex.ar}{ex.note ? <span className="font-['Inter']" dir="ltr" style={{ color: 'rgba(201,162,92,0.7)' }}> · {ex.note}</span> : ''}</p>
                  </div>
                  <PlayBtn text={ex.en} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Check */}
      {pt.check?.length > 0 && (
        <section className="desk-rise">
          <div className="flex items-center gap-2.5 mb-4"><span className="desk-lesson-sec-mark"><HelpCircle size={16} /></span><div><p className="font-['Inter'] text-[12px] tracking-[0.18em]" dir="ltr" style={{ color: 'rgba(201,162,92,0.62)' }}>CHECK</p><h2 className="font-['Inter'] font-extrabold text-[20px] leading-tight mt-0.5" dir="ltr" style={{ color: 'var(--cream)' }}>Check yourself</h2></div></div>
          <div className="space-y-3">{pt.check.map((c, k) => <MCQ key={k} q={c.q} options={c.options} />)}</div>
        </section>
      )}

      {/* footer */}
      <div className="pt-1 desk-rise">
        {!done ? (
          <button onClick={() => markGrammarDone(pt.id)} className="desk-cta w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Inter'] font-bold text-[14px]" dir="ltr"><Check size={17} /> Got it</button>
        ) : (
          <div className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Inter'] font-bold text-[14px]" dir="ltr" style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.1)', border: '1px solid rgba(201,162,92,0.26)' }}><CheckCircle2 size={17} /> You’ve reviewed this rule</div>
        )}
        <div className="flex items-center justify-between gap-3 mt-4">
          <Link to="/desk/daily/grammar" className="inline-flex items-center gap-1.5 font-['Inter'] text-[13px]" dir="ltr" style={{ color: 'rgba(243,238,226,0.55)' }}><ArrowRight size={15} /> Bank</Link>
          {next && <Link to={`/desk/daily/grammar/${next.id}`} onClick={() => markGrammarDone(pt.id)} className="inline-flex items-center gap-1.5 font-['Inter'] text-[13px] font-bold min-w-0 justify-end" dir="ltr" style={{ color: 'var(--brass-hi)' }}><span className="truncate">{next.en}</span> <ArrowLeft size={15} className="flex-shrink-0" /></Link>}
        </div>
      </div>
    </div>
  )
}
