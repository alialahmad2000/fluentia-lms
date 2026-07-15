// DeskToday — the home. Rebuilt around ONE question: "what do I do right now?"
// Nocturne dark, editorial. Three calm blocks, no cockpit to decode:
//   1) Your next step   — the single next lesson, big, one tap (the path)
//   2) Today's session  — the ~15-min daily checklist (lesson · words · grammar) + streak
//   3) Your program     — a slim progress strip → the 4-stage plan
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, CheckCircle2, Flame, GraduationCap, Repeat2, PenLine, Headset } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useProgram } from './useProgram'
import { TOTAL_STAGES } from '@/data/desk/program'
import './desk.css'

function greetingWord() {
  try { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 18) return 'Good afternoon'; return 'Good evening' } catch { return 'Welcome back' }
}

const SESSION_ICON = { lesson: GraduationCap, vocab: Repeat2, grammar: PenLine }

export default function DeskToday() {
  const profile = useAuthStore((s) => s.profile)
  const rm = useReducedMotion()
  const { currentLesson, overall, stages, currentStageIndex, allComplete, session } = useProgram()
  const firstName = (profile?.display_name || profile?.full_name || '').split(' ')[0]
  const stage = stages[currentStageIndex] || stages[0]
  const rise = (d) => ({ initial: rm ? false : { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { ease: [0.16, 1, 0.3, 1], delay: d } })

  return (
    <div className="space-y-6 max-w-[900px]">
      {/* greeting */}
      <div className="desk-rise pt-1">
        <p className="desk-eyebrow mb-2">TODAY · YOUR DESK</p>
        <h1 className="font-['Fraunces'] font-semibold text-[34px] lg:text-[42px] leading-[1.02] tracking-[-0.01em]" dir="ltr" style={{ color: 'var(--ink)' }}>
          {greetingWord()}{firstName ? <>, <span style={{ fontStyle: 'italic', color: 'var(--coral-deep)' }}>{firstName}</span></> : ''}
        </h1>
        <p className="font-['Hanken_Grotesk'] text-[14.5px] mt-2 leading-relaxed" dir="ltr" style={{ color: 'var(--ink-2)' }}>
          Here’s exactly what to do today — one step at a time.
        </p>
      </div>

      {/* 1 — YOUR NEXT STEP (the one thing) */}
      <motion.div {...rise(0.02)} className="desk-hero overflow-hidden">
        {currentLesson ? (
          <Link to={`/desk/track/${currentLesson.id}`} className="group block p-6 lg:p-7">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="desk-eyebrow desk-eyebrow-accent">Your next step</span>
              <span className="desk-goal-chip font-['Hanken_Grotesk'] text-[11.5px] font-bold" dir="ltr" style={{ padding: '3px 12px' }}>
                Stage {stage?.order} · {stage?.en}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-['Fraunces'] font-medium text-[26px] lg:text-[30px] leading-[1.08] tracking-[-0.01em]" dir="ltr" style={{ color: 'var(--ink)' }}>
                  {currentLesson.en}
                </h2>
                <p className="font-['Tajawal'] text-[13.5px] mt-1.5" style={{ color: 'var(--ink-2)' }}>{currentLesson.ar}</p>
                {currentLesson.outcome && (
                  <p className="font-['Hanken_Grotesk'] text-[13px] mt-2.5 leading-relaxed max-w-[520px]" dir="ltr" style={{ color: 'var(--ink-3)' }}>{currentLesson.outcome}</p>
                )}
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3 flex-wrap">
              <span className="desk-cta inline-flex items-center gap-2 px-6 h-12 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[14.5px]" dir="ltr">
                {overall.done === 0 ? 'Start here' : 'Continue'} <ArrowRight size={17} />
              </span>
              <span className="desk-mono text-[11.5px]" dir="ltr" style={{ color: 'var(--ink-3)' }}>~{currentLesson.minutes || 7} min · {currentLesson.trackEn}</span>
            </div>
          </Link>
        ) : (
          <div className="p-8 text-center">
            <CheckCircle2 size={34} className="mx-auto mb-3" style={{ color: 'var(--ok)' }} />
            <h2 className="font-['Fraunces'] font-medium text-[24px]" dir="ltr" style={{ color: 'var(--ink)' }}>You’ve completed the whole program</h2>
            <p className="font-['Tajawal'] text-[13px] mt-1" style={{ color: 'var(--ink-2)' }}>أنهيتِ كل البرنامج — عمل رائع</p>
            <Link to="/desk/scenarios" className="desk-cta inline-flex items-center gap-2 px-6 h-11 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[14px] mt-5" dir="ltr">Keep practising <ArrowRight size={16} /></Link>
          </div>
        )}
      </motion.div>

      {/* 2 — TODAY'S SESSION (the ~15-min checklist) */}
      <motion.div {...rise(0.05)} className="desk-glass p-6 lg:p-7">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <p className="desk-eyebrow mb-1">TODAY’S SESSION</p>
            <h3 className="font-['Fraunces'] font-medium text-[19px] leading-tight" dir="ltr" style={{ color: 'var(--ink)' }}>
              {session.allGoalDone ? 'Daily goal done ✓' : 'Your daily habit'}
              <span className="font-['Tajawal'] text-[13px] ms-2" style={{ color: 'var(--ink-3)' }}>· جلسة اليوم</span>
            </h3>
          </div>
          {session.streak > 0 && (
            <span className="inline-flex items-center gap-1.5 desk-mono text-[12px] font-bold px-3 py-1.5 rounded-full flex-shrink-0" dir="ltr"
              style={{ color: 'var(--coral-deep)', background: 'rgba(240,118,79,0.12)', border: '1px solid rgba(240,118,79,0.26)', whiteSpace: 'nowrap' }}>
              <Flame size={13} /> {session.streak}-day streak
            </span>
          )}
        </div>
        <div className="space-y-2.5">
          {session.items.map((it) => {
            const Icon = SESSION_ICON[it.kind] || Check
            return (
              <Link key={it.key} to={it.to} className="group flex items-center gap-3.5 rounded-2xl p-3.5 transition-colors"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="flex-shrink-0 grid place-items-center rounded-xl" style={{ width: 40, height: 40, ...(it.done
                  ? { color: '#0b241a', background: 'linear-gradient(150deg,#7fd4a6,#4bb37f)' }
                  : { color: 'var(--coral-deep)', background: 'var(--coral-soft)', border: '1px solid rgba(240,118,79,0.22)' }) }}>
                  {it.done ? <Check size={19} strokeWidth={3} /> : <Icon size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-['Hanken_Grotesk'] font-bold text-[14px] leading-tight" dir="ltr" style={{ color: 'var(--ink)', textDecoration: it.done ? 'none' : 'none' }}>{it.en}</p>
                  <p className="font-['Hanken_Grotesk'] text-[12.5px] mt-0.5 truncate" dir="ltr" style={{ color: 'var(--ink-3)' }}>{it.detail}</p>
                </div>
                <ArrowRight size={16} className="flex-shrink-0" style={{ color: it.done ? 'var(--ink-3)' : 'var(--coral-deep)' }} />
              </Link>
            )
          })}
        </div>
        <p className="font-['Hanken_Grotesk'] text-[12px] mt-3.5" dir="ltr" style={{ color: 'var(--ink-3)' }}>
          Daily goal: {session.goalDone}/{session.goalTotal} done · keeps your streak alive
        </p>
      </motion.div>

      {/* 3 — YOUR PROGRAM (slim strip → the plan) */}
      <motion.div {...rise(0.08)}>
        <Link to="/desk/track" className="group desk-glass block p-5 lg:p-6">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="min-w-0">
              <p className="desk-eyebrow mb-1">YOUR PROGRAM</p>
              <h3 className="font-['Fraunces'] font-medium text-[17px] leading-tight" dir="ltr" style={{ color: 'var(--ink)' }}>
                {allComplete ? 'Program complete' : `Stage ${stage?.order} of ${TOTAL_STAGES} · ${stage?.en}`}
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[12.5px] font-bold flex-shrink-0" dir="ltr" style={{ color: 'var(--coral-deep)' }}>
              See your plan <ArrowRight size={15} />
            </span>
          </div>
          {/* 4 stage segments */}
          <div className="flex items-center gap-1.5" dir="ltr">
            {stages.map((s) => (
              <div key={s.id} className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.allDone ? 'linear-gradient(90deg,#5b3f7a,#ef6a43)' : s.isCurrent ? 'linear-gradient(90deg,#5b3f7a,#ef6a43)' : 'rgba(240,118,79,0.5)' }} />
              </div>
            ))}
          </div>
          <p className="desk-mono text-[11px] mt-2.5" dir="ltr" style={{ color: 'var(--ink-3)' }}>{overall.done} / {overall.total} lessons · {overall.pct}%</p>
        </Link>
      </motion.div>

      {/* apply-it nudge (one line, not a card) */}
      <motion.div {...rise(0.1)} className="pt-1">
        <Link to="/desk/scenarios" className="inline-flex items-center gap-2 font-['Hanken_Grotesk'] text-[13px] font-semibold" dir="ltr" style={{ color: 'var(--ink-2)' }}>
          <Headset size={15} style={{ color: 'var(--coral-deep)' }} /> Ready to apply it? Rehearse a real call
          <ArrowRight size={14} style={{ color: 'var(--coral-deep)' }} />
        </Link>
      </motion.div>
    </div>
  )
}
