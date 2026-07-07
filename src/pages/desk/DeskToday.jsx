// DeskToday — the cockpit. Curriculum-FIRST: her learning path is the hero (where she
// is + continue), Daily is a supporting "your day" hub, Reading is its own clear entry,
// and the practice call sits below. Calm premium — no incident/on-call cosplay.
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Loader2, ArrowLeft, PhoneCall, CheckCircle2, Compass, GraduationCap, Flame, BookOpen, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useDeskModules } from './useDeskModules'
import { useCurriculumProgress } from './useCurriculumProgress'
import { useClassProgress } from './useClassProgress'
import { useDailyProgress } from './useDailyProgress'
import { ALL_LESSONS } from '@/data/desk/curriculum'
import { ALL_CLASSES } from '@/data/desk/classes'
import './desk.css'

function Ring({ pct, done, total, size = 76 }) {
  const cx = size / 2, R = cx - 8, C = 2 * Math.PI * R, sw = size >= 88 ? 6 : 5
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={cx} cy={cx} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
        <circle cx={cx} cy={cx} r={R} fill="none" stroke="url(#deskRing)" strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} />
        <defs><linearGradient id="deskRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c9a25c" /><stop offset="1" stopColor="#efd299" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center leading-none">
        <span className="font-['Inter'] font-extrabold tabular-nums" style={{ color: 'var(--cream)', fontSize: size >= 88 ? 20 : 17 }}>{done}<span style={{ color: 'rgba(243,238,226,0.4)', fontSize: size >= 88 ? 13 : 12 }}>/{total}</span></span>
      </div>
    </div>
  )
}

