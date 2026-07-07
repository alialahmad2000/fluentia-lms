// DeskClasses (My Classes) — the list of class debriefs. Each live 1-on-1 class,
// distilled + drillable. Newest first, over the Operations Room. Creditless.
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { GraduationCap, ArrowRight, Layers, Check, ChevronRight, CalendarDays } from 'lucide-react'
import { ALL_CLASSES } from '@/data/desk/classes'
import { useClassProgress } from './useClassProgress'
import './desk.css'

function fmtDate(d) {
  // d = 'YYYY-MM-DD' → "Jul 4" (stable, no Date() needed for the label)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const [, m, day] = (d || '').split('-')
  const mi = parseInt(m, 10) - 1
  return mi >= 0 && mi < 12 ? `${months[mi]} ${parseInt(day, 10)}` : d
}

export default function DeskClasses() {
  const rm = useReducedMotion()
  const { isClassDone, classProgress, done, total } = useClassProgress()

  return (
    <div className="space-y-8">
      {/* masthead */}
      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-1.5">
          <GraduationCap size={14} style={{ color: 'var(--brass)' }} />
          <span className="font-['Inter'] text-[11px] tracking-[0.22em]" dir="ltr" style={{ color: 'var(--brass)' }}>MY CLASSES</span>
        </div>
        <h1 className="font-['Inter'] font-extrabold text-2xl lg:text-[32px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>My Classes</h1>
        <p className="font-['Inter'] text-[14px] mt-2 max-w-[560px]" dir="ltr" style={{ color: 'rgba(243,238,226,0.58)' }}>
          Every class with your trainer, saved and organised — review it, check that it stuck, and practise what you took away.
        </p>
        {total > 0 && (
          <p className="font-['Inter'] text-[12.5px] mt-3" dir="ltr" style={{ color: 'var(--brass-hi)' }}>
            {done} of {total} {total === 1 ? 'class' : 'classes'} reviewed
          </p>
        )}
      </div>

      {/* class list */}
      <div className="space-y-4">
        {ALL_CLASSES.map((c, i) => {
          const reviewed = isClassDone(c.id)
          const cp = classProgress(c)
          return (
            <motion.div key={c.id} initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ease: [0.16, 1, 0.3, 1], delay: Math.min(i * 0.05, 0.3) }}>
              <Link to={`/desk/classes/${c.id}`} className="group desk-glass desk-class-card overflow-hidden flex items-stretch">
                {/* number rail */}
                <div className="desk-class-rail">
                  <span className="font-['Inter'] font-black text-[15px]" dir="ltr">{String(c.number).padStart(2, '0')}</span>
                  <span className="font-['Inter'] text-[10px] tracking-[0.14em] uppercase" dir="ltr" style={{ color: 'rgba(26,19,8,0.62)' }}>Class</span>
                </div>
                {/* body */}
                <div className="flex-1 min-w-0 p-6 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="font-['Inter'] font-extrabold text-[16px] lg:text-[18px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>{c.title_en}</h2>
                      {reviewed && (
                        <span className="inline-flex items-center gap-1 font-['Inter'] text-[11px] px-2 py-0.5 rounded-full" dir="ltr" style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.12)', border: '1px solid rgba(201,162,92,0.3)' }}>
                          <Check size={11} strokeWidth={3} /> Reviewed
                        </span>
                      )}
                    </div>
                    {c.title_ar && <p className="font-['Tajawal'] text-[12px] mb-2" style={{ color: 'rgba(243,238,226,0.45)' }}>{c.title_ar}</p>}
                    <p className="font-['Inter'] text-[12.5px] leading-relaxed line-clamp-2" dir="ltr" style={{ color: 'rgba(243,238,226,0.55)' }}>{c.tagline_en}</p>
                    <div className="flex items-center gap-3.5 mt-3">
                      <span className="inline-flex items-center gap-1.5 font-['Inter'] text-[11.5px]" dir="ltr" style={{ color: 'rgba(243,238,226,0.42)' }}><CalendarDays size={12} /> {fmtDate(c.date)}</span>
                      <span className="inline-flex items-center gap-1.5 font-['Inter'] text-[11.5px]" dir="ltr" style={{ color: 'rgba(243,238,226,0.42)' }}><Layers size={12} /> {c.chapters.length} {c.chapters.length === 1 ? 'station' : 'stations'}</span>
                    </div>
                    {cp.done > 0 && !reviewed && (
                      <div className="flex items-center gap-2.5 mt-2.5">
                        <div dir="ltr" className="flex-1 h-1.5 rounded-full overflow-hidden max-w-[180px]" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <div className="h-full rounded-full" style={{ width: `${cp.pct}%`, background: 'linear-gradient(90deg,#c9a25c,#efd299)' }} />
                        </div>
                        <span className="font-['Inter'] text-[11px] font-bold tabular-nums" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{cp.done}/{cp.total}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={20} className="desk-lesson-chev flex-shrink-0" />
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {ALL_CLASSES.length === 0 && (
        <div className="desk-glass p-8 text-center desk-rise">
          <GraduationCap size={28} className="mx-auto mb-3" style={{ color: 'var(--brass)' }} />
          <p className="font-['Inter'] font-bold text-[15px]" dir="ltr" style={{ color: 'var(--cream)' }}>Your first class will appear here</p>
          <p className="font-['Inter'] text-[13px] mt-1.5" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>After each class, we'll drop its summary and exercises right here.</p>
        </div>
      )}

      {/* tie back to the track */}
      <div className="desk-glass p-6 flex items-center justify-between gap-4 desk-rise">
        <div className="min-w-0">
          <p className="font-['Inter'] font-bold text-[14px]" dir="ltr" style={{ color: 'var(--cream)' }}>Want to go further?</p>
          <p className="font-['Inter'] text-[12.5px] mt-0.5" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>Your career track has lessons that build on top of your classes.</p>
        </div>
        <Link to="/desk/track" className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl font-['Inter'] font-bold text-[13px]" dir="ltr"
          style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.10)', border: '1px solid rgba(201,162,92,0.24)' }}>
          Track <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}
