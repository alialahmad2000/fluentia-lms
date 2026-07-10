// DeskClassChapter — one STATION of a class. A single topic in three beats:
//   Understand → Check → Practice.
// Focused, short, premium. All practice is self-checking + creditless.
import { useMemo, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Volume2, Check, CheckCircle2, RotateCcw, Eye, Wrench, Repeat, Lightbulb, HelpCircle, Dumbbell, Sparkles, Blocks, PencilLine, LayoutGrid, ListOrdered, Languages, Flag } from 'lucide-react'
import { getChapter, chapterParts } from '@/data/desk/classes'
import { useClassProgress } from './useClassProgress'
import './desk.css'

function speakEn(text) {
  try {
    if (!window.speechSynthesis || !text) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.92
    window.speechSynthesis.speak(u)
  } catch { /* silent */ }
}
const PlayBtn = ({ text }) => (
  <button onClick={() => speakEn(text)} className="desk-ghost-btn flex-shrink-0" aria-label="Listen"><Volume2 size={14} /></button>
)
function seededOrder(n, seed) {
  let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) { s = (s * 1103515245 + 12345) & 0x7fffffff; const j = s % (i + 1);[idx[i], idx[j]] = [idx[j], idx[i]] }
  return idx
}

const BeatHead = ({ eyebrow, title, icon: Icon }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <span className="desk-lesson-sec-mark"><Icon size={16} /></span>
    <div>
      <p className="font-['Hanken_Grotesk'] text-[12px] tracking-[0.18em]" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.46)' }}>{eyebrow}</p>
      <h2 className="font-['Hanken_Grotesk'] font-extrabold text-[20px] leading-tight mt-0.5" dir="ltr" style={{ color: 'var(--cream)' }}>{title}</h2>
    </div>
  </div>
)

// small gloss line under an English example: Arabic translation + English note
const ExampleGloss = ({ ar, note }) => {
  if (!ar && !note) return null
  return (
    <p className="text-[12px] mt-0.5">
      {ar && <span className="font-['Tajawal']" style={{ color: 'rgba(42, 33, 64,0.55)' }}>{ar}</span>}
      {note && <span className="font-['Hanken_Grotesk']" dir="ltr" style={{ color: 'rgba(239, 106, 67,0.72)' }}>{ar ? ' · ' : ''}{note}</span>}
    </p>
  )
}

// ── concept card ──
function ConceptCard({ c }) {
  return (
    <div className="desk-glass p-6">
      {c.en && <h3 className="font-['Hanken_Grotesk'] font-extrabold text-[16px]" dir="ltr" style={{ color: 'var(--cream)' }}>{c.en}</h3>}
      {c.ar && <p className="font-['Tajawal'] text-[12.5px] mb-2 mt-0.5" style={{ color: 'rgba(42, 33, 64,0.5)' }}>{c.ar}</p>}
      <p className={`font-['Hanken_Grotesk'] text-[14.5px] leading-[1.9] ${c.en && !c.ar ? 'mt-2' : ''}`} dir="ltr" style={{ color: 'rgba(42, 33, 64,0.82)' }}>{c.body_en}</p>
      {c.model_en && (
        <div className="desk-model-callout mt-4">
          <Sparkles size={15} style={{ color: 'var(--brass-hi)' }} className="flex-shrink-0 mt-0.5" />
          <p className="font-['Hanken_Grotesk'] text-[13.5px] font-bold leading-relaxed" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{c.model_en}</p>
        </div>
      )}
      {c.examples?.length > 0 && (
        <div className="mt-4 space-y-2">
          {c.examples.map((ex, i) => (
            <div key={i} className="desk-eg-row">
              <div className="min-w-0 flex-1">
                <p className="font-['Hanken_Grotesk'] text-[14px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{ex.en}</p>
                <ExampleGloss ar={ex.ar} note={ex.note_en} />
              </div>
              <PlayBtn text={ex.en} />
            </div>
          ))}
        </div>
      )}
      {c.rule_en && (
        <div className="flex items-start gap-2 mt-4 pt-3 desk-hair">
          <Flag size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(239, 106, 67,0.8)' }} />
          <p className="font-['Hanken_Grotesk'] text-[12.5px]" dir="ltr" style={{ color: 'rgba(239, 106, 67,0.8)' }}>{c.rule_en}</p>
        </div>
      )}
    </div>
  )
}

