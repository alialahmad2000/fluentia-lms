// DeskVocab — the daily spaced-repetition deck + the vault. The card the habit
// runs on: ~5 words/day (new + due reviews), flip to reveal, rate I-knew-it / remind-me.
// English-primary, Arabic kept as the meaning gloss.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Volume2, Check, RotateCcw, Sparkles, Layers, Search, CheckCircle2, Flame } from 'lucide-react'
import { DESK_VOCAB, getWord } from '@/data/desk/vocab'
import { useDailyProgress } from './useDailyProgress'
import './desk.css'

function speakEn(text) {
  try { if (!window.speechSynthesis || !text) return; window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.9; window.speechSynthesis.speak(u) } catch {}
}
const PlayBtn = ({ text, size = 14 }) => (
  <button onClick={(e) => { e.stopPropagation(); speakEn(text) }} className="desk-ghost-btn flex-shrink-0" aria-label="Listen"><Volume2 size={size} /></button>
)

// ── the SRS session ──
function Session({ rm }) {
  const { buildSession, rateWord, completeVocabDay, streak } = useDailyProgress()
  const [ids] = useState(() => buildSession())
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(ids.length === 0)

  const w = ids[idx] ? getWord(ids[idx]) : null
  const rate = (knew) => {
    rateWord(ids[idx], knew)
    if (idx + 1 < ids.length) { setIdx(idx + 1); setFlipped(false) }
    else { completeVocabDay(); setDone(true) }
  }

  if (done) {
    return (
      <div className="desk-glass p-8 text-center desk-rise" style={{ borderColor: 'rgba(56, 189, 248,0.24)' }}>
        <div className="desk-apply-mark mx-auto mb-4" style={{ borderRadius: 16 }}><CheckCircle2 size={22} /></div>
        <h2 className="font-['Inter'] font-extrabold text-xl" dir="ltr" style={{ color: 'var(--cream)' }}>{ids.length ? 'Today’s review done' : 'Nothing due today'}</h2>
        {ids.length > 0 && (
          <div className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full" style={{ background: 'rgba(56, 189, 248,0.1)', border: '1px solid rgba(56, 189, 248,0.24)' }}>
            <Flame size={16} style={{ color: 'var(--brass-hi)' }} />
            <span className="font-['Inter'] font-bold text-[14px]" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{streak}-day streak</span>
          </div>
        )}
        <p className="font-['Inter'] text-[13px] mt-4" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.55)' }}>Come back tomorrow to lock in what you learned.</p>
        <Link to="/desk/daily" className="inline-flex items-center gap-1.5 mt-4 font-['Inter'] text-[13px] font-bold" dir="ltr" style={{ color: 'var(--brass)' }}>Back to Daily <ArrowRight size={14} /></Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* progress */}
      <div className="flex items-center gap-3">
        <div dir="ltr" className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div className="h-full rounded-full" initial={false} animate={{ width: `${(idx / ids.length) * 100}%` }} style={{ background: 'linear-gradient(90deg,#38bdf8,#7dd3fc)' }} />
        </div>
        <span className="font-['Inter'] text-[13px] font-bold tabular-nums" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{idx + 1} / {ids.length}</span>
      </div>

      {/* card */}
      <button onClick={() => setFlipped((f) => !f)} className="desk-vocab-card w-full">
        <AnimatePresence mode="wait">
          {!flipped ? (
            <motion.div key="front" initial={rm ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex flex-col items-center justify-center gap-2 py-4">
              <p className="font-['Inter'] font-bold text-[30px] leading-none" dir="ltr" style={{ color: 'var(--cream)' }}>{w.word}</p>
              <p className="font-['Inter'] text-[13px]" dir="ltr" style={{ color: 'rgba(56, 189, 248,0.7)' }}>/{w.ipa}/ · {w.pos}</p>
              <PlayBtn text={w.word} size={16} />
              <p className="font-['Inter'] text-[12px] mt-2" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.4)' }}>Tap to see the meaning</p>
            </motion.div>
          ) : (
            <motion.div key="back" initial={rm ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex flex-col items-center gap-2.5 py-2 text-center">
              <p className="font-['Tajawal'] font-extrabold text-[19px]" style={{ color: 'var(--brass-hi)' }}>{w.ar}</p>
              <div className="desk-hair w-full pt-3 mt-1">
                <div className="flex items-start justify-center gap-2">
                  <p className="font-['Inter'] text-[15.5px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{w.example}</p>
                  <PlayBtn text={w.example} />
                </div>
                <p className="font-['Tajawal'] text-[12.5px] mt-1.5" style={{ color: 'rgba(238, 243, 251,0.55)' }}>{w.example_ar}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* rate */}
      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => rate(false)} className="desk-rate-btn dim" dir="ltr"><RotateCcw size={16} /> Remind me</button>
          <button onClick={() => rate(true)} className="desk-rate-btn good" dir="ltr"><Check size={17} /> I knew it</button>
        </div>
      ) : (
        <button onClick={() => setFlipped(true)} className="desk-cta w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Inter'] font-bold text-[14px]" dir="ltr"><Sparkles size={16} /> Flip card</button>
      )}
    </div>
  )
}

