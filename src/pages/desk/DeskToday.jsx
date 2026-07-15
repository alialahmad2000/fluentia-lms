// DeskToday — the cockpit, "Dawn Atelier". Curriculum-FIRST: her learning path is the
// luminous hero; the practice call is a deep-plum "instrument" card (the one dark moment);
// Daily + Reading are the two supporting entries. Editorial, warm, calm premium.
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Loader2, ArrowRight, PhoneCall, CheckCircle2, Compass, GraduationCap, Flame, BookOpen } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useDeskModules } from './useDeskModules'
import { useCurriculumProgress } from './useCurriculumProgress'
import { useClassProgress } from './useClassProgress'
import { useDailyProgress } from './useDailyProgress'
import { ALL_LESSONS } from '@/data/desk/curriculum'
import { ALL_CLASSES } from '@/data/desk/classes'
import './desk.css'

function Ring({ pct, done, total, size = 88 }) {
  const cx = size / 2, R = cx - 8, C = 2 * Math.PI * R, sw = size >= 88 ? 8 : 6
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={cx} cy={cx} r={R} fill="none" stroke="rgba(255, 255, 255,0.12)" strokeWidth={sw} />
        <circle cx={cx} cy={cx} r={R} fill="none" stroke="url(#deskRing)" strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} style={{ filter: 'drop-shadow(0 0 6px rgba(240,118,79,0.55))' }} />
        <defs><linearGradient id="deskRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5b3f7a" /><stop offset="1" stopColor="#ef6a43" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center leading-none">
        <span className="font-['Fraunces'] font-bold tabular-nums" style={{ color: 'var(--ink)', fontSize: size >= 88 ? 22 : 18 }}>{done}<span style={{ color: 'rgba(240, 234, 224,0.52)', fontSize: size >= 88 ? 13 : 12 }}>/{total}</span></span>
      </div>
    </div>
  )
}

