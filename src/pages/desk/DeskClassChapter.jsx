// DeskClassChapter — one STATION of a class. A single topic in three beats:
//   افهمي (understand) → تأكّدي (check) → طبّقي (do).
// Focused, short, premium. All practice is self-checking + creditless.
import { useMemo, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Volume2, Check, CheckCircle2, RotateCcw, Eye, Wrench, Repeat, Lightbulb, HelpCircle, Dumbbell, Sparkles, Blocks, PencilLine, LayoutGrid, ListOrdered, Languages, Flag } from 'lucide-react'
import { useG } from '@/i18n/gender'
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
  <button onClick={() => speakEn(text)} className="desk-ghost-btn flex-shrink-0" aria-label="استماع"><Volume2 size={14} /></button>
)
function seededOrder(n, seed) {
  let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) { s = (s * 1103515245 + 12345) & 0x7fffffff; const j = s % (i + 1);[idx[i], idx[j]] = [idx[j], idx[i]] }
  return idx
}

const BeatHead = ({ eyebrow, ar, icon: Icon }) => (
  <div className="flex items-center gap-2.5 mb-4">
    <span className="desk-lesson-sec-mark"><Icon size={16} /></span>
    <div>
      <p className="font-['Inter'] text-[12px] tracking-[0.18em]" dir="ltr" style={{ color: 'rgba(201,162,92,0.62)' }}>{eyebrow}</p>
      <h2 className="font-['Tajawal'] font-extrabold text-[20px] leading-tight mt-0.5" style={{ color: 'var(--cream)' }}>{ar}</h2>
    </div>
  </div>
)

// ── concept card ──
function ConceptCard({ c }) {
  return (
    <div className="desk-glass p-6">
      {c.ar && <h3 className="font-['Tajawal'] font-extrabold text-[16px] mb-2" style={{ color: 'var(--cream)' }}>{c.ar}</h3>}
      <p className="font-['Tajawal'] text-[14.5px] leading-[1.9]" style={{ color: 'rgba(243,238,226,0.82)' }}>{c.body_ar}</p>
      {c.model_ar && (
        <div className="desk-model-callout mt-4">
          <Sparkles size={15} style={{ color: 'var(--brass-hi)' }} className="flex-shrink-0 mt-0.5" />
          <p className="font-['Tajawal'] text-[13.5px] font-bold leading-relaxed" style={{ color: 'var(--brass-hi)' }}>{c.model_ar}</p>
        </div>
      )}
      {c.examples?.length > 0 && (
        <div className="mt-4 space-y-2">
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
        <div className="flex items-start gap-2 mt-4 pt-3 desk-hair">
          <Flag size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'rgba(201,162,92,0.8)' }} />
          <p className="font-['Tajawal'] text-[12.5px]" style={{ color: 'rgba(201,162,92,0.8)' }}>{c.rule_ar}</p>
        </div>
      )}
    </div>
  )
}

// ── MCQ (check + choose) ──
function MCQ({ q_ar, options }) {
  const g = useG()
  const [picked, setPicked] = useState(null)
  const chosen = picked != null ? options[picked] : null
  return (
    <div className="desk-glass p-6">
      {q_ar && <p className="font-['Tajawal'] text-[14px] font-bold mb-3.5 leading-relaxed" style={{ color: 'rgba(243,238,226,0.9)' }} dir="auto">{q_ar}</p>}
      <div className="space-y-2.5">
        {options.map((opt, i) => {
          const state = picked == null ? 'idle' : opt.correct ? 'correct' : picked === i ? 'wrong' : 'dim'
          return (
            <button key={i} disabled={picked != null && opt.correct} onClick={() => { if (picked == null) setPicked(i) }} className={`desk-choose-opt ${state}`}>
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
        <button onClick={() => setPicked(null)} className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[12px] mt-2.5" style={{ color: 'var(--brass)' }}><RotateCcw size={13} /> {g('حاول مرة ثانية', 'حاولي مرة ثانية')}</button>
      )}
    </div>
  )
}

// ── fill (sentence with a gap) ──
function Fill({ p }) {
  const g = useG()
  const [picked, setPicked] = useState(null)
  const done = picked != null && p.options[picked]?.correct
  const shown = done ? p.options[picked].en : '_____'
  return (
    <div className="desk-glass p-6">
      <p className="font-['Tajawal'] text-[13.5px] font-bold mb-3.5" style={{ color: 'rgba(243,238,226,0.85)' }}>{p.prompt_ar}</p>
      <div className="desk-fill-sentence" dir="ltr">
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
          <p className="font-['Tajawal'] text-[12.5px]" style={{ color: done ? 'rgba(110,231,183,0.9)' : 'rgba(255,180,164,0.85)' }}>{p.options[picked].why_ar}</p>
          {done && <PlayBtn text={`${p.before} ${p.options[picked].en} ${p.after}`.trim()} />}
        </div>
      )}
    </div>
  )
}