// ── the vault (browse all) ──
function Vault() {
  const { wordState } = useDailyProgress()
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const list = useMemo(() => DESK_VOCAB.filter((w) => !query || w.word.toLowerCase().includes(query) || (w.ar || '').includes(q.trim())), [query, q])
  const badge = (w) => {
    const st = wordState(w.id)
    if (!st?.seen) return { t: 'New', c: 'rgba(238, 243, 251,0.45)', b: 'rgba(255,255,255,0.06)' }
    if ((st.box || 0) >= 4) return { t: 'Mastered', c: 'var(--brass-hi)', b: 'rgba(56, 189, 248,0.14)' }
    return { t: 'Learning', c: 'rgba(169,231,201,0.9)', b: 'rgba(110,231,183,0.1)' }
  }
  return (
    <div className="space-y-3">
      <div className="desk-glass flex items-center gap-2.5 px-4 h-12">
        <Search size={16} style={{ color: 'rgba(238, 243, 251,0.4)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your words…" dir="ltr" className="flex-1 bg-transparent outline-none font-['Inter'] text-[14px] text-start" style={{ color: 'var(--cream)' }} />
      </div>
      {list.map((w) => {
        const bd = badge(w)
        return (
          <div key={w.id} className="desk-glass p-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-['Inter'] text-[16px] font-semibold" dir="ltr" style={{ color: 'var(--cream)' }}>{w.word}</p>
                <span className="font-['Inter'] text-[10.5px] font-bold px-2 py-0.5 rounded-full" dir="ltr" style={{ color: bd.c, background: bd.b }}>{bd.t}</span>
              </div>
              <p className="font-['Tajawal'] text-[13px] mt-0.5" style={{ color: 'var(--brass-hi)' }}>{w.ar}</p>
              <p className="font-['Inter'] text-[12.5px] mt-1.5" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.5)' }}>{w.example}</p>
            </div>
            <PlayBtn text={w.word} />
          </div>
        )
      })}
    </div>
  )
}

export default function DeskVocab() {
  const rm = useReducedMotion()
  const { vocab } = useDailyProgress()
  const [tab, setTab] = useState('session')

  return (
    <div className="space-y-7 max-w-[640px] mx-auto">
      <Link to="/desk/daily" className="inline-flex items-center gap-1.5 font-['Inter'] text-[13px] desk-rise" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.5)' }}><ArrowLeft size={15} /> Daily</Link>

      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-1.5"><Layers size={14} style={{ color: 'var(--brass)' }} /><span className="font-['Inter'] text-[12px] tracking-[0.2em]" dir="ltr" style={{ color: 'var(--brass)' }}>VOCABULARY</span></div>
        <h1 className="font-['Inter'] font-extrabold text-2xl lg:text-[30px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>Vocabulary</h1>
        <p className="font-['Inter'] text-[13.5px] mt-1.5 leading-relaxed" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.55)' }}>Review with spaced repetition — each word comes back at just the right time so it sticks.</p>
        <div className="flex items-center gap-4 mt-3 font-['Inter'] text-[12.5px]" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.5)' }}>
          <span><span style={{ color: 'var(--brass-hi)', fontWeight: 700 }}>{vocab.mastered}</span> mastered</span>
          <span><span style={{ color: 'rgba(169,231,201,0.9)', fontWeight: 700 }}>{vocab.learning}</span> learning</span>
          <span><span style={{ fontWeight: 700 }}>{vocab.total}</span> total</span>
        </div>
      </div>

      {/* tabs */}
      <div className="desk-seg desk-rise">
        <button onClick={() => setTab('session')} className={tab === 'session' ? 'is-active' : ''} dir="ltr">Today’s review</button>
        <button onClick={() => setTab('vault')} className={tab === 'vault' ? 'is-active' : ''} dir="ltr">Vault</button>
      </div>

      <div className="desk-rise">
        {tab === 'session' ? <Session rm={rm} /> : <Vault />}
      </div>
    </div>
  )
}
