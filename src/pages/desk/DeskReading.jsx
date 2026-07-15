// DeskReading — the standalone Reading section: short IT-field passages نورة reads to
// build professional reading + vocabulary. English-primary, Arabic small glosses.
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { BookOpen, Clock, Check, ChevronRight, ArrowRight } from 'lucide-react'
import { DESK_READING } from '@/data/desk/reading'
import { useReadingProgress } from './useReadingProgress'
import './desk.css'

export default function DeskReading() {
  const rm = useReducedMotion()
  const { isDone, done, total, next } = useReadingProgress()

  return (
    <div className="space-y-7 max-w-[720px] mx-auto">
      {/* masthead */}
      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-1.5"><BookOpen size={14} style={{ color: 'var(--brass)' }} /><span className="font-['Hanken_Grotesk'] text-[12px] tracking-[0.2em]" dir="ltr" style={{ color: 'var(--brass)' }}>READING</span></div>
        <h1 className="font-['Hanken_Grotesk'] font-extrabold text-2xl lg:text-[30px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>Reading in your field</h1>
        <p className="font-['Hanken_Grotesk'] text-[13.5px] mt-1.5 leading-relaxed max-w-[560px]" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.58)' }}>Short passages from real IT work — incidents, on-call, deploys, cloud, security. Read, learn the key terms, then check yourself.</p>
        <p className="font-['Tajawal'] text-[12.5px] mt-1" style={{ color: 'rgba(240, 234, 224,0.54)' }}>القراءة في مجالك — نصوص تقنية قصيرة</p>
        <p className="font-['Hanken_Grotesk'] text-[12.5px] mt-3" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{done} of {total} read</p>
      </div>

      {/* continue */}
      {next && (
        <motion.div initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="desk-rise">
          <Link to={`/desk/reading/${next.id}`} className="group desk-glass flex items-center gap-4 p-5" style={{ borderColor: 'rgba(239, 106, 67,0.26)' }}>
            <div className="desk-apply-mark" style={{ borderRadius: 14 }}><BookOpen size={20} /></div>
            <div className="min-w-0 flex-1">
              <p className="font-['Hanken_Grotesk'] text-[11px] font-bold tracking-[0.14em] mb-0.5" dir="ltr" style={{ color: 'var(--brass)' }}>{done === 0 ? 'START READING' : 'READ NEXT'}</p>
              <h3 className="font-['Hanken_Grotesk'] font-extrabold text-[16px] leading-tight truncate" dir="ltr" style={{ color: 'var(--cream)' }}>{next.title}</h3>
              <p className="font-['Hanken_Grotesk'] text-[12px] mt-0.5" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.62)' }}>{next.level} · {next.minutes} min · {next.topic}</p>
            </div>
            <span className="desk-cta flex-shrink-0 inline-flex items-center gap-2 px-5 h-11 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[13px]" dir="ltr">Read <ArrowRight size={16} /></span>
          </Link>
        </motion.div>
      )}

      {/* library */}
      <div className="desk-rise">
        <p className="font-['Hanken_Grotesk'] text-[12px] tracking-[0.2em] mb-3" dir="ltr" style={{ color: 'rgba(239, 106, 67,0.6)' }}>ALL PASSAGES · {DESK_READING.length}</p>
        <div className="space-y-2.5">
          {DESK_READING.map((r) => {
            const dn = isDone(r.id)
            return (
              <Link key={r.id} to={`/desk/reading/${r.id}`} className="group desk-glass p-4 flex items-center gap-3.5">
                <span className={`desk-gnum ${dn ? 'done' : ''}`}>{dn ? <Check size={14} strokeWidth={3} /> : r.order}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-['Hanken_Grotesk'] font-bold text-[15px] leading-snug truncate" dir="ltr" style={{ color: 'var(--cream)' }}>{r.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5 font-['Hanken_Grotesk'] text-[11.5px]" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.56)' }}>
                    <span className="px-1.5 rounded" style={{ color: 'var(--brass-hi)', background: 'rgba(239, 106, 67,0.12)' }}>{r.level}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> {r.minutes} min</span>
                    <span>· {r.topic}</span>
                  </div>
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