// ── build (arrange word chips) ──
function Build({ p, seed }) {
  const g = useG()
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
      <p className="font-['Tajawal'] text-[13.5px] font-bold" style={{ color: 'rgba(243,238,226,0.85)' }}>{p.prompt_ar}</p>
      {p.ar && <p className="font-['Tajawal'] text-[12.5px] mt-1" style={{ color: 'rgba(201,162,92,0.75)' }}>{p.ar}</p>}
      {/* answer tray */}
      <div className="desk-build-tray mt-3.5" dir="ltr">
        {picked.length === 0 && <span className="font-['Tajawal'] text-[12px]" dir="rtl" style={{ color: 'rgba(243,238,226,0.4)' }}>{g('اضغط الكلمات بالترتيب', 'اضغطي الكلمات بالترتيب')}</span>}
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
          <button onClick={check} className="desk-cta inline-flex items-center gap-2 px-5 h-11 rounded-xl font-['Tajawal'] font-bold text-[13px]"><Check size={15} /> {g('تحقّق', 'تحقّقي')}</button>
        )}
        {checked && (
          <>
            <span className="font-['Tajawal'] text-[13px] font-bold" style={{ color: correct ? '#6ee7b7' : 'rgba(255,180,164,0.9)' }}>{correct ? g('ممتاز، ترتيب صحيح ✓', 'ممتاز، ترتيب صحيح ✓') : g('راجع الترتيب', 'راجعي الترتيب')}</span>
            {correct && <PlayBtn text={sentence} />}
            <button onClick={reset} className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[12px]" style={{ color: 'var(--brass)' }}><RotateCcw size={13} /> {g('من جديد', 'من جديد')}</button>
          </>
        )}
      </div>
    </div>
  )
}

