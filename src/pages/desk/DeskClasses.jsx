// DeskClasses (حصصي) — the list of class debriefs. Each live 1-on-1 class,
// distilled + drillable. Newest first, over the Operations Room. Creditless.
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { GraduationCap, ArrowLeft, Clock, Check, ChevronLeft, CalendarDays } from 'lucide-react'
import { useG } from '@/i18n/gender'
import { ALL_CLASSES } from '@/data/desk/classes'
import { useClassProgress } from './useClassProgress'
import './desk.css'

function fmtDate(d) {
  // d = 'YYYY-MM-DD' → "٤ يوليو" (stable, no Date() needed for the label)
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  const [, m, day] = (d || '').split('-')
  const mi = parseInt(m, 10) - 1
  return mi >= 0 && mi < 12 ? `${parseInt(day, 10)} ${months[mi]}` : d
}

export default function DeskClasses() {
  const g = useG()
  const rm = useReducedMotion()
  const { isDone, done, total } = useClassProgress()

  return (
    <div className="space-y-8">
      {/* masthead */}
      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-1.5">
          <GraduationCap size={14} style={{ color: 'var(--brass)' }} />
          <span className="font-['Inter'] text-[11px] tracking-[0.22em]" dir="ltr" style={{ color: 'var(--brass)' }}>MY CLASSES</span>
        </div>
        <h1 className="font-['Tajawal'] font-extrabold text-2xl lg:text-[32px] leading-tight" style={{ color: 'var(--cream)' }}>حصصي</h1>
        <p className="font-['Tajawal'] text-[14px] mt-1.5 max-w-[560px]" style={{ color: 'rgba(243,238,226,0.58)' }}>
          {g('كل حصة مع مدرّبك، محفوظة ومرتّبة — تراجعها، تتأكد إنك فهمتها، وتمرّن على اللي أخذته.',
             'كل حصة مع مدرّبك، محفوظة ومرتّبة — تراجعينها، تتأكدين إنك فهمتيها، وتمرّنين على اللي أخذتيه.')}
        </p>
        {total > 0 && (
          <p className="font-['Tajawal'] text-[12.5px] mt-3" style={{ color: 'var(--brass-hi)' }}>
            {done} {g('من', 'من')} {total} {g('حصة راجعتها', 'حصة راجعتيها')}
          </p>
        )}
      </div>

      {/* class list */}
      <div className="space-y-4">
        {ALL_CLASSES.map((c, i) => {
          const reviewed = isDone(c.id)
          return (
            <motion.div key={c.id} initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ease: [0.16, 1, 0.3, 1], delay: Math.min(i * 0.05, 0.3) }}>
              <Link to={`/desk/classes/${c.id}`} className="group desk-glass desk-class-card overflow-hidden flex items-stretch">
                {/* number rail */}
                <div className="desk-class-rail">
                  <span className="font-['Inter'] font-black text-[15px]" dir="ltr">{String(c.number).padStart(2, '0')}</span>
                  <span className="font-['Tajawal'] text-[11px] tracking-wide" style={{ color: 'rgba(26,19,8,0.62)' }}>حصة</span>
                </div>
                {/* body */}
                <div className="flex-1 min-w-0 p-6 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="font-['Tajawal'] font-extrabold text-[16px] lg:text-[18px] leading-tight" style={{ color: 'var(--cream)' }}>{c.title_ar}</h2>
                      {reviewed && (
                        <span className="inline-flex items-center gap-1 font-['Tajawal'] text-[11px] px-2 py-0.5 rounded-full" style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.12)', border: '1px solid rgba(201,162,92,0.3)' }}>
                          <Check size={11} strokeWidth={3} /> {g('راجعتها', 'راجعتيها')}
                        </span>
                      )}
                    </div>
                    <p className="font-['Inter'] text-[12px] mb-2" dir="ltr" style={{ color: 'rgba(243,238,226,0.45)' }}>{c.title_en}</p>
                    <p className="font-['Tajawal'] text-[12.5px] leading-relaxed line-clamp-2" style={{ color: 'rgba(243,238,226,0.55)' }}>{c.tagline_ar}</p>
                    <div className="flex items-center gap-3.5 mt-3">
                      <span className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[11.5px]" style={{ color: 'rgba(243,238,226,0.42)' }}><CalendarDays size={12} /> {fmtDate(c.date)}</span>
                      <span className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[11.5px]" style={{ color: 'rgba(243,238,226,0.42)' }}><Clock size={12} /> {c.minutes} {g('دقيقة مراجعة', 'دقيقة مراجعة')}</span>
                    </div>
                  </div>
                  <ChevronLeft size={20} className="desk-lesson-chev flex-shrink-0" />
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {ALL_CLASSES.length === 0 && (
        <div className="desk-glass p-8 text-center desk-rise">
          <GraduationCap size={28} className="mx-auto mb-3" style={{ color: 'var(--brass)' }} />
          <p className="font-['Tajawal'] font-bold text-[15px]" style={{ color: 'var(--cream)' }}>{g('أول حصة بتظهر هنا', 'أول حصة بتظهر هنا')}</p>
          <p className="font-['Tajawal'] text-[13px] mt-1.5" style={{ color: 'rgba(243,238,226,0.5)' }}>{g('بعد كل حصة، بنحطّ لك خلاصتها وتمارينها هنا.', 'بعد كل حصة، بنحطّ لك خلاصتها وتمارينها هنا.')}</p>
        </div>
      )}

      {/* tie back to the track */}
      <div className="desk-glass p-6 flex items-center justify-between gap-4 desk-rise">
        <div className="min-w-0">
          <p className="font-['Tajawal'] font-bold text-[14px]" style={{ color: 'var(--cream)' }}>{g('تبغى تتوسّع أكثر؟', 'تبغين تتوسّعين أكثر؟')}</p>
          <p className="font-['Tajawal'] text-[12.5px] mt-0.5" style={{ color: 'rgba(243,238,226,0.5)' }}>{g('مسارك المهني فيه دروس تبني على أساس حصصك.', 'مسارك المهني فيه دروس تبني على أساس حصصك.')}</p>
        </div>
        <Link to="/desk/track" className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl font-['Tajawal'] font-bold text-[13px]"
          style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.10)', border: '1px solid rgba(201,162,92,0.24)' }}>
          {g('المسار', 'المسار')} <ArrowLeft size={15} />
        </Link>
      </div>
    </div>
  )
}
