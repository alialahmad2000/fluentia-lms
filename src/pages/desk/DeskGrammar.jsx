// DeskGrammar — the grammar bank. "Rule of the day" pinned on top + the full bank
// of high-value points, each with a mastery state. English-primary, Arabic gloss.
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BookText, Check, ChevronRight, Star } from 'lucide-react'
import { DESK_GRAMMAR } from '@/data/desk/grammar'
import { useDailyProgress } from './useDailyProgress'
import './desk.css'

export default function DeskGrammar() {
  const rm = useReducedMotion()
  const { grammarToday, isGrammarDone, grammar } = useDailyProgress()

  return (
    <div className="space-y-7 max-w-[680px] mx-auto">
      <Link to="/desk/daily" className="inline-flex items-center gap-1.5 font-['Inter'] text-[13px] desk-rise" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.5)' }}><ArrowLeft size={15} /> Daily</Link>

      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-1.5"><BookText size={14} style={{ color: 'var(--brass)' }} /><span className="font-['Inter'] text-[12px] tracking-[0.2em]" dir="ltr" style={{ color: 'var(--brass)' }}>GRAMMAR</span></div>
        <h1 className="font-['Inter'] font-extrabold text-2xl lg:text-[30px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>Grammar bank</h1>
        <p className="font-['Inter'] text-[13.5px] mt-1.5 leading-relaxed" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.55)' }}>The grammar a working professional actually needs — one rule a day, the rest here whenever you want it.</p>
        <p className="font-['Inter'] text-[12.5px] mt-3" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{grammar.done} of {grammar.total} rules reviewed</p>
      </div>

      {/* rule of the day */}
      {grammarToday && (
        <motion.div initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="desk-rise">
          <Link to={`/desk/daily/grammar/${grammarToday.id}`} className="group desk-glass flex items-center gap-4 p-5" style={{ borderColor: 'rgba(56, 189, 248,0.26)' }}>
            <div className="desk-apply-mark" style={{ borderRadius: 14 }}><Star size={20} /></div>
            <div className="min-w-0 flex-1">
              <p className="font-['Inter'] text-[12px] font-bold tracking-[0.14em] mb-0.5" dir="ltr" style={{ color: 'var(--brass)' }}>RULE OF THE DAY</p>
              <h3 className="font-['Inter'] font-extrabold text-[16px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>{grammarToday.en}</h3>
              <p className="font-['Tajawal'] text-[12px] mt-0.5 truncate" style={{ color: 'rgba(238, 243, 251,0.45)' }}>{grammarToday.ar}</p>
            </div>
            <span className="desk-cta flex-shrink-0 inline-flex items-center gap-2 px-5 h-11 rounded-2xl font-['Inter'] font-bold text-[13px]" dir="ltr">Start <ArrowRight size={16} /></span>
          </Link>
        </motion.div>
      )}

      {/* the bank */}
      <div className="desk-rise">
        <p className="font-['Inter'] text-[12px] tracking-[0.2em] mb-3" dir="ltr" style={{ color: 'rgba(56, 189, 248,0.6)' }}>ALL RULES · {DESK_GRAMMAR.length}</p>
        <div className="space-y-2.5">
          {DESK_GRAMMAR.map((pt, i) => {
            const done = isGrammarDone(pt.id)
            return (
              <Link key={pt.id} to={`/desk/daily/grammar/${pt.id}`} className="group desk-glass p-4 flex items-center gap-3.5">
                <span className={`desk-gnum ${done ? 'done' : ''}`}>{done ? <Check size={14} strokeWidth={3} /> : i + 1}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-['Inter'] font-bold text-[15px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{pt.en}</h3>
                  <p className="font-['Tajawal'] text-[12px] mt-0.5" style={{ color: 'rgba(238, 243, 251,0.45)' }}>{pt.ar}</p>
                </div>
                <ChevronRight size={17} className="desk-lesson-chev flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
