// DeskPhrasebook (دفتري) — her personal work-English phrasebank in one place:
// «من مكالماتك» = the "you said X → a native says Y" lines the roleplay grader gave her
// (from her own calls), and «عبارات المسار» = every useful line + when-to-use across her
// scenarios. Searchable, each line speakable. Creditless: authored phrases + her own grades.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, NotebookPen, Volume2, Search, ArrowRight, PhoneCall } from 'lucide-react'
import { useDeskModules } from './useDeskModules'
import { useDeskInsights } from './useDeskInsights'
import './desk.css'

function speakEn(text) {
  try {
    if (!window.speechSynthesis || !text) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'; u.rate = 0.95
    window.speechSynthesis.speak(u)
  } catch { /* Web Speech unavailable — silent */ }
}

const PlayBtn = ({ text }) => (
  <button onClick={() => speakEn(text)} className="desk-ghost-btn flex-shrink-0" aria-label="Listen"><Volume2 size={14} /></button>
)

export default function DeskPhrasebook() {
  const { data: modData, isLoading: l1 } = useDeskModules()
  const { data: ins, isLoading: l2 } = useDeskInsights()
  const [q, setQ] = useState('')

  const modules = modData?.modules || []
  const better = ins?.betterExpressions || []
  const query = q.trim().toLowerCase()
  const match = (...vals) => !query || vals.some((v) => (v || '').toLowerCase().includes(query))

  const groups = useMemo(() => modules.map((m) => ({
    id: m.id, number: m.module_number, title: m.title_en || m.title_ar,
    phrases: (Array.isArray(m.phrases) ? m.phrases : []).filter((p) => match(p.en, p.ar, p.context_ar)),
  })).filter((g) => g.phrases.length), [modules, query])

  const betterF = useMemo(() => better.filter((b) => match(b.basic, b.natural, b.context)), [better, query])

  if (l1 || l2) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin" style={{ color: 'var(--brass)' }} /></div>

  const totalPhrases = modules.reduce((n, m) => n + (Array.isArray(m.phrases) ? m.phrases.length : 0), 0)
  const nothing = groups.length === 0 && betterF.length === 0

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-1.5">
          <NotebookPen size={14} style={{ color: 'var(--brass)' }} />
          <span className="font-['Inter'] text-[11px] tracking-[0.2em]" dir="ltr" style={{ color: 'var(--brass)' }}>MY PHRASEBOOK</span>
        </div>
        <h1 className="font-['Inter'] font-extrabold text-2xl lg:text-[30px]" dir="ltr" style={{ color: 'var(--cream)' }}>My Phrasebook</h1>
        <p className="font-['Tajawal'] text-[13px] mt-1" style={{ color: 'rgba(238, 243, 251,0.5)' }}>دفتري</p>
        <p className="font-['Inter'] text-[14px] mt-1.5" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.55)' }}>Your professional lines — from your own calls and your track, in one place. Tap 🔊 to hear them.</p>
      </div>

      {/* search */}
      <div className="desk-glass flex items-center gap-2.5 px-4 h-12">
        <Search size={16} style={{ color: 'rgba(238, 243, 251,0.4)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your lines…"
          className="flex-1 bg-transparent outline-none font-['Inter'] text-[14px]"
          style={{ color: 'var(--cream)' }} />
      </div>

      {nothing && (
        <div className="desk-glass p-8 text-center desk-rise">
          <p className="font-['Inter'] font-bold text-[15px]" dir="ltr" style={{ color: 'var(--cream)' }}>No results for “{q}”</p>
          <button onClick={() => setQ('')} className="font-['Inter'] text-[13px] mt-2" style={{ color: 'var(--brass)' }}>Clear search</button>
        </div>
      )}

      {/* من مكالماتك — her own corrected lines */}
      {betterF.length > 0 && (
        <div className="desk-rise">
          <div className="flex items-center gap-2 mb-3">
            <PhoneCall size={15} style={{ color: 'var(--brass)' }} />
            <h2 className="font-['Inter'] font-bold text-[16px]" dir="ltr" style={{ color: 'var(--cream)' }}>From your calls</h2>
            <span className="font-['Tajawal'] text-[11px] px-2 py-0.5 rounded-full" style={{ color: 'var(--brass)', background: 'rgba(56, 189, 248,0.10)' }}>{betterF.length}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {betterF.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="desk-glass p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0" dir="ltr">
                    <p className="font-['Inter'] text-[12px] line-through" style={{ color: 'rgba(255,180,164,0.65)' }}>{b.basic}</p>
                    <p className="font-['Inter'] text-[15px] font-semibold leading-snug mt-1" style={{ color: 'var(--cream)' }}>{b.natural}</p>
                  </div>
                  <PlayBtn text={b.natural} />
                </div>
                {b.context && <p className="font-['Tajawal'] text-[11px] mt-2 pt-2 desk-hair" style={{ color: 'rgba(56, 189, 248,0.7)' }}>{b.context}</p>}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* عبارات المسار — the track phrase library, by scenario */}
      {groups.length > 0 && (
        <div className="desk-rise space-y-5">
          <div className="flex items-center gap-2">
            <NotebookPen size={15} style={{ color: 'var(--brass)' }} />
            <h2 className="font-['Inter'] font-bold text-[16px]" dir="ltr" style={{ color: 'var(--cream)' }}>Track phrases</h2>
            {!query && <span className="font-['Inter'] text-[11px]" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.4)' }}>{totalPhrases} phrases</span>}
          </div>
          {groups.map((g) => (
            <div key={g.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-['Inter'] font-black text-[10px] w-6 h-6 grid place-items-center rounded-md" style={{ color: '#052033', background: 'linear-gradient(135deg,#7dd3fc,#38bdf8)' }}>{String(g.number).padStart(2, '0')}</span>
                <h3 className="font-['Inter'] font-bold text-[13px]" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.72)' }}>{g.title}</h3>
              </div>
              <div className="space-y-2">
                {g.phrases.map((p, i) => (
                  <div key={i} className="desk-glass p-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-['Inter'] text-[14px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{p.en}</p>
                      <p className="font-['Tajawal'] text-[12px] mt-1" style={{ color: 'rgba(238, 243, 251,0.55)' }}>{p.ar}</p>
                      {p.context_ar && <p className="font-['Tajawal'] text-[11px] mt-1" style={{ color: 'rgba(56, 189, 248,0.65)' }}><span className="font-['Inter']" dir="ltr">When?</span> {p.context_ar}</p>}
                    </div>
                    <PlayBtn text={p.en} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* truly empty (no scenarios assigned yet) */}
      {!nothing && groups.length === 0 && betterF.length === 0 && (
        <div className="desk-glass p-8 text-center desk-rise">
          <p className="font-['Inter'] font-bold" dir="ltr" style={{ color: 'var(--cream)' }}>Your phrasebook fills up with every scenario</p>
          <Link to="/desk/scenarios" className="inline-flex items-center gap-1.5 mt-2 font-['Inter'] text-sm" style={{ color: 'var(--brass)' }}>Start from scenarios <ArrowRight size={14} /></Link>
        </div>
      )}
    </div>
  )
}
