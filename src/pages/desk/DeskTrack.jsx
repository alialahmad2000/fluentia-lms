// DeskTrack → "My Plan". The curriculum, reframed as ONE guided journey: 4 stages
// that build on each other, each with a plain payoff and a "you are here" marker.
// The current stage is expanded; the rest collapse to a clean summary so the 59
// lessons never read as a wall. Nocturne dark, English-primary. Route + lesson
// deep-links (/desk/track/:lessonId) are unchanged.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Compass, ArrowRight, Clock, Check, ChevronDown, CheckCircle2, Headset, Sprout, PhoneCall, Megaphone, Award } from 'lucide-react'
import { useCurriculumProgress } from './useCurriculumProgress'
import { useProgram } from './useProgram'
import { TOTAL_STAGES } from '@/data/desk/program'
import './desk.css'

const STAGE_ICONS = { Sprout, PhoneCall, Megaphone, Award }

function StageRing({ pct, size = 44 }) {
  const cx = size / 2, R = cx - 4, C = 2 * Math.PI * R
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 flex-shrink-0">
      <circle cx={cx} cy={cx} r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={4} />
      <circle cx={cx} cy={cx} r={R} fill="none" stroke="url(#stageRing)" strokeWidth={4} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} />
      <defs><linearGradient id="stageRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5b3f7a" /><stop offset="1" stopColor="#ef6a43" /></linearGradient></defs>
    </svg>
  )
}

function LessonRow({ lesson, li, track, isCompleted, currentId }) {
  const done = isCompleted(lesson.id)
  const isCurrent = lesson.id === currentId
  const prevDone = li === 0 ? true : isCompleted(track.lessons[li - 1].id)
  const last = li === track.lessons.length - 1
  return (
    <Link to={`/desk/track/${lesson.id}`} className="group desk-lesson-row">
      <div className="desk-lesson-spine">
        {li > 0 && <span className={`desk-lesson-line top ${prevDone ? 'is-lit' : ''}`} />}
        {!last && <span className={`desk-lesson-line bottom ${done ? 'is-lit' : ''}`} />}
        <span className={`desk-lesson-node ${done ? 'is-done' : isCurrent ? 'is-current' : ''}`}>
          {done ? <Check size={13} strokeWidth={3} /> : <span className="desk-lesson-node-idx">{li + 1}</span>}
        </span>
      </div>
      <div className={`desk-lesson-card ${isCurrent ? 'is-current' : ''}`}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-['Hanken_Grotesk'] font-bold text-[15px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{lesson.en}</h3>
            {isCurrent && <span className="desk-lesson-tag" dir="ltr">Resume</span>}
            {lesson.scenarioModuleNumber && <span className="desk-lesson-tag" dir="ltr"><Headset size={11} /> Scenario</span>}
          </div>
          <p className="font-['Tajawal'] text-[12.5px] mb-1.5" style={{ color: 'rgba(240, 234, 224,0.56)' }}>{lesson.ar}</p>
          <p className="font-['Hanken_Grotesk'] text-[12.5px] leading-relaxed line-clamp-2" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.6)' }}>{lesson.outcome}</p>
        </div>
        <div className="flex flex-col items-end justify-between self-stretch gap-2 flex-shrink-0">
          <span className="inline-flex items-center gap-1 font-['Hanken_Grotesk'] text-[11px]" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.52)' }}><Clock size={11} /> {lesson.minutes} min</span>
        </div>
      </div>
    </Link>
  )
}

