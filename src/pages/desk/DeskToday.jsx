// DeskToday — the cockpit. Not a dashboard of lessons: what to do now. The current scenario
// is the showpiece (a live "incident" hero), with track progress and a jump into the library.
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Loader2, Radio, ArrowLeft, Headset, CheckCircle2, Clock, Compass, GraduationCap } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import { useDeskModules } from './useDeskModules'
import { useCurriculumProgress } from './useCurriculumProgress'
import { useClassProgress } from './useClassProgress'
import { ALL_LESSONS } from '@/data/desk/curriculum'
import { ALL_CLASSES } from '@/data/desk/classes'
import './desk.css'

export default function DeskToday() {
  const profile = useAuthStore((s) => s.profile)
  const g = useG()
  const rm = useReducedMotion()
  const { data, isLoading } = useDeskModules()
  const { overall: track, currentLessonId } = useCurriculumProgress()
  const { isClassDone } = useClassProgress()
  const currentLesson = currentLessonId ? ALL_LESSONS.find((l) => l.id === currentLessonId) : null
  const latestClass = ALL_CLASSES[0] || null
  const firstName = (profile?.display_name || profile?.full_name || '').split(' ')[0]

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin" style={{ color: 'var(--brass)' }} /></div>

  const modules = data?.modules || []
  const done = data?.done || 0
  const total = data?.total || 0
  // current = first in-progress, else first not-done, else null (all complete)
  const current = modules.find((m) => m.progress?.status === 'in_progress')
    || modules.find((m) => m.progress?.status !== 'completed')
    || null
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-7">
      {/* greeting */}
      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-1.5">
          <Radio size={14} className="desk-live-dot" style={{ color: 'var(--brass)' }} />
          <span className="font-['Inter'] text-[11px] tracking-[0.2em]" dir="ltr" style={{ color: 'var(--brass)' }}>OPERATIONS · LIVE</span>
        </div>
        <h1 className="font-['Tajawal'] font-extrabold text-2xl lg:text-[30px]" style={{ color: 'var(--cream)' }}>
          {firstName ? `أهلاً ${firstName}` : 'أهلاً بك'}
        </h1>
        <p className="font-['Tajawal'] text-[14px] mt-1" style={{ color: 'rgba(243,238,226,0.55)' }}>
          {current ? g('مهمتك القادمة جاهزة. جرّبها قبل مكالمتك الحقيقية.', 'مهمتك القادمة جاهزة. جرّبيها قبل مكالمتك الحقيقية.') : g('أنجزت كل السيناريوهات المتاحة — عمل رائع.', 'أنجزتِ كل السيناريوهات المتاحة — عمل رائع.')}
        </p>
      </div>

      {/* review your latest class — the loop right after a live session */}
      {latestClass && (
        <motion.div initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1], delay: 0.02 }}>
          <Link to={`/desk/classes/${latestClass.id}`} className="group desk-glass flex items-center gap-4 p-5" style={{ borderColor: isClassDone(latestClass.id) ? undefined : 'rgba(201,162,92,0.24)' }}>
            <div className="desk-apply-mark" style={{ borderRadius: 14 }}><GraduationCap size={20} /></div>
            <div className="min-w-0 flex-1">
              <p className="font-['Tajawal'] text-[11px] font-bold mb-0.5" style={{ color: 'var(--brass)' }}>
                {isClassDone(latestClass.id) ? g('راجعت حصتك — راجعها مرة ثانية', 'راجعتِ حصتك — راجعيها مرة ثانية') : g('راجع حصتك الأخيرة', 'راجعي حصتك الأخيرة')}
              </p>
              <h3 className="font-['Tajawal'] font-extrabold text-[15px] leading-tight truncate" style={{ color: 'var(--cream)' }}>
                {g('الحصة', 'الحصة')} {latestClass.number} · {latestClass.title_ar}
              </h3>
              <p className="font-['Tajawal'] text-[12px] mt-1 truncate" style={{ color: 'rgba(243,238,226,0.5)' }}>
                {g('خلاصة + تمارين على اللي أخذته', 'خلاصة + تمارين على اللي أخذتيه')}
              </p>
            </div>
            {isClassDone(latestClass.id)
              ? <CheckCircle2 size={18} className="flex-shrink-0" style={{ color: 'var(--brass-hi)' }} />
              : <ArrowLeft size={18} className="flex-shrink-0" style={{ color: 'var(--brass)' }} />}
          </Link>
        </motion.div>
      )}

      {/* your track — learn, then apply live */}
      <motion.div initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1], delay: 0.04 }}>
        <Link to={currentLesson ? `/desk/track/${currentLesson.id}` : '/desk/track'} className="group desk-glass flex items-center gap-4 p-5">
          <div className="desk-apply-mark" style={{ borderRadius: 14 }}><Compass size={20} /></div>
          <div className="min-w-0 flex-1">
            <p className="font-['Tajawal'] text-[11px] font-bold mb-0.5" style={{ color: 'var(--brass)' }}>
              {track.done === 0 ? g('ابدأ مسارك المهني', 'ابدئي مسارك المهني') : currentLesson ? g('تابع المسار', 'تابعي المسار') : g('أتممت المسار', 'أتممتِ المسار')}
            </p>
            <h3 className="font-['Tajawal'] font-extrabold text-[15px] leading-tight truncate" style={{ color: 'var(--cream)' }}>
              {currentLesson ? currentLesson.ar : g('كل الدروس مكتملة — عمل رائع', 'كل الدروس مكتملة — عمل رائع')}
            </h3>
            <div className="flex items-center gap-2.5 mt-1.5">
              <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full" style={{ width: `${track.pct}%`, background: 'linear-gradient(90deg,#c9a25c,#efd299)' }} />
              </div>
              <span className="font-['Tajawal'] text-[11px] font-bold tabular-nums" style={{ color: 'var(--brass-hi)' }}>{track.done}/{track.total}</span>
            </div>
          </div>
          <ArrowLeft size={18} className="flex-shrink-0" style={{ color: 'var(--brass)' }} />
        </Link>
      </motion.div>

      {/* current-scenario hero */}
      {current ? (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1] }}
          className="desk-glass overflow-hidden" style={{ borderColor: 'rgba(201,162,92,0.24)' }}>
          <div className="grid lg:grid-cols-[1fr_300px]">
            {/* text side */}
            <div className="p-6 lg:p-8">
              <p className="font-['Tajawal'] text-[12px] font-bold mb-3" style={{ color: 'var(--brass)' }}>المهمة الحالية</p>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="font-['Inter'] font-black text-[12px] w-8 h-8 grid place-items-center rounded-lg" style={{ color: '#1a130a', background: 'linear-gradient(135deg,#efd299,#c9a25c)' }}>{String(current.module_number).padStart(2, '0')}</span>
                {current.progress?.status === 'in_progress' && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-['Tajawal']" style={{ color: '#efd299', background: 'rgba(201,162,92,0.12)', border: '1px solid rgba(201,162,92,0.3)' }}>قيد التنفيذ</span>
                )}
              </div>
              <h2 className="font-['Tajawal'] font-extrabold text-2xl leading-tight mb-1.5" style={{ color: 'var(--cream)' }}>{current.title_ar}</h2>
              <p className="font-['Inter'] text-[12px] mb-4" dir="ltr" style={{ color: 'rgba(201,162,92,0.7)' }}>{current.title_en}</p>
              <p className="font-['Tajawal'] text-[14px] leading-relaxed line-clamp-3 mb-6" style={{ color: 'rgba(243,238,226,0.66)' }}>{current.scenario_ar}</p>
              <Link to={`/desk/scenarios/${current.id}`} className="desk-cta inline-flex items-center gap-2 px-6 h-12 rounded-2xl font-['Tajawal'] font-bold text-[14px]">
                <Headset size={17} /> {g('ادخل السيناريو', 'ادخلي السيناريو')}
              </Link>
            </div>
            {/* incident viewport — live spec readout */}
            <div className="relative p-6 flex flex-col justify-center gap-1 border-t lg:border-t-0" style={{ background: 'linear-gradient(180deg, rgba(10,14,22,0.42), rgba(6,9,15,0.62))' }}>
              <div className="desk-divider-v hidden lg:block" style={{ position: 'absolute', top: 24, bottom: 24, right: 0 }} />
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full desk-live-dot" style={{ background: '#e2694e', boxShadow: '0 0 10px 1px rgba(226,105,78,0.6)' }} />
                <span className="font-['Inter'] text-[10px] tracking-[0.16em]" dir="ltr" style={{ color: 'rgba(226,105,78,0.9)' }}>INCIDENT · LIVE</span>
              </div>
              {[
                ['SERVICE', 'PAY-SVC'],
                ['NODE', `NODE-${String(current.module_number).padStart(2, '0')}`],
                ['STATUS', 'ON CALL'],
                ['ETA', `~${current.estimated_minutes || 25} min`],
              ].map(([k, v], idx) => (
                <div key={k} className="flex items-center justify-between font-['Inter'] py-1.5" dir="ltr" style={{ borderTop: idx === 0 ? 'none' : '1px solid rgba(201,162,92,0.08)' }}>
                  <span className="text-[10px] tracking-wide" style={{ color: 'rgba(243,238,226,0.42)' }}>{k}</span>
                  <span className="text-[12px] font-semibold tabular-nums" style={{ color: 'var(--brass-hi)' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="desk-glass p-8 text-center desk-rise">
          <CheckCircle2 size={30} className="mx-auto mb-3" style={{ color: '#6ee7b7' }} />
          <p className="font-['Tajawal'] font-bold text-lg" style={{ color: 'var(--cream)' }}>{g('أنجزت كل السيناريوهات — عمل رائع', 'أنجزتِ كل السيناريوهات — عمل رائع')}</p>
          <Link to="/desk/scenarios" className="inline-flex items-center gap-1.5 mt-3 font-['Tajawal'] text-sm" style={{ color: 'var(--brass)' }}>{g('راجعها من جديد', 'راجعيها من جديد')} <ArrowLeft size={14} /></Link>
        </div>
      )}

      {/* track progress + jump to library */}
      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center desk-glass p-5">
        <div>
          <p className="font-['Tajawal'] text-[13px] font-bold mb-2" style={{ color: 'rgba(243,238,226,0.7)' }}>تقدّمك في المسار</p>
          <div className="flex items-center gap-3">
            <div dir="ltr" className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#c9a25c,#efd299)' }} />
            </div>
            <span className="font-['Tajawal'] text-[12px] font-bold tabular-nums" style={{ color: 'var(--brass-hi)' }}>{done} / {total}</span>
          </div>
        </div>
        <Link to="/desk/scenarios" className="inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl font-['Tajawal'] font-bold text-[13px]" style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.10)', border: '1px solid rgba(201,162,92,0.24)' }}>
          كل السيناريوهات <ArrowLeft size={15} />
        </Link>
      </div>
    </div>
  )
}