export default function DeskToday() {
  const profile = useAuthStore((s) => s.profile)
  const rm = useReducedMotion()
  const { data, isLoading } = useDeskModules()
  const { overall: track, currentLessonId } = useCurriculumProgress()
  const { isClassDone } = useClassProgress()
  const { todayCount, streak, grammarToday, todayVocabDone, todayGrammarDone } = useDailyProgress()
  const currentLesson = currentLessonId ? ALL_LESSONS.find((l) => l.id === currentLessonId) : null
  const latestClass = ALL_CLASSES[0] || null
  const firstName = (profile?.display_name || profile?.full_name || '').split(' ')[0]

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin" style={{ color: 'var(--brass)' }} /></div>

  const modules = data?.modules || []
  const current = modules.find((m) => m.progress?.status === 'in_progress')
    || modules.find((m) => m.progress?.status !== 'completed') || null
  const dailyLeft = (todayVocabDone ? 0 : 1) + (todayGrammarDone ? 0 : 1)

  const rise = (d) => ({ initial: rm ? false : { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { ease: [0.16, 1, 0.3, 1], delay: d } })

  return (
    <div className="space-y-6 max-w-[820px]">
      {/* greeting */}
      <div className="desk-rise pt-1">
        <p className="font-['Inter'] text-[12px] tracking-[0.22em] mb-1.5" dir="ltr" style={{ color: 'var(--brass)' }}>YOUR DESK</p>
        <h1 className="font-['Inter'] font-extrabold text-2xl lg:text-[30px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>
          {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        </h1>
        <p className="font-['Inter'] text-[14px] mt-1.5" dir="ltr" style={{ color: 'rgba(243,238,226,0.62)' }}>Pick up your curriculum, keep your daily streak, then practise a real call.</p>
      </div>

      {/* CURRICULUM HERO — the centre of gravity (raised tier) */}
      <motion.div {...rise(0.02)} className="desk-hero overflow-hidden">
        <Link to={currentLesson ? `/desk/track/${currentLesson.id}` : '/desk/track'} className="group block p-6 lg:p-7">
          <div className="flex items-center gap-2 mb-5">
            <Compass size={15} style={{ color: 'var(--brass)' }} />
            <span className="font-['Inter'] text-[12px] tracking-[0.18em]" dir="ltr" style={{ color: 'var(--brass)' }}>YOUR CURRICULUM</span>
            <span className="font-['Tajawal'] text-[12px]" style={{ color: 'rgba(243,238,226,0.4)' }}>· المسار</span>
          </div>
          <div className="flex items-start gap-5">
            <Ring pct={track.pct} done={track.done} total={track.total} size={88} />
            <div className="min-w-0 flex-1">
              <p className="font-['Inter'] text-[11px] font-bold tracking-[0.16em] mb-1.5" dir="ltr" style={{ color: 'rgba(243,238,226,0.42)' }}>
                {track.done === 0 ? 'START HERE' : currentLesson ? 'CONTINUE' : 'PATH COMPLETE'}
              </p>
              <h2 className="font-['Inter'] font-extrabold text-[20px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>
                {currentLesson ? (currentLesson.en || currentLesson.ar) : 'Every lesson complete — great work'}
              </h2>
              {currentLesson && (
                <p className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-['Tajawal'] text-[13px]" style={{ color: 'rgba(243,238,226,0.55)' }}>{currentLesson.ar}</span>
                  {currentLesson.label && <span className="font-['Inter'] text-[12px]" dir="ltr" style={{ color: 'rgba(201,162,92,0.7)' }}>· {currentLesson.label}</span>}
                </p>
              )}
              <span className="desk-cta inline-flex items-center gap-2 px-5 h-11 rounded-2xl font-['Inter'] font-bold text-[13px] mt-4" dir="ltr">{track.done === 0 ? 'Start' : 'Continue'} <ArrowLeft size={16} /></span>
            </div>
          </div>
          {/* track rail */}
          <div className="mt-6 pt-4 desk-hair flex items-center gap-3">
            <div dir="ltr" className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full" style={{ width: `${track.pct}%`, background: 'linear-gradient(90deg,#c9a25c,#efd299)' }} />
            </div>
            <span className="font-['Inter'] text-[11.5px]" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>{track.done} of {track.total} lessons · full path</span>
          </div>
        </Link>
      </motion.div>

      {/* your day + reading — the two daily-ish entries, side by side */}
      <motion.div {...rise(0.05)} className="grid sm:grid-cols-2 gap-4">
        {/* your day (Daily hub) */}
        <Link to="/desk/daily" className="group desk-glass p-5 flex flex-col" style={{ borderColor: dailyLeft ? 'rgba(201,162,92,0.2)' : undefined }}>
          <div className="flex items-center justify-between mb-3">
            <div className="desk-mini-mark" style={streak > 0 ? { color: '#e0a44a' } : undefined}><Flame size={16} /></div>
            {streak > 0 && <span className="inline-flex items-center gap-1 font-['Inter'] text-[11.5px] font-bold px-2.5 py-1 rounded-full" dir="ltr" style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.12)', border: '1px solid rgba(201,162,92,0.28)' }}>{streak}-day streak</span>}
          </div>
          <p className="font-['Inter'] text-[11px] font-bold tracking-[0.16em] mb-0.5" dir="ltr" style={{ color: 'rgba(243,238,226,0.42)' }}>YOUR DAY</p>
          <h3 className="font-['Inter'] font-extrabold text-[16px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>{dailyLeft ? `${dailyLeft === 2 ? 'Vocab + grammar' : 'Almost done'} today` : 'Daily done ✓'}</h3>
          <p className="font-['Inter'] text-[12px] mt-1" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>
            {todayCount ? `${todayCount} words to review` : 'Words reviewed'}{grammarToday ? ` · ${todayGrammarDone ? 'grammar done' : 'a grammar rule'}` : ''}
          </p>
          <span className="mt-auto pt-3 inline-flex items-center gap-1.5 font-['Inter'] text-[12.5px] font-bold" dir="ltr" style={{ color: 'var(--brass)' }}>Open your day <ArrowLeft size={14} /></span>
        </Link>

        {/* reading — its own clear entry */}
        <Link to="/desk/reading" className="group desk-glass p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="desk-mini-mark"><BookOpen size={16} /></div>
          </div>
          <p className="font-['Inter'] text-[11px] font-bold tracking-[0.14em] mb-0.5" dir="ltr" style={{ color: 'rgba(243,238,226,0.42)' }}>READING</p>
          <h3 className="font-['Inter'] font-extrabold text-[16px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>Read in your field</h3>
          <p className="font-['Inter'] text-[12px] mt-1" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>Short IT passages — build professional reading & vocabulary.</p>
          <span className="mt-auto pt-3 inline-flex items-center gap-1.5 font-['Inter'] text-[12.5px] font-bold" dir="ltr" style={{ color: 'var(--brass)' }}>Open reading <ArrowLeft size={14} /></span>
        </Link>
      </motion.div>

      {/* practice a real call — the scenario, de-cosplayed */}
      {current ? (
        <motion.div {...rise(0.07)} className="desk-glass p-6 lg:p-7" style={{ borderColor: 'rgba(201,162,92,0.18)' }}>
          <div className="flex items-start gap-4">
            <div className="desk-apply-mark flex-shrink-0" style={{ borderRadius: 14 }}><PhoneCall size={20} /></div>
            <div className="min-w-0 flex-1">
              <p className="font-['Inter'] text-[11px] font-bold tracking-[0.14em] mb-1" dir="ltr" style={{ color: 'rgba(243,238,226,0.42)' }}>PRACTISE A REAL CALL</p>
              <h2 className="font-['Inter'] font-extrabold text-[19px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>{current.title_en || current.title_ar}</h2>
              <p className="font-['Tajawal'] text-[12.5px] mt-0.5" style={{ color: 'rgba(201,162,92,0.72)' }}>{current.title_ar}</p>
              <p className="font-['Inter'] text-[13.5px] leading-relaxed mt-3 line-clamp-2" dir="ltr" style={{ color: 'rgba(243,238,226,0.58)' }}>Rehearse it here before the real thing — the AI plays the other person, then gives you feedback.</p>
              <Link to={`/desk/scenarios/${current.id}`} className="desk-cta inline-flex items-center gap-2 px-5 h-11 rounded-2xl font-['Inter'] font-bold text-[13.5px] mt-4"><Sparkles size={16} /> Start the call</Link>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div {...rise(0.07)} className="desk-glass p-7 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-2.5" style={{ color: '#8fd6b4' }} />
          <p className="font-['Inter'] font-bold text-[16px]" dir="ltr" style={{ color: 'var(--cream)' }}>You've practised every call — great work</p>
          <Link to="/desk/scenarios" className="inline-flex items-center gap-1.5 mt-2 font-['Inter'] text-sm" dir="ltr" style={{ color: 'var(--brass)' }}>Review them again <ArrowLeft size={14} /></Link>
        </motion.div>
      )}

      {/* review your last class */}
      {latestClass && (
        <motion.div {...rise(0.09)}>
          <Link to={`/desk/classes/${latestClass.id}`} className="group desk-glass flex items-center gap-4 p-5">
            <div className="desk-mini-mark flex-shrink-0"><GraduationCap size={17} /></div>
            <div className="min-w-0 flex-1">
              <p className="font-['Inter'] text-[11px] font-bold mb-0.5 tracking-[0.14em]" dir="ltr" style={{ color: 'rgba(243,238,226,0.42)' }}>{isClassDone(latestClass.id) ? 'REVIEWED · OPEN AGAIN' : 'REVIEW YOUR LAST CLASS'}</p>
              <h3 className="font-['Inter'] font-bold text-[15px] leading-tight truncate" dir="ltr" style={{ color: 'var(--cream)' }}>Class {latestClass.number} · {latestClass.title_en || latestClass.title_ar}</h3>
            </div>
            {isClassDone(latestClass.id) ? <CheckCircle2 size={18} className="flex-shrink-0" style={{ color: 'var(--brass-hi)' }} /> : <ArrowLeft size={18} className="flex-shrink-0" style={{ color: 'var(--brass)' }} />}
          </Link>
        </motion.div>
      )}
    </div>
  )
}