function StageBlock({ stage, index, isCompleted, currentId, defaultOpen, rm }) {
  const [open, setOpen] = useState(defaultOpen)
  const Icon = STAGE_ICONS[stage.icon] || Sprout
  const statusLabel = stage.allDone ? 'Completed' : stage.isCurrent ? 'You are here' : stage.done > 0 ? 'In progress' : 'Up next'
  return (
    <motion.section initial={rm ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
      className="desk-glass overflow-hidden" style={stage.isCurrent ? { borderColor: 'rgba(240,118,79,0.34)' } : undefined}>
      {/* stage header */}
      <button onClick={() => setOpen((o) => !o)} className="w-full text-start p-5 lg:p-6 flex items-start gap-4">
        <div className={`desk-track-badge flex-shrink-0 ${stage.allDone ? 'is-done' : ''}`} style={{ width: 52, height: 52 }}>
          {stage.allDone ? <Check size={22} strokeWidth={2.5} /> : <Icon size={22} strokeWidth={2} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="desk-mono text-[11px]" dir="ltr" style={{ color: 'var(--ink-3)' }}>STAGE {stage.order} OF {TOTAL_STAGES}</span>
            <span className="inline-flex items-center gap-1 font-['Hanken_Grotesk'] text-[11px] font-bold px-2 py-0.5 rounded-full" dir="ltr"
              style={stage.allDone
                ? { color: 'var(--ok)', background: 'var(--ok-soft)', border: '1px solid rgba(134,207,156,0.3)' }
                : stage.isCurrent
                  ? { color: 'var(--coral-deep)', background: 'var(--coral-soft)', border: '1px solid rgba(240,118,79,0.3)' }
                  : { color: 'var(--ink-3)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
              {statusLabel}
            </span>
          </div>
          <h2 className="font-['Fraunces'] font-medium text-[21px] lg:text-[23px] leading-tight mt-0.5" dir="ltr" style={{ color: 'var(--ink)' }}>{stage.en}</h2>
          <p className="font-['Hanken_Grotesk'] text-[12.5px] mt-1 leading-relaxed" dir="ltr" style={{ color: 'var(--ink-3)' }}>{stage.promise}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative grid place-items-center" style={{ width: 44, height: 44 }}>
            <StageRing pct={stage.pct} />
            <span className="absolute font-['Hanken_Grotesk'] font-bold text-[11px] tabular-nums" style={{ color: 'var(--ink)' }}>{stage.done}/{stage.total}</span>
          </div>
          <ChevronDown size={18} style={{ color: 'var(--ink-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }} />
        </div>
      </button>

      {/* stage body — the tracks + lesson stations */}
      {open && (
        <div className="px-5 lg:px-6 pb-6 pt-1 space-y-6">
          {stage.trackRows.map((t) => (
            <div key={t.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--coral)' }} />
                <h4 className="font-['Hanken_Grotesk'] font-extrabold text-[13px] tracking-wide uppercase" dir="ltr" style={{ color: 'var(--ink-2)' }}>{t.en}</h4>
                <span className="font-['Tajawal'] text-[12px]" style={{ color: 'var(--ink-3)' }}>{t.ar}</span>
                <span className="desk-mono text-[10.5px] ms-auto" dir="ltr" style={{ color: 'var(--ink-3)' }}>{t.done}/{t.total}</span>
              </div>
              <div className="desk-track-lessons">
                {t.lessons.map((lesson, li) => (
                  <LessonRow key={lesson.id} lesson={lesson} li={li} track={t} isCompleted={isCompleted} currentId={currentId} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  )
}

export default function DeskTrack() {
  const rm = useReducedMotion()
  const { isCompleted } = useCurriculumProgress()
  const { currentLesson, overall, stages, currentStageId } = useProgram()

  return (
    <div className="space-y-8 max-w-[860px]">
      {/* masthead */}
      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-1.5">
          <Compass size={14} style={{ color: 'var(--coral)' }} />
          <span className="font-['Hanken_Grotesk'] text-[11px] tracking-[0.22em]" dir="ltr" style={{ color: 'var(--coral)' }}>YOUR PLAN</span>
        </div>
        <h1 className="font-['Fraunces'] font-semibold text-[32px] lg:text-[40px] leading-tight tracking-[-0.01em]" dir="ltr" style={{ color: 'var(--ink)' }}>My Plan</h1>
        <p className="font-['Tajawal'] text-[13px] mt-1" style={{ color: 'var(--ink-3)' }}>خطّتي</p>
        <p className="font-['Hanken_Grotesk'] text-[14px] mt-2.5 max-w-[560px] leading-relaxed" dir="ltr" style={{ color: 'var(--ink-2)' }}>
          One path, four stages that build on each other. Do the next step — I’ll take you all the way.
        </p>
        <div className="mt-5 flex items-center gap-4 max-w-[520px]">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full rounded-full" initial={rm ? false : { width: 0 }} animate={{ width: `${overall.pct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: 'linear-gradient(90deg,#cf4a1c,#ef6a43)' }} />
          </div>
          <span className="font-['Hanken_Grotesk'] text-[13px] font-bold tabular-nums whitespace-nowrap" dir="ltr" style={{ color: 'var(--coral-deep)' }}>{overall.done} / {overall.total}</span>
        </div>
      </div>

      {/* continue card */}
      {currentLesson && (
        <motion.div initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1] }}
          className="desk-hero overflow-hidden">
          <Link to={`/desk/track/${currentLesson.id}`} className="group flex items-center gap-5 p-5 lg:p-6">
            <div className="desk-track-cont-mark flex-shrink-0">{currentLesson.programLabel?.split('.').slice(0, 2).join('.') || '›'}</div>
            <div className="min-w-0 flex-1">
              <p className="desk-eyebrow desk-eyebrow-accent mb-1">Continue · {currentLesson.trackEn}</p>
              <h2 className="font-['Fraunces'] font-medium text-lg lg:text-[22px] leading-tight truncate" dir="ltr" style={{ color: 'var(--ink)' }}>{currentLesson.en}</h2>
              <p className="font-['Tajawal'] text-[12.5px] mt-0.5 truncate" style={{ color: 'var(--ink-3)' }}>{currentLesson.ar}</p>
            </div>
            <span className="desk-cta flex-shrink-0 inline-flex items-center gap-2 px-5 h-11 rounded-2xl font-['Hanken_Grotesk'] font-bold text-[13px]" dir="ltr">Continue <ArrowRight size={16} /></span>
          </Link>
        </motion.div>
      )}

      {/* the 4 stages */}
      <div className="space-y-4">
        {stages.map((stage, i) => (
          <StageBlock key={stage.id} stage={stage} index={i} isCompleted={isCompleted} currentId={currentLesson?.id}
            defaultOpen={stage.id === currentStageId} rm={rm} />
        ))}
      </div>

      {/* footer — apply */}
      <div className="desk-glass p-5 flex items-center justify-between gap-4 desk-rise">
        <div className="min-w-0">
          <p className="font-['Hanken_Grotesk'] font-bold text-[14px]" dir="ltr" style={{ color: 'var(--cream)' }}>Ready to apply it?</p>
          <p className="font-['Hanken_Grotesk'] text-[12.5px] mt-0.5" dir="ltr" style={{ color: 'rgba(240, 234, 224,0.6)' }}>Every skill you learn, rehearse it live in a call scenario.</p>
        </div>
        <Link to="/desk/scenarios" className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl font-['Hanken_Grotesk'] font-bold text-[13px]" dir="ltr"
          style={{ color: 'var(--coral-deep)', background: 'rgba(240,118,79,0.10)', border: '1px solid rgba(240,118,79,0.26)' }}>
          Practice <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  )
}