function greetingWord() {
  try { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 18) return 'Good afternoon'; return 'Good evening' } catch { return 'Welcome back' }
}
function greetingWordAr() {
  try { const h = new Date().getHours(); if (h < 12) return 'صباحكِ خير'; return 'مساؤكِ خير' } catch { return 'أهلاً بكِ' }
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

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin" style={{ color: 'var(--coral)' }} /></div>

  const modules = data?.modules || []
  const current = modules.find((m) => m.progress?.status === 'in_progress')
    || modules.find((m) => m.progress?.status !== 'completed') || null
  const dailyLeft = (todayVocabDone ? 0 : 1) + (todayGrammarDone ? 0 : 1)
  const callInitial = ((current?.title_en || 'Practice')[0] || 'P').toUpperCase()

  const rise = (d) => ({ initial: rm ? false : { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { ease: [0.16, 1, 0.3, 1], delay: d } })

  return (
    <div className="space-y-6 max-w-[960px]">
      {/* greeting — the editorial serif moment */}
      <div className="desk-rise pt-1">
        <p className="desk-eyebrow mb-2">TODAY · YOUR DESK</p>
        <h1 className="font-['Fraunces'] font-semibold text-[34px] lg:text-[42px] leading-[1.02] tracking-[-0.01em]" dir="ltr" style={{ color: 'var(--ink)' }}>
          {greetingWord()}{firstName ? <>, <span style={{ fontStyle: 'italic', color: 'var(--coral-deep,#cf4a1c)' }}>{firstName}</span></> : ''}
        </h1>
        <p className="font-['Hanken_Grotesk'] text-[14.5px] mt-2 leading-relaxed" dir="ltr" style={{ color: 'var(--ink-2)' }}>
          Pick up your path, keep your daily streak, then rehearse a real call. <span className="font-['Tajawal']" style={{ color: 'var(--ink-3)' }}>{greetingWordAr()}</span>
        </p>
      </div>

      {/* HERO ROW — curriculum (light, luminous) + practice call (deep-plum instrument) */}
      <div className="grid lg:grid-cols-[1.45fr_1fr] gap-5">
        {/* Curriculum — the centre of gravity */}
        <motion.div {...rise(0.02)} className="desk-hero overflow-hidden">
          <Link to={currentLesson ? `/desk/track/${currentLesson.id}` : '/desk/track'} className="group block p-6 lg:p-7 h-full">
            <div className="flex items-center gap-2 mb-5">
              <Compass size={14} style={{ color: 'var(--coral-deep,#cf4a1c)' }} />
              <span className="desk-eyebrow desk-eyebrow-accent">Your curriculum</span>
              <span className="font-['Tajawal'] text-[12px]" style={{ color: 'var(--ink-3)' }}>· المسار</span>
            </div>
            <div className="flex items-start gap-5">
              <Ring pct={track.pct} done={track.done} total={track.total} size={92} />
              <div className="min-w-0 flex-1">
                <p className="desk-eyebrow mb-1.5">{track.done === 0 ? 'Start here' : currentLesson ? 'Continue' : 'Path complete'}</p>
                <h2 className="font-['Fraunces'] font-medium text-[23px] leading-[1.12] tracking-[-0.01em]" dir="ltr" style={{ color: 'var(--ink)' }}>
                  {currentLesson ? (currentLesson.en || currentLesson.ar) : 'Every lesson complete — great work'}
                </h2>
                {currentLesson && (
                  <p className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-['Tajawal'] text-[13px]" style={{ color: 'var(--ink-2)' }}>{currentLesson.ar}</span>
                    {currentLesson.label && <span className="desk-mono text-[11px]" dir="ltr" style={{ color: 'var(--ink-3)' }}>· {currentLesson.label}</span>}
                  </p>
                )}
                <span className="desk-cta inline-flex items-center gap-2 px-5 h-11 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[13.5px] mt-4" dir="ltr">{track.done === 0 ? 'Start' : 'Continue'} <ArrowRight size={16} /></span>
              </div>
            </div>
            <div className="mt-6 pt-4 desk-hair flex items-center gap-3">
              <div dir="ltr" className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255,0.09)' }}>
                <div className="h-full rounded-full" style={{ width: `${track.pct}%`, background: 'linear-gradient(90deg,#5b3f7a,#ef6a43)' }} />
              </div>
              <span className="desk-mono text-[11px]" dir="ltr" style={{ color: 'var(--ink-3)' }}>{track.done}/{track.total} · full path</span>
            </div>
          </Link>
        </motion.div>

        {/* Practice a real call — the deep-plum instrument card */}
        {current ? (
          <motion.div {...rise(0.05)} className="desk-feature p-6 lg:p-7 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <span className="desk-mono text-[11px] tracking-[0.16em] uppercase" style={{ color: 'rgba(243,236,247,0.6)' }}>Practise a real call</span>
              <span className="inline-flex items-center gap-1.5 desk-mono text-[10.5px] px-2.5 py-1 rounded-full" style={{ color: '#ffcbb3', background: 'rgba(239,106,67,0.18)', border: '1px solid rgba(239,106,67,0.3)' }}>
                <span className="w-1.5 h-1.5 rounded-full desk-live-dot" style={{ background: '#ef6a43' }} /> Roleplay
              </span>
            </div>
            <div className="flex items-center gap-3.5 mb-4">
              <div className="desk-call-hud-avatar" style={{ width: 52, height: 52, borderRadius: 16, fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 20 }}>{callInitial}</div>
              <div className="min-w-0">
                <h2 className="font-['Fraunces'] font-medium text-[21px] leading-[1.1] tracking-[-0.01em]" dir="ltr" style={{ color: '#f7f1fb' }}>{current.title_en || current.title_ar}</h2>
                <p className="font-['Tajawal'] text-[12.5px] mt-0.5 truncate" style={{ color: 'rgba(243,236,247,0.55)' }}>{current.title_ar}</p>
              </div>
            </div>
            <p className="font-['Hanken_Grotesk'] text-[13.5px] leading-relaxed" dir="ltr" style={{ color: 'rgba(243,236,247,0.68)' }}>
              The AI plays the other person at their real pace, then gives you the exact phrases you needed.
            </p>
            <Link to={`/desk/scenarios/${current.id}`} className="mt-auto pt-5">
              <span className="inline-flex items-center gap-2 px-5 h-12 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[14px] w-full justify-center" dir="ltr"
                style={{ color: '#fff5ef', background: 'linear-gradient(180deg,#f5885f 0%,#e0561f 58%,#cf4a1c 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.42), 0 2px 8px rgba(224,86,31,0.32), 0 16px 36px -10px rgba(224,86,31,0.68)' }}>
                <PhoneCall size={17} /> Prep the call
              </span>
            </Link>
          </motion.div>
        ) : (
          <motion.div {...rise(0.05)} className="desk-feature p-7 flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={30} className="mb-3" style={{ color: '#8fe0b4' }} />
            <p className="font-['Fraunces'] font-medium text-[19px]" dir="ltr" style={{ color: '#f7f1fb' }}>Every call rehearsed</p>
            <Link to="/desk/scenarios" className="inline-flex items-center gap-1.5 mt-3 font-['Hanken_Grotesk'] text-sm" dir="ltr" style={{ color: '#ffcbb3' }}>Review them again <ArrowRight size={14} /></Link>
          </motion.div>
        )}
      </div>

      {/* your day + reading */}
      <motion.div {...rise(0.08)} className="grid sm:grid-cols-2 gap-4">
        <Link to="/desk/daily" className="group desk-glass p-6 flex flex-col" style={dailyLeft ? { borderColor: 'rgba(239,106,67,0.22)' } : undefined}>
          <div className="flex items-center justify-between mb-3">
            <div className={`desk-mini-mark ${streak > 0 ? 'lit-flame' : ''}`} style={streak > 0 ? { color: '#cf4a1c', background: 'rgba(239,106,67,0.14)' } : undefined}><Flame size={16} /></div>
            {streak > 0 && <span className="inline-flex items-center gap-1 desk-mono text-[11px] font-bold px-2.5 py-1 rounded-full" dir="ltr" style={{ color: 'var(--coral-deep,#cf4a1c)', background: 'rgba(239,106,67,0.1)', border: '1px solid rgba(239,106,67,0.24)' }}>{streak}-day streak</span>}
          </div>
          <p className="desk-eyebrow mb-0.5">Your day</p>
          <h3 className="font-['Fraunces'] font-medium text-[18px] leading-tight" dir="ltr" style={{ color: 'var(--ink)' }}>{dailyLeft ? `${dailyLeft === 2 ? 'Vocab + grammar' : 'Almost done'} today` : 'Daily done ✓'}</h3>
          <p className="font-['Hanken_Grotesk'] text-[12.5px] mt-1" dir="ltr" style={{ color: 'var(--ink-2)' }}>
            {todayCount ? `${todayCount} words to review` : 'Words reviewed'}{grammarToday ? ` · ${todayGrammarDone ? 'grammar done' : 'a grammar rule'}` : ''}
          </p>
          <span className="mt-auto pt-3 inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[12.5px] font-bold" dir="ltr" style={{ color: 'var(--coral-deep,#cf4a1c)' }}>Open your day <ArrowRight size={14} /></span>
        </Link>

        <Link to="/desk/reading" className="group desk-glass p-6 flex flex-col">
          <div className="flex items-center justify-between mb-3"><div className="desk-mini-mark"><BookOpen size={16} /></div></div>
          <p className="desk-eyebrow mb-0.5">Reading</p>
          <h3 className="font-['Fraunces'] font-medium text-[18px] leading-tight" dir="ltr" style={{ color: 'var(--ink)' }}>Read in your field</h3>
          <p className="font-['Hanken_Grotesk'] text-[12.5px] mt-1" dir="ltr" style={{ color: 'var(--ink-2)' }}>Short IT passages — build professional reading & vocabulary.</p>
          <span className="mt-auto pt-3 inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[12.5px] font-bold" dir="ltr" style={{ color: 'var(--coral-deep,#cf4a1c)' }}>Open reading <ArrowRight size={14} /></span>
        </Link>
      </motion.div>

      {/* review your last class */}
      {latestClass && (
        <motion.div {...rise(0.1)}>
          <Link to={`/desk/classes/${latestClass.id}`} className="group desk-glass flex items-center gap-4 p-5">
            <div className="desk-mini-mark flex-shrink-0"><GraduationCap size={17} /></div>
            <div className="min-w-0 flex-1">
              <p className="desk-eyebrow mb-0.5">{isClassDone(latestClass.id) ? 'Reviewed · open again' : 'Review your last class'}</p>
              <h3 className="font-['Fraunces'] font-medium text-[16px] leading-tight truncate" dir="ltr" style={{ color: 'var(--ink)' }}>Class {latestClass.number} · {latestClass.title_en || latestClass.title_ar}</h3>
            </div>
            {isClassDone(latestClass.id) ? <CheckCircle2 size={18} className="flex-shrink-0" style={{ color: 'var(--coral-deep,#cf4a1c)' }} /> : <ArrowRight size={18} className="flex-shrink-0" style={{ color: 'var(--coral-deep,#cf4a1c)' }} />}
          </Link>
        </motion.div>
      )}
    </div>
  )
}