// ── classify (real sorting: select a sentence → drop it in its bucket lane) ──
function Classify({ p }) {
  const g = useG()
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
      <p className="font-['Tajawal'] text-[13.5px] font-bold" style={{ color: 'rgba(243,238,226,0.85)' }}>{p.prompt_ar}</p>
      {/* bank of unsorted sentences */}
      {bank.length > 0 && (
        <>
          <p className="font-['Tajawal'] text-[12px] mt-1.5 mb-2.5" style={{ color: 'rgba(201,162,92,0.75)' }}>{g('اختر جملة، ثم حطها في مكانها', 'اختاري جملة، ثم حطّيها في مكانها')}</p>
          <div className="desk-sort-bank">
            {bank.map((i) => (
              <button key={i} onClick={() => setSelected((s) => (s === i ? null : i))} className={`desk-sort-item ${selected === i ? 'is-selected' : ''}`} dir="ltr">{p.items[i].en}</button>
            ))}
          </div>
        </>
      )}
      {done && <p className="font-['Tajawal'] text-[13px] font-bold mt-1" style={{ color: '#6ee7b7' }}>{g('ممتاز، صنّفت الكل ✓', 'ممتاز، صنّفتِ الكل ✓')}</p>}
      {/* the buckets — visible destination lanes */}
      <div className="space-y-2.5 mt-3.5">
        {p.buckets.map((bk) => {
          const items = Object.keys(placed).filter((i) => placed[i] === bk.id).map(Number)
          const canDrop = selected != null
          return (
            <button key={bk.id} onClick={() => tapLane(bk.id)} disabled={selected == null && !canDrop}
              className={`desk-lane ${canDrop ? 'can-drop' : ''} ${wrong === bk.id ? 'flash-wrong' : ''}`}>
              <span className="desk-lane-label">{bk.label_ar}</span>
              <div className="desk-lane-items">
                {items.length === 0 && <span className="desk-lane-empty">{canDrop ? g('حطها هنا', 'حطّيها هنا') : '—'}</span>}
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
function Ladder({ p, seed }) {
  const g = useG()
  return (
    <div className="desk-glass p-6">
      <p className="font-['Tajawal'] text-[13px] leading-relaxed mb-4" style={{ color: 'rgba(243,238,226,0.7)' }}>{p.intro_ar}</p>
      <div className="desk-ladder-base">
        <span className="font-['Tajawal'] text-[12px] font-bold" style={{ color: 'var(--brass)' }}>{g('الجملة الأساس', 'الجملة الأساس')}</span>
        <div className="flex items-center justify-between gap-3 mt-1">
          <div><p className="font-['Inter'] text-[16px] font-semibold" dir="ltr" style={{ color: 'var(--cream)' }}>{p.base.en}</p><p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(243,238,226,0.55)' }}>{p.base.ar}</p></div>
          <PlayBtn text={p.base.en} />
        </div>
      </div>
      <div className="mt-3 space-y-2.5">{p.rungs.map((r, i) => <LadderRung key={i} r={r} n={i + 1} g={g} />)}</div>
    </div>
  )
}
function LadderRung({ r, n, g }) {
  const rm = useReducedMotion(); const [open, setOpen] = useState(false)
  return (
    <div className={`desk-rung ${open ? 'is-open' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="desk-rung-num">{n}</span>
        <p className="font-['Tajawal'] text-[13.5px] font-bold flex-1" style={{ color: 'var(--cream)' }}>{r.task_ar}</p>
        {!open && <button onClick={() => setOpen(true)} className="desk-reveal-btn"><Eye size={13} /> {g('أظهر', 'أظهري')}</button>}
      </div>
      {open && (
        <motion.div initial={rm ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
          <div className="flex items-start justify-between gap-3 mt-2.5 pt-2.5 desk-hair">
            <div className="min-w-0"><p className="font-['Inter'] text-[14.5px] font-semibold leading-snug" dir="ltr" style={{ color: '#a9e7c9' }}>{r.en}</p>{r.why_ar && <p className="font-['Tajawal'] text-[12px] mt-1.5" style={{ color: 'rgba(243,238,226,0.6)' }}>{r.why_ar}</p>}</div>
            <PlayBtn text={r.en} />
          </div>
        </motion.div>
      )}
    </div>
  )
}
function FixIt({ p }) {
  const g = useG()
  return (
    <div className="desk-glass p-6">
      <p className="font-['Tajawal'] text-[13px] leading-relaxed mb-4" style={{ color: 'rgba(243,238,226,0.7)' }}>{p.intro_ar}</p>
      <div className="space-y-3">{p.items.map((it, i) => <FixRow key={i} it={it} g={g} />)}</div>
    </div>
  )
}
function FixRow({ it, g }) {
  const rm = useReducedMotion(); const [open, setOpen] = useState(false)
  return (
    <div className="desk-fix-row">
      <div className="flex items-start justify-between gap-3">
        <p className="font-['Inter'] text-[14px] leading-snug line-through" dir="ltr" style={{ color: 'rgba(255,180,164,0.72)' }}>{it.wrong}</p>
        {!open && <button onClick={() => setOpen(true)} className="desk-reveal-btn flex-shrink-0"><Wrench size={12} /> {g('صحّح', 'صحّحي')}</button>}
      </div>
      {open && (
        <motion.div initial={rm ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between gap-3 mt-2.5 pt-2.5 desk-hair">
            <div className="min-w-0"><p className="font-['Inter'] text-[14.5px] font-semibold leading-snug desk-pop" dir="ltr" style={{ color: '#a9e7c9' }}>{it.right}</p>{it.why_ar && <p className="font-['Tajawal'] text-[12px] mt-1.5" style={{ color: 'rgba(243,238,226,0.6)' }}>{it.why_ar}</p>}</div>
            <PlayBtn text={it.right} />
          </div>
        </motion.div>
      )}
    </div>
  )
}
function Irregular({ p }) {
  const g = useG()
  return (
    <div className="desk-glass p-6">
      <p className="font-['Tajawal'] text-[13px] leading-relaxed mb-4" style={{ color: 'rgba(243,238,226,0.7)' }}>{p.intro_ar}</p>
      <div className="grid sm:grid-cols-2 gap-2.5">{p.verbs.map((v, i) => <IrregularCard key={i} v={v} g={g} />)}</div>
    </div>
  )
}
function IrregularCard({ v, g }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <button onClick={() => setFlipped((f) => !f)} className={`desk-flip ${flipped ? 'is-flipped' : ''}`}>
      {!flipped ? (
        <div className="flex items-center justify-between w-full gap-2"><div className="text-start"><p className="font-['Inter'] text-[17px] font-bold" dir="ltr" style={{ color: 'var(--cream)' }}>{v.base}</p><p className="font-['Tajawal'] text-[12px]" style={{ color: 'rgba(243,238,226,0.5)' }}>{v.ar}</p></div><Repeat size={15} style={{ color: 'rgba(201,162,92,0.6)' }} /></div>
      ) : (
        <div className="flex items-center justify-between w-full gap-2"><div className="text-start" dir="ltr"><p className="font-['Inter'] text-[14.5px] font-semibold desk-pop" style={{ color: 'var(--brass-hi)' }}>{v.base} · {v.past} · {v.pp}</p><p className="font-['Tajawal'] text-[12px] mt-0.5" dir="rtl" style={{ color: 'rgba(243,238,226,0.5)' }}>{g('المصدر · الماضي · اسم المفعول', 'المصدر · الماضي · اسم المفعول')}</p></div><button onClick={(e) => { e.stopPropagation(); speakEn(`${v.base}, ${v.past}, ${v.pp}`) }} className="desk-ghost-btn flex-shrink-0"><Volume2 size={13} /></button></div>
      )}
    </button>
  )
}
function Translate({ p }) {
  const g = useG()
  return (
    <div className="desk-glass p-6">
      <p className="font-['Tajawal'] text-[13px] leading-relaxed mb-4" style={{ color: 'rgba(243,238,226,0.7)' }}>{p.intro_ar}</p>
      <div className="space-y-3">{p.items.map((it, i) => <TranslateRow key={i} it={it} g={g} />)}</div>
    </div>
  )
}
function TranslateRow({ it, g }) {
  const rm = useReducedMotion(); const [open, setOpen] = useState(false)
  return (
    <div className="desk-fix-row">
      <div className="flex items-start justify-between gap-3">
        <p className="font-['Tajawal'] text-[14px] font-bold leading-snug" style={{ color: 'var(--cream)' }}>{it.ar}</p>
        {!open && <button onClick={() => setOpen(true)} className="desk-reveal-btn flex-shrink-0"><Eye size={12} /> {g('النموذج', 'النموذج')}</button>}
      </div>
      {open && (
        <motion.div initial={rm ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between gap-3 mt-2.5 pt-2.5 desk-hair">
            <div className="min-w-0"><p className="font-['Inter'] text-[14.5px] font-semibold leading-snug desk-pop" dir="ltr" style={{ color: '#a9e7c9' }}>{it.en}</p>{it.alt_en && <p className="font-['Inter'] text-[13px] mt-1" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>{g('أو:', 'أو:')} {it.alt_en}</p>}</div>
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
  const g = useG()
  const { cls, chapter, index, next, prev } = getChapter(classId, chapterId)
  const { isChapterDone, markChapterDone } = useClassProgress()

  if (!cls || !chapter) return <Navigate to={cls ? `/desk/classes/${cls.id}` : '/desk/classes'} replace />
  const done = isChapterDone(cls.id, chapter.id)
  const parts = chapterParts(chapter)

  return (
    <div className="space-y-14 max-w-[720px] mx-auto">
      <Link to={`/desk/classes/${cls.id}`} className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px] desk-rise" style={{ color: 'rgba(243,238,226,0.5)' }}>
        <ArrowRight size={15} /> {cls.title_ar}
      </Link>

      {/* station masthead — a lit panel, so the station page has real presence */}
      <div className="desk-glass desk-station-head p-6 lg:p-7 desk-rise">
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className="font-['Tajawal'] font-extrabold text-[12px] px-3 h-6 inline-flex items-center rounded-lg" style={{ color: '#1a130a', background: 'linear-gradient(135deg,#efd299,#c9a25c)' }}>{g('المحطة', 'المحطة')} {index + 1} {g('من', 'من')} {cls.chapters.length}</span>
          {done && <span className="inline-flex items-center gap-1 font-['Tajawal'] text-[12px] px-2.5 py-0.5 rounded-full" style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.12)', border: '1px solid rgba(201,162,92,0.3)' }}><Check size={12} strokeWidth={3} /> {g('أنجزتها', 'أنجزتيها')}</span>}
        </div>
        <h1 className="font-['Tajawal'] font-extrabold text-2xl lg:text-[30px] leading-tight" style={{ color: 'var(--cream)' }}>{chapter.ar}</h1>
        <p className="font-['Inter'] text-[13px] mt-1" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>{chapter.en}</p>
        {chapter.goal_ar && <p className="desk-goal-chip mt-4 font-['Tajawal'] text-[13px]">{g('بتتقن: ', 'بتتقنين: ')}{chapter.goal_ar}</p>}

        {/* 3-beat stepper */}
        <div className="desk-beats mt-5 pt-5 desk-hair">
          <span className="desk-beat"><Lightbulb size={13} /> {g('افهم', 'افهمي')}</span>
          {parts.check && <><span className="desk-beat-sep" /><span className="desk-beat"><HelpCircle size={13} /> {g('تأكّد', 'تأكّدي')}</span></>}
          {parts.practice && <><span className="desk-beat-sep" /><span className="desk-beat is-do"><Dumbbell size={13} /> {g('طبّق', 'طبّقي')}</span></>}
        </div>
      </div>

      {/* افهمي */}
      {chapter.concept?.length > 0 && (
        <section className="desk-rise">
          <BeatHead eyebrow="UNDERSTAND" ar={g('افهم', 'افهمي')} icon={Lightbulb} />
          <div className="space-y-3">{chapter.concept.map((c, i) => <ConceptCard key={i} c={c} />)}</div>
        </section>
      )}

      {/* تأكّدي */}
      {chapter.check?.length > 0 && (
        <section className="desk-rise">
          <BeatHead eyebrow="CHECK" ar={g('تأكّد إنك فهمت', 'تأكّدي إنك فهمتِ')} icon={HelpCircle} />
          <div className="space-y-3">{chapter.check.map((q, i) => <MCQ key={i} q_ar={q.q_ar} options={q.options} />)}</div>
        </section>
      )}

      {/* طبّقي */}
      {chapter.practice?.length > 0 && (
        <section className="desk-rise">
          <BeatHead eyebrow="DO IT" ar={g('طبّق', 'طبّقي')} icon={Dumbbell} />
          <div className="space-y-5">
            {chapter.practice.map((p, i) => {
              const Icon = (PMETA[p.type] || {}).icon || Sparkles
              return (
                <div key={i}>
                  {p.title_ar && (
                    <div className="flex items-center gap-2 mb-2.5 px-1">
                      <Icon size={15} style={{ color: 'var(--brass)' }} />
                      <h3 className="font-['Tajawal'] font-bold text-[15px]" style={{ color: 'var(--cream)' }}>{p.title_ar}</h3>
                    </div>
                  )}
                  {p.type === 'choose' && <MCQ q_ar={p.prompt_ar} options={p.options} />}
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
          <button onClick={() => markChapterDone(cls.id, chapter.id)} className="desk-cta w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Tajawal'] font-bold text-[14px]">
            <Check size={17} /> {next ? g('تمّت — للمحطة الجاية', 'تمّت — للمحطة الجاية') : g('تمّت المحطة', 'تمّت المحطة')}
          </button>
        ) : (
          <div className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Tajawal'] font-bold text-[14px]" style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.1)', border: '1px solid rgba(201,162,92,0.26)' }}>
            <CheckCircle2 size={17} /> {g('أنجزت هذي المحطة', 'أنجزتي هذي المحطة')}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 mt-4">
          {prev
            ? <Link to={`/desk/classes/${cls.id}/${prev.id}`} className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px] min-w-0" style={{ color: 'rgba(243,238,226,0.55)' }}><ArrowRight size={15} className="flex-shrink-0" /> <span className="truncate">{prev.ar}</span></Link>
            : <Link to={`/desk/classes/${cls.id}`} className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px]" style={{ color: 'rgba(243,238,226,0.55)' }}><ArrowRight size={15} /> {g('الخريطة', 'الخريطة')}</Link>}
          {next
            ? <Link to={`/desk/classes/${cls.id}/${next.id}`} onClick={() => markChapterDone(cls.id, chapter.id)} className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px] font-bold min-w-0 justify-end" style={{ color: 'var(--brass-hi)' }}><span className="truncate">{next.ar}</span> <ArrowLeft size={15} className="flex-shrink-0" /></Link>
            : <Link to={`/desk/classes/${cls.id}`} onClick={() => markChapterDone(cls.id, chapter.id)} className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px] font-bold" style={{ color: 'var(--brass-hi)' }}>{g('أنهِ المراجعة', 'أنهي المراجعة')} <ArrowLeft size={15} /></Link>}
        </div>
      </div>
    </div>
  )
}
