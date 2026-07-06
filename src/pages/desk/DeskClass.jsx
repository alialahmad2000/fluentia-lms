// DeskClass — the class OVERVIEW: a study map of the class's STATIONS (محطات).
// A progress ring hero + the chapters as a connected journey (each showing its
// three beats: افهمي · تأكّدي · طبّقي, lit when the station is done) + the golden
// takeaways. Distinct from المسار — this reads like her class syllabus.
import { useParams, Navigate, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { GraduationCap, ArrowRight, ArrowLeft, Clock, Check, ChevronLeft, Award, Lightbulb, HelpCircle, Dumbbell, AlignRight, UserRound, Activity, History, Wrench, Sparkles } from 'lucide-react'
import { useG } from '@/i18n/gender'
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
        <defs><linearGradient id="deskClassGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#efd299" /><stop offset="1" stopColor="#c9a25c" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        {allDone
          ? <Award size={30} style={{ color: 'var(--brass-hi)' }} />
          : <div className="text-center leading-none"><span className="font-['Inter'] font-black text-[22px]" style={{ color: 'var(--cream)' }}>{done}</span><span className="font-['Inter'] text-[13px]" style={{ color: 'rgba(243,238,226,0.5)' }}>/{total}</span></div>}
      </div>
    </div>
  )
}

export default function DeskClass() {
  const { classId } = useParams()
  const g = useG()
  const rm = useReducedMotion()
  const cls = getClass(classId)
  const { isChapterDone, classProgress } = useClassProgress()

  if (!cls) return <Navigate to="/desk/classes" replace />
  const prog = classProgress(cls)

  return (
    <div className="space-y-12 max-w-[720px] mx-auto">
      <Link to="/desk/classes" className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px] desk-rise" style={{ color: 'rgba(243,238,226,0.5)' }}>
        <ArrowRight size={15} /> {g('حصصي', 'حصصي')}
      </Link>

      {/* hero — progress ring + class title */}
      <motion.div initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1] }}
        className="desk-glass p-6 flex items-center gap-5" style={{ borderColor: 'rgba(201,162,92,0.2)' }}>
        <ProgressRing pct={prog.pct} done={prog.done} total={prog.total} allDone={prog.allDone} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap size={13} style={{ color: 'var(--brass)' }} />
            <span className="font-['Tajawal'] text-[12px] font-bold" style={{ color: 'var(--brass)' }}>{g('الحصة', 'الحصة')} {cls.number}</span>
          </div>
          <h1 className="font-['Tajawal'] font-extrabold text-[22px] lg:text-[26px] leading-tight" style={{ color: 'var(--cream)' }}>{cls.title_ar}</h1>
          <p className="font-['Tajawal'] text-[13px] mt-2 leading-relaxed" style={{ color: 'rgba(243,238,226,0.55)' }}>
            {prog.allDone ? g('أنهيت مراجعة الحصة — عمل ممتاز.', 'أنهيتِ مراجعة الحصة — عمل ممتاز.') : prog.current ? `${g('تابع من:', 'تابعي من:')} ${prog.current.ar}` : cls.tagline_ar}
          </p>
        </div>
      </motion.div>

      {/* continue button */}
      {prog.current && (
        <Link to={`/desk/classes/${cls.id}/${prog.current.id}`} className="desk-cta -mt-3 w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl font-['Tajawal'] font-bold text-[14px] desk-rise">
          {prog.done === 0 ? g('ابدأ المراجعة', 'ابدئي المراجعة') : g('تابع من هنا', 'تابعي من هنا')} <ArrowLeft size={16} />
        </Link>
      )}

      {/* station journey */}
      <div>
        <p className="font-['Inter'] text-[12px] tracking-[0.2em] mb-4 desk-rise" dir="ltr" style={{ color: 'rgba(201,162,92,0.6)' }}>STATIONS · {cls.chapters.length}</p>
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
                      <h3 className="font-['Tajawal'] font-bold text-[15px] leading-snug" style={{ color: 'var(--cream)' }}>
                        <span className="font-['Inter'] font-black text-[12px] ms-1" dir="ltr" style={{ color: 'var(--brass)' }}>{i + 1}</span> {ch.ar}
                      </h3>
                      {isCurrent && <span className="font-['Tajawal'] text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ color: '#1a130a', background: 'linear-gradient(135deg,#efd299,#c9a25c)' }}>{g('تابع من هنا', 'تابعي من هنا')}</span>}
                    </div>
                    <p className="font-['Inter'] text-[12px] mt-0.5 mb-2" dir="ltr" style={{ color: 'rgba(243,238,226,0.42)' }}>{ch.en}</p>
                    <p className="font-['Tajawal'] text-[12.5px] leading-relaxed line-clamp-2" style={{ color: 'rgba(243,238,226,0.6)' }}>{ch.goal_ar}</p>
                    {/* the three beats */}
                    <div className="flex items-center gap-3.5 mt-3">
                      <span className={`desk-beatdot ${done ? 'lit' : ''}`}><Lightbulb size={12} /> {g('افهم', 'افهمي')}</span>
                      {parts.check && <span className={`desk-beatdot ${done ? 'lit' : ''}`}><HelpCircle size={12} /> {g('تأكّد', 'تأكّدي')}</span>}
                      {parts.practice && <span className={`desk-beatdot ${done ? 'lit' : ''}`}><Dumbbell size={12} /> {g('طبّق', 'طبّقي')}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between self-stretch gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 font-['Tajawal'] text-[12px]" style={{ color: 'rgba(243,238,226,0.42)' }}><Clock size={12} /> {ch.minutes} {g('د', 'د')}</span>
                    <ChevronLeft size={18} className="desk-lesson-chev" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* خلاصة ذهبية */}
      {cls.takeaways_ar?.length > 0 && (
        <section className="desk-rise">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="desk-lesson-sec-mark"><Award size={16} /></span>
            <div>
              <p className="font-['Inter'] text-[12px] tracking-[0.18em]" dir="ltr" style={{ color: 'rgba(201,162,92,0.62)' }}>GOLDEN TAKEAWAYS</p>
              <h2 className="font-['Tajawal'] font-extrabold text-[20px] leading-tight mt-0.5" style={{ color: 'var(--cream)' }}>خلاصة ذهبية</h2>
            </div>
          </div>
          <div className="desk-glass p-6 space-y-2.5" style={{ borderColor: 'rgba(201,162,92,0.22)' }}>
            {cls.takeaways_ar.map((t, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="desk-gold-dot">{i + 1}</span>
                <p className="font-['Tajawal'] text-[14px] font-bold leading-relaxed" style={{ color: 'var(--cream)' }}>{t}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