// ── MCQ (check + choose) ──
function MCQ({ q_en, q_ar, options }) {
  const [picked, setPicked] = useState(null)
  const chosen = picked != null ? options[picked] : null
  return (
    <div className="desk-glass p-6">
      {q_en && <p className="font-['Hanken_Grotesk'] text-[14px] font-bold leading-relaxed" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.9)' }}>{q_en}</p>}
      {q_ar && <p className="font-['Tajawal'] text-[12.5px] mb-3.5 mt-1" style={{ color: 'rgba(42, 33, 64,0.5)' }}>{q_ar}</p>}
      <div className={`space-y-2.5 ${q_en && !q_ar ? 'mt-3.5' : ''}`}>
        {options.map((opt, i) => {
          const state = picked == null ? 'idle' : opt.correct ? 'correct' : picked === i ? 'wrong' : 'dim'
          return (
            <button key={i} disabled={picked != null && opt.correct} onClick={() => { if (picked == null) setPicked(i) }} className={`desk-choose-opt ${state}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 text-start">
                  {opt.en && <p className="font-['Hanken_Grotesk'] text-[14px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{opt.en}</p>}
                  {opt.ar && <p className={`font-['Tajawal'] text-[13px] ${opt.en ? 'mt-0.5' : ''}`} style={{ color: opt.en ? 'rgba(42, 33, 64,0.55)' : 'var(--cream)' }}>{opt.ar}</p>}
                </div>
                {state === 'correct' && <CheckCircle2 size={18} className="flex-shrink-0 desk-pop" style={{ color: '#6ee7b7' }} />}
              </div>
              {picked != null && (state === 'correct' || state === 'wrong') && (
                <p className="font-['Hanken_Grotesk'] text-[12px] mt-2 pt-2 desk-hair" dir="ltr" style={{ color: state === 'correct' ? 'rgba(110,231,183,0.9)' : 'rgba(255,180,164,0.85)' }}>{opt.why_en}</p>
              )}
            </button>
          )
        })}
      </div>
      {picked != null && !chosen?.correct && (
        <button onClick={() => setPicked(null)} className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[12px] mt-2.5" dir="ltr" style={{ color: 'var(--brass)' }}><RotateCcw size={13} /> Try again</button>
      )}
    </div>
  )
}

// ── fill (sentence with a gap) ──
function Fill({ p }) {
  const [picked, setPicked] = useState(null)
  const done = picked != null && p.options[picked]?.correct
  const shown = done ? p.options[picked].en : '_____'
  return (
    <div className="desk-glass p-6">
      {p.prompt_en && <p className="font-['Hanken_Grotesk'] text-[13.5px] font-bold" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.85)' }}>{p.prompt_en}</p>}
      {p.prompt_ar && <p className="font-['Tajawal'] text-[12.5px] mt-0.5" style={{ color: 'rgba(42, 33, 64,0.5)' }}>{p.prompt_ar}</p>}
      <div className="desk-fill-sentence mt-3.5" dir="ltr">
        {p.before ? <span>{p.before} </span> : null}
        <span className={`desk-fill-gap ${done ? 'is-filled' : ''}`}>{shown}</span>
        {p.after ? <span> {p.after}</span> : null}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {p.options.map((opt, i) => {
          const state = picked == null ? 'idle' : opt.correct ? 'correct' : picked === i ? 'wrong' : 'dim'
          return (
            <button key={i} disabled={picked != null && opt.correct} onClick={() => { if (picked == null || !p.options[picked]?.correct) setPicked(i) }} className={`desk-pick-chip ${state}`}>
              <span dir="ltr">{opt.en}</span>
            </button>
          )
        })}
      </div>
      {picked != null && (
        <div className="mt-3 flex items-start justify-between gap-3">
          <p className="font-['Hanken_Grotesk'] text-[12.5px]" dir="ltr" style={{ color: done ? 'rgba(110,231,183,0.9)' : 'rgba(255,180,164,0.85)' }}>{p.options[picked].why_en}</p>
          {done && <PlayBtn text={`${p.before} ${p.options[picked].en} ${p.after}`.trim()} />}
        </div>
      )}
    </div>
  )
}

// ── build (arrange word chips) ──
function Build({ p, seed }) {
  const shuffled = useMemo(() => seededOrder(p.words.length, seed), [p.words.length, seed])
  const [picked, setPicked] = useState([])
  const [checked, setChecked] = useState(false)
  const remaining = shuffled.filter((wi) => !picked.includes(wi))
  const correct = checked && picked.every((wi, pos) => wi === pos)
  const sentence = picked.map((wi) => p.words[wi]).join(' ')
  const check = () => setChecked(true)
  const reset = () => { setPicked([]); setChecked(false) }
  return (
    <div className="desk-glass p-6">
      {p.prompt_en && <p className="font-['Hanken_Grotesk'] text-[13.5px] font-bold" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.85)' }}>{p.prompt_en}</p>}
      {p.prompt_ar && <p className="font-['Tajawal'] text-[12.5px] mt-0.5" style={{ color: 'rgba(42, 33, 64,0.5)' }}>{p.prompt_ar}</p>}
      {p.ar && (
        <p className="text-[12.5px] mt-1.5">
          <span className="font-['Hanken_Grotesk']" dir="ltr" style={{ color: 'rgba(239, 106, 67,0.75)' }}>Meaning: </span>
          <span className="font-['Tajawal']" style={{ color: 'rgba(239, 106, 67,0.75)' }}>{p.ar}</span>
        </p>
      )}
      {/* answer tray */}
      <div className="desk-build-tray mt-3.5" dir="ltr">
        {picked.length === 0 && <span className="font-['Hanken_Grotesk'] text-[12px]" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.4)' }}>Tap the words in order</span>}
        {picked.map((wi, pos) => {
          const ok = checked && wi === pos, bad = checked && wi !== pos
          return (
            <button key={wi} disabled={checked} onClick={() => setPicked(picked.filter((x) => x !== wi))} className={`desk-word-chip is-picked ${ok ? 'ok' : ''} ${bad ? 'bad' : ''}`}>{p.words[wi]}</button>
          )
        })}
      </div>
      {/* bank */}
      {remaining.length > 0 && !checked && (
        <div className="flex flex-wrap gap-2 mt-3">
          {remaining.map((wi) => <button key={wi} onClick={() => setPicked([...picked, wi])} className="desk-word-chip">{p.words[wi]}</button>)}
        </div>
      )}
      <div className="flex items-center gap-3 mt-4">
        {!checked && picked.length === p.words.length && (
          <button onClick={check} className="desk-cta inline-flex items-center gap-2 px-5 h-11 rounded-xl font-['Hanken_Grotesk'] font-bold text-[13px]" dir="ltr"><Check size={15} /> Check</button>
        )}
        {checked && (
          <>
            <span className="font-['Hanken_Grotesk'] text-[13px] font-bold" dir="ltr" style={{ color: correct ? '#6ee7b7' : 'rgba(255,180,164,0.9)' }}>{correct ? 'Perfect — correct order ✓' : 'Check the order'}</span>
            {correct && <PlayBtn text={sentence} />}
            <button onClick={reset} className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[12px]" dir="ltr" style={{ color: 'var(--brass)' }}><RotateCcw size={13} /> Reset</button>
          </>
        )}
      </div>
    </div>
  )
}

// ── classify (real sorting: select a sentence → drop it in its bucket lane) ──
function Classify({ p }) {
  const [placed, setPlaced] = useState({}) // itemIndex -> bucketId (correct only)
  const [selected, setSelected] = useState(null)
  const [wrong, setWrong] = useState(null)
  const bank = p.items.map((_, i) => i).filter((i) => placed[i] == null)
  const done = Object.keys(placed).length === p.items.length

  const tapLane = (bId) => {
    if (selected == null) return
    if (p.items[selected].bucket === bId) { setPlaced((pl) => ({ ...pl, [selected]: bId })); setSelected(null) }
    else { setWrong(bId); setSelected(null); setTimeout(() => setWrong(null), 550) }
  }
  return (
    <div className="desk-glass p-6">
      {p.prompt_en && <p className="font-['Hanken_Grotesk'] text-[13.5px] font-bold" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.85)' }}>{p.prompt_en}</p>}
      {p.prompt_ar && <p className="font-['Tajawal'] text-[12.5px] mt-0.5" style={{ color: 'rgba(42, 33, 64,0.5)' }}>{p.prompt_ar}</p>}
      {/* bank of unsorted sentences */}
      {bank.length > 0 && (
        <>
          <p className="font-['Hanken_Grotesk'] text-[12px] mt-2 mb-2.5" dir="ltr" style={{ color: 'rgba(239, 106, 67,0.75)' }}>Pick a sentence, then drop it in its place</p>
          <div className="desk-sort-bank">
            {bank.map((i) => (
              <button key={i} onClick={() => setSelected((s) => (s === i ? null : i))} className={`desk-sort-item ${selected === i ? 'is-selected' : ''}`} dir="ltr">{p.items[i].en}</button>
            ))}
          </div>
        </>
      )}
      {done && <p className="font-['Hanken_Grotesk'] text-[13px] font-bold mt-1" dir="ltr" style={{ color: '#6ee7b7' }}>Nice — all sorted ✓</p>}
      {/* the buckets — visible destination lanes */}
      <div className="space-y-2.5 mt-3.5">
        {p.buckets.map((bk) => {
          const items = Object.keys(placed).filter((i) => placed[i] === bk.id).map(Number)
          const canDrop = selected != null
          return (
            <button key={bk.id} onClick={() => tapLane(bk.id)} disabled={selected == null && !canDrop}
              className={`desk-lane ${canDrop ? 'can-drop' : ''} ${wrong === bk.id ? 'flash-wrong' : ''}`}>
              <span className="desk-lane-label" dir="ltr">
                {bk.label_en}
                {bk.label_ar && <span className="font-['Tajawal'] text-[11px] ms-2" style={{ color: 'rgba(42, 33, 64,0.4)' }}>{bk.label_ar}</span>}
              </span>
              <div className="desk-lane-items">
                {items.length === 0 && <span className="desk-lane-empty" dir="ltr">{canDrop ? 'Drop it here' : '—'}</span>}
                {items.map((i) => (
                  <span key={i} className="desk-lane-chip desk-pop" dir="ltr">{p.items[i].en}</span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── ladder / fix / irregular / translate (retrieve → reveal) ──
function Ladder({ p }) {
  return (
    <div className="desk-glass p-6">
      {p.intro_en && <p className="font-['Hanken_Grotesk'] text-[13px] leading-relaxed mb-4" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.7)' }}>{p.intro_en}</p>}
      <div className="desk-ladder-base">
        <span className="font-['Hanken_Grotesk'] text-[11px] font-bold tracking-[0.14em] uppercase" dir="ltr" style={{ color: 'var(--brass)' }}>Base sentence</span>
        <div className="flex items-center justify-between gap-3 mt-1">
          <div><p className="font-['Hanken_Grotesk'] text-[16px] font-semibold" dir="ltr" style={{ color: 'var(--cream)' }}>{p.base.en}</p>{p.base.ar && <p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(42, 33, 64,0.55)' }}>{p.base.ar}</p>}</div>
          <PlayBtn text={p.base.en} />
        </div>
      </div>
      <div className="mt-3 space-y-2.5">{p.rungs.map((r, i) => <LadderRung key={i} r={r} n={i + 1} />)}</div>
    </div>
  )
}
function LadderRung({ r, n }) {
  const rm = useReducedMotion(); const [open, setOpen] = useState(false)
  return (
    <div className={`desk-rung ${open ? 'is-open' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="desk-rung-num">{n}</span>
        <div className="flex-1 min-w-0">
          <p className="font-['Hanken_Grotesk'] text-[13.5px] font-bold" dir="ltr" style={{ color: 'var(--cream)' }}>{r.task_en}</p>
          {r.task_ar && <p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(42, 33, 64,0.5)' }}>{r.task_ar}</p>}
        </div>
        {!open && <button onClick={() => setOpen(true)} className="desk-reveal-btn" dir="ltr"><Eye size={13} /> Reveal</button>}
      </div>
      {open && (
        <motion.div initial={rm ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
          <div className="flex items-start justify-between gap-3 mt-2.5 pt-2.5 desk-hair">
            <div className="min-w-0"><p className="font-['Hanken_Grotesk'] text-[14.5px] font-semibold leading-snug" dir="ltr" style={{ color: '#a9e7c9' }}>{r.en}</p>{r.why_en && <p className="font-['Hanken_Grotesk'] text-[12px] mt-1.5" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.6)' }}>{r.why_en}</p>}</div>
            <PlayBtn text={r.en} />
          </div>
        </motion.div>
      )}
    </div>
  )
}
function FixIt({ p }) {
  return (
    <div className="desk-glass p-6">
      {p.intro_en && <p className="font-['Hanken_Grotesk'] text-[13px] leading-relaxed mb-4" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.7)' }}>{p.intro_en}</p>}
      <div className="space-y-3">{p.items.map((it, i) => <FixRow key={i} it={it} />)}</div>
    </div>
  )
}
function FixRow({ it }) {
  const rm = useReducedMotion(); const [open, setOpen] = useState(false)
  return (
    <div className="desk-fix-row">
      <div className="flex items-start justify-between gap-3">
        <p className="font-['Hanken_Grotesk'] text-[14px] leading-snug line-through" dir="ltr" style={{ color: 'rgba(255,180,164,0.72)' }}>{it.wrong}</p>
        {!open && <button onClick={() => setOpen(true)} className="desk-reveal-btn flex-shrink-0" dir="ltr"><Wrench size={12} /> Fix</button>}
      </div>
      {open && (
        <motion.div initial={rm ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between gap-3 mt-2.5 pt-2.5 desk-hair">
            <div className="min-w-0"><p className="font-['Hanken_Grotesk'] text-[14.5px] font-semibold leading-snug desk-pop" dir="ltr" style={{ color: '#a9e7c9' }}>{it.right}</p>{it.why_en && <p className="font-['Hanken_Grotesk'] text-[12px] mt-1.5" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.6)' }}>{it.why_en}</p>}</div>
            <PlayBtn text={it.right} />
          </div>
        </motion.div>
      )}
    </div>
  )
}
function Irregular({ p }) {
  return (
    <div className="desk-glass p-6">
      {p.intro_en && <p className="font-['Hanken_Grotesk'] text-[13px] leading-relaxed mb-4" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.7)' }}>{p.intro_en}</p>}
      <div className="grid sm:grid-cols-2 gap-2.5">{p.verbs.map((v, i) => <IrregularCard key={i} v={v} />)}</div>
    </div>
  )
}
function IrregularCard({ v }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <button onClick={() => setFlipped((f) => !f)} className={`desk-flip ${flipped ? 'is-flipped' : ''}`}>
      {!flipped ? (
        <div className="flex items-center justify-between w-full gap-2"><div className="text-start"><p className="font-['Hanken_Grotesk'] text-[17px] font-bold" dir="ltr" style={{ color: 'var(--cream)' }}>{v.base}</p>{v.ar && <p className="font-['Tajawal'] text-[12px]" style={{ color: 'rgba(42, 33, 64,0.5)' }}>{v.ar}</p>}</div><Repeat size={15} style={{ color: 'rgba(239, 106, 67,0.6)' }} /></div>
      ) : (
        <div className="flex items-center justify-between w-full gap-2"><div className="text-start" dir="ltr"><p className="font-['Hanken_Grotesk'] text-[14.5px] font-semibold desk-pop" style={{ color: 'var(--brass-hi)' }}>{v.base} · {v.past} · {v.pp}</p><p className="font-['Hanken_Grotesk'] text-[12px] mt-0.5" style={{ color: 'rgba(42, 33, 64,0.5)' }}>base · past · past participle</p></div><button onClick={(e) => { e.stopPropagation(); speakEn(`${v.base}, ${v.past}, ${v.pp}`) }} className="desk-ghost-btn flex-shrink-0"><Volume2 size={13} /></button></div>
      )}
    </button>
  )
}
function Translate({ p }) {
  return (
    <div className="desk-glass p-6">
      {p.intro_en && <p className="font-['Hanken_Grotesk'] text-[13px] leading-relaxed mb-4" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.7)' }}>{p.intro_en}</p>}
      <div className="space-y-3">{p.items.map((it, i) => <TranslateRow key={i} it={it} />)}</div>
    </div>
  )
}
function TranslateRow({ it }) {
  const rm = useReducedMotion(); const [open, setOpen] = useState(false)
  return (
    <div className="desk-fix-row">
      <div className="flex items-start justify-between gap-3">
        <p className="font-['Tajawal'] text-[14px] font-bold leading-snug" style={{ color: 'var(--cream)' }}>{it.ar}</p>
        {!open && <button onClick={() => setOpen(true)} className="desk-reveal-btn flex-shrink-0" dir="ltr"><Eye size={12} /> Model</button>}
      </div>
      {open && (
        <motion.div initial={rm ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between gap-3 mt-2.5 pt-2.5 desk-hair">
            <div className="min-w-0"><p className="font-['Hanken_Grotesk'] text-[14.5px] font-semibold leading-snug desk-pop" dir="ltr" style={{ color: '#a9e7c9' }}>{it.en}</p>{it.alt_en && <p className="font-['Hanken_Grotesk'] text-[13px] mt-1" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.5)' }}>or: {it.alt_en}</p>}</div>
            <PlayBtn text={it.en} />
          </div>
        </motion.div>
      )}
    </div>
  )
}

const PMETA = {
  choose: { icon: Sparkles }, fill: { icon: PencilLine }, build: { icon: Blocks }, classify: { icon: LayoutGrid },
  ladder: { icon: ListOrdered }, fix: { icon: Wrench }, irregular: { icon: Repeat }, translate: { icon: Languages },
}

export default function DeskClassChapter() {
  const { classId, chapterId } = useParams()
  const { cls, chapter, index, next, prev } = getChapter(classId, chapterId)
  const { isChapterDone, markChapterDone } = useClassProgress()

  if (!cls || !chapter) return <Navigate to={cls ? `/desk/classes/${cls.id}` : '/desk/classes'} replace />
  const done = isChapterDone(cls.id, chapter.id)
  const parts = chapterParts(chapter)

  return (
    <div className="space-y-14 max-w-[720px] mx-auto">
      <Link to={`/desk/classes/${cls.id}`} className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[13px] desk-rise" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.5)' }}>
        <ArrowLeft size={15} /> {cls.title_en}
      </Link>

      {/* station masthead — a lit panel, so the station page has real presence */}
      <div className="desk-glass desk-station-head p-6 lg:p-7 desk-rise">
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className="font-['Hanken_Grotesk'] font-extrabold text-[12px] px-3 h-6 inline-flex items-center rounded-lg" dir="ltr" style={{ color: '#fff3ee', background: 'linear-gradient(135deg,#ef6a43,#cf4a1c)' }}>Station {index + 1} of {cls.chapters.length}</span>
          {done && <span className="inline-flex items-center gap-1 font-['Hanken_Grotesk'] text-[12px] px-2.5 py-0.5 rounded-full" dir="ltr" style={{ color: 'var(--brass-hi)', background: 'rgba(239, 106, 67,0.12)', border: '1px solid rgba(239, 106, 67,0.3)' }}><Check size={12} strokeWidth={3} /> Done</span>}
        </div>
        <h1 className="font-['Hanken_Grotesk'] font-extrabold text-2xl lg:text-[30px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>{chapter.en}</h1>
        {chapter.ar && <p className="font-['Tajawal'] text-[14px] mt-1.5" style={{ color: 'rgba(42, 33, 64,0.5)' }}>{chapter.ar}</p>}
        {chapter.goal_en && <p className="desk-goal-chip mt-4 font-['Hanken_Grotesk'] text-[13px]" dir="ltr">You'll master: {chapter.goal_en}</p>}

        {/* 3-beat stepper */}
        <div className="desk-beats mt-5 pt-5 desk-hair">
          <span className="desk-beat" dir="ltr"><Lightbulb size={13} /> Understand</span>
          {parts.check && <><span className="desk-beat-sep" /><span className="desk-beat" dir="ltr"><HelpCircle size={13} /> Check</span></>}
          {parts.practice && <><span className="desk-beat-sep" /><span className="desk-beat is-do" dir="ltr"><Dumbbell size={13} /> Practice</span></>}
        </div>
      </div>

      {/* Understand */}
      {chapter.concept?.length > 0 && (
        <section className="desk-rise">
          <BeatHead eyebrow="UNDERSTAND" title="Understand" icon={Lightbulb} />
          <div className="space-y-3">{chapter.concept.map((c, i) => <ConceptCard key={i} c={c} />)}</div>
        </section>
      )}

      {/* Check */}
      {chapter.check?.length > 0 && (
        <section className="desk-rise">
          <BeatHead eyebrow="CHECK" title="Check what stuck" icon={HelpCircle} />
          <div className="space-y-3">{chapter.check.map((q, i) => <MCQ key={i} q_en={q.q_en} q_ar={q.q_ar} options={q.options} />)}</div>
        </section>
      )}

      {/* Practice */}
      {chapter.practice?.length > 0 && (
        <section className="desk-rise">
          <BeatHead eyebrow="DO IT" title="Practice" icon={Dumbbell} />
          <div className="space-y-5">
            {chapter.practice.map((p, i) => {
              const Icon = (PMETA[p.type] || {}).icon || Sparkles
              return (
                <div key={i}>
                  {p.title_en && (
                    <div className="flex items-center gap-2 mb-2.5 px-1">
                      <Icon size={15} style={{ color: 'var(--brass)' }} />
                      <h3 className="font-['Hanken_Grotesk'] font-bold text-[15px]" dir="ltr" style={{ color: 'var(--cream)' }}>{p.title_en}</h3>
                      {p.title_ar && <span className="font-['Tajawal'] text-[12px]" style={{ color: 'rgba(42, 33, 64,0.4)' }}>{p.title_ar}</span>}
                    </div>
                  )}
                  {p.type === 'choose' && <MCQ q_en={p.prompt_en} q_ar={p.prompt_ar} options={p.options} />}
                  {p.type === 'fill' && <Fill p={p} />}
                  {p.type === 'build' && <Build p={p} seed={`${chapter.id}-${i}`} />}
                  {p.type === 'classify' && <Classify p={p} />}
                  {p.type === 'ladder' && <Ladder p={p} seed={`${chapter.id}-${i}`} />}
                  {p.type === 'fix' && <FixIt p={p} />}
                  {p.type === 'irregular' && <Irregular p={p} />}
                  {p.type === 'translate' && <Translate p={p} />}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* footer */}
      <div className="pt-1 desk-rise">
        {!done ? (
          <button onClick={() => markChapterDone(cls.id, chapter.id)} className="desk-cta w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[14px]" dir="ltr">
            <Check size={17} /> {next ? 'Done — next station' : 'Mark station done'}
          </button>
        ) : (
          <div className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[14px]" dir="ltr" style={{ color: 'var(--brass-hi)', background: 'rgba(239, 106, 67,0.1)', border: '1px solid rgba(239, 106, 67,0.26)' }}>
            <CheckCircle2 size={17} /> You finished this station
          </div>
        )}
        <div className="flex items-center justify-between gap-3 mt-4">
          {prev
            ? <Link to={`/desk/classes/${cls.id}/${prev.id}`} className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[13px] min-w-0" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.55)' }}><ArrowLeft size={15} className="flex-shrink-0" /> <span className="truncate">{prev.en}</span></Link>
            : <Link to={`/desk/classes/${cls.id}`} className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[13px]" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.55)' }}><ArrowLeft size={15} /> Map</Link>}
          {next
            ? <Link to={`/desk/classes/${cls.id}/${next.id}`} onClick={() => markChapterDone(cls.id, chapter.id)} className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[13px] font-bold min-w-0 justify-end" dir="ltr" style={{ color: 'var(--brass-hi)' }}><span className="truncate">{next.en}</span> <ArrowRight size={15} className="flex-shrink-0" /></Link>
            : <Link to={`/desk/classes/${cls.id}`} onClick={() => markChapterDone(cls.id, chapter.id)} className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[13px] font-bold" dir="ltr" style={{ color: 'var(--brass-hi)' }}>Finish review <ArrowRight size={15} /></Link>}
        </div>
      </div>
    </div>
  )
}
