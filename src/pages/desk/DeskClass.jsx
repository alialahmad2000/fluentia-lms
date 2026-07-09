// DeskClass — the class OVERVIEW: a study map of the class's STATIONS.
// A progress ring hero + the chapters as a connected journey (each showing its
// three beats: Understand · Check · Practice, lit when the station is done) + the
// golden takeaways. Distinct from the Track — this reads like her class syllabus.
import { useParams, Navigate, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { GraduationCap, ArrowLeft, ArrowRight, Clock, Check, ChevronRight, Award, Lightbulb, HelpCircle, Dumbbell, AlignRight, UserRound, Activity, History, Wrench, Sparkles } from 'lucide-react'
import { getClass, chapterParts } from '@/data/desk/classes'
import { useClassProgress } from './useClassProgress'
import './desk.css'

const CHAPTER_ICONS = { AlignRight, UserRound, Activity, History, HelpCircle, Wrench, Sparkles }

function ProgressRing({ pct, done, total, allDone }) {
  const rm = useReducedMotion()
  const R = 34, C = 2 * Math.PI * R
  const off = C * (1 - pct / 100)
  return (
    <div className="relative" style={{ width: 92, height: 92 }}>
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
        <motion.circle cx="46" cy="46" r={R} fill="none" stroke="url(#deskClassGrad)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} initial={{ strokeDashoffset: rm ? off : C }} animate={{ strokeDashoffset: off }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} transform="rotate(-90 46 46)" />
        <defs><linearGradient id="deskClassGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7dd3fc" /><stop offset="1" stopColor="#38bdf8" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {allDone
          ? <Award size={30} style={{ color: 'var(--brass-hi)' }} />
          : <div className="text-center leading-none"><span className="font-['Inter'] font-black text-[22px]" style={{ color: 'var(--cream)' }}>{done}</span><span className="font-['Inter'] text-[13px]" style={{ color: 'rgba(238, 243, 251,0.5)' }}>/{total}</span></div>}
      </div>
    </div>
  )
}

export default function DeskClass() {
  const { classId } = useParams()
  const rm = useReducedMotion()
  const cls = getClass(classId)
  const { isChapterDone, classProgress } = useClassProgress()

  if (!cls) return <Navigate to="/desk/classes" replace />
  const prog = classProgress(cls)

  return (
    <div className="space-y-12 max-w-[720px] mx-auto">
      <Link to="/desk/classes" className="inline-flex items-center gap-1.5 font-['Inter'] text-[13px] desk-rise" style={{ color: 'rgba(238, 243, 251,0.5)' }}>
        <ArrowLeft size={15} /> My Classes
      </Link>

      {/* hero — progress ring + class title */}
      <motion.div initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1] }}
        className="desk-glass p-6 flex items-center gap-5" style={{ borderColor: 'rgba(56, 189, 248,0.2)' }}>
        <ProgressRing pct={prog.pct} done={prog.done} total={prog.total} allDone={prog.allDone} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap size={13} style={{ color: 'var(--brass)' }} />
            <span className="font-['Inter'] text-[11px] tracking-[0.18em] uppercase" dir="ltr" style={{ color: 'var(--brass)' }}>Class {cls.number}</span>
          </div>
          <h1 className="font-['Inter'] font-extrabold text-[22px] lg:text-[26px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>{cls.title_en}</h1>
          {cls.title_ar && <p className="font-['Tajawal'] text-[13px] mt-1" style={{ color: 'rgba(238, 243, 251,0.42)' }}>{cls.title_ar}</p>}
          <p className="font-['Inter'] text-[13px] mt-2 leading-relaxed" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.55)' }}>
            {prog.allDone ? 'You have finished reviewing this class — great work.' : prog.current ? `Continue from: ${prog.current.en}` : cls.tagline_en}
          </p>
        </div>
      </motion.div>

      {/* continue button */}
      {prog.current && (
        <Link to={`/desk/classes/${cls.id}/${prog.current.id}`} className="desk-cta -mt-3 w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Inter'] font-bold text-[14px] desk-rise" dir="ltr">
          {prog.done === 0 ? 'Start review' : 'Continue here'} <ArrowRight size={16} />
        </Link>
      )}

      {/* station journey */}
      <div>
        <p className="font-['Inter'] text-[12px] tracking-[0.2em] mb-4 desk-rise" dir="ltr" style={{ color: 'rgba(56, 189, 248,0.6)' }}>STATIONS · {cls.chapters.length}</p>
        <div className="desk-track-lessons">
          {cls.chapters.map((ch, i) => {
            const Icon = CHAPTER_ICONS[ch.icon] || Sparkles
            const done = isChapterDone(cls.id, ch.id)
            const isCurrent = prog.current?.id === ch.id
            const prevDone = i === 0 ? true : isChapterDone(cls.id, cls.chapters[i - 1].id)
            const parts = chapterParts(ch)
            return (
              <Link key={ch.id} to={`/desk/classes/${cls.id}/${ch.id}`} className="group desk-lesson-row">
                <div className="desk-lesson-spine">
                  {i > 0 && <span className={`desk-lesson-line top ${prevDone ? 'is-lit' : ''}`} />}
                  {i < cls.chapters.length - 1 && <span className={`desk-lesson-line bottom ${done ? 'is-lit' : ''}`} />}
                  <span className={`desk-lesson-node ${done ? 'is-done' : isCurrent ? 'is-current' : ''}`}>
                    {done ? <Check size={13} strokeWidth={3} /> : <Icon size={14} />}
                  </span>
                </div>
                <div className={`desk-lesson-card ${isCurrent ? 'is-current' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-['Inter'] font-bold text-[15px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>
                        <span className="font-['Inter'] font-black text-[12px] me-1" style={{ color: 'var(--brass)' }}>{i + 1}</span> {ch.en}
                      </h3>
                      {isCurrent && <span className="font-['Inter'] text-[12px] font-bold px-2.5 py-1 rounded-full" dir="ltr" style={{ color: '#052033', background: 'linear-gradient(135deg,#7dd3fc,#38bdf8)' }}>Continue here</span>}
                    </div>
                    {ch.ar && <p className="font-['Tajawal'] text-[12px] mt-0.5 mb-2" style={{ color: 'rgba(238, 243, 251,0.42)' }}>{ch.ar}</p>}
                    <p className="font-['Inter'] text-[12.5px] leading-relaxed line-clamp-2" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.6)' }}>{ch.goal_en}</p>
                    {/* the three beats */}
                    <div className="flex items-center gap-3.5 mt-3">
                      <span className={`desk-beatdot ${done ? 'lit' : ''}`} dir="ltr"><Lightbulb size={12} /> Understand</span>
                      {parts.check && <span className={`desk-beatdot ${done ? 'lit' : ''}`} dir="ltr"><HelpCircle size={12} /> Check</span>}
                      {parts.practice && <span className={`desk-beatdot ${done ? 'lit' : ''}`} dir="ltr"><Dumbbell size={12} /> Practice</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between self-stretch gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 font-['Inter'] text-[12px]" dir="ltr" style={{ color: 'rgba(238, 243, 251,0.42)' }}><Clock size={12} /> {ch.minutes} min</span>
                    <ChevronRight size={18} className="desk-lesson-chev" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* golden takeaways */}
      {cls.takeaways_en?.length > 0 && (
        <section className="desk-rise">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="desk-lesson-sec-mark"><Award size={16} /></span>
            <div>
              <p className="font-['Inter'] text-[12px] tracking-[0.18em]" dir="ltr" style={{ color: 'rgba(190, 214, 236,0.5)' }}>GOLDEN TAKEAWAYS</p>
              <h2 className="font-['Inter'] font-extrabold text-[20px] leading-tight mt-0.5" dir="ltr" style={{ color: 'var(--cream)' }}>Key takeaways</h2>
            </div>
          </div>
          <div className="desk-glass p-6 space-y-2.5" style={{ borderColor: 'rgba(56, 189, 248,0.22)' }}>
            {cls.takeaways_en.map((t, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="desk-gold-dot">{i + 1}</span>
                <p className="font-['Inter'] text-[14px] font-bold leading-relaxed" dir="ltr" style={{ color: 'var(--cream)' }}>{t}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
