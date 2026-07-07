// DeskTrack (The Track) — the curriculum home. Not a course of lessons stacked in
// a list: a professional's progression map. Five tracks, each a titled "phase" of
// connected lesson stations over the Operations Room, with a lit rail marking
// how far she's come. English-primary, Arabic as a small gloss. Classy,
// brass-on-obsidian, RTL. Creditless (authored).
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Compass, ArrowLeft, Clock, Check, Headset, Zap, PenLine, Cpu, HeartHandshake, ChevronLeft } from 'lucide-react'
import { CURRICULUM_TRACKS, ALL_LESSONS } from '@/data/desk/curriculum'
import { useCurriculumProgress } from './useCurriculumProgress'
import './desk.css'

const TRACK_ICONS = { Zap, Headset, PenLine, Cpu, HeartHandshake }

export default function DeskTrack() {
  const rm = useReducedMotion()
  const { isCompleted, overall, byTrack, currentLessonId } = useCurriculumProgress()
  const current = currentLessonId ? ALL_LESSONS.find((l) => l.id === currentLessonId) : null

  return (
    <div className="space-y-9">
      {/* ── masthead ── */}
      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-1.5">
          <Compass size={14} style={{ color: 'var(--brass)' }} />
          <span className="font-['Inter'] text-[11px] tracking-[0.22em]" dir="ltr" style={{ color: 'var(--brass)' }}>PROFESSIONAL TRACK</span>
        </div>
        <h1 className="font-['Inter'] font-extrabold text-2xl lg:text-[32px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>Your Track</h1>
        <p className="font-['Tajawal'] text-[12px] mt-1" style={{ color: 'rgba(243,238,226,0.5)' }}>المسار</p>
        <p className="font-['Inter'] text-[14px] mt-2.5 max-w-[560px] leading-relaxed" dir="ltr" style={{ color: 'rgba(243,238,226,0.6)' }}>
          Your professional curriculum — not generic lessons, but the skills you actually need on calls, in meetings, and in writing. Every lesson you apply straight away in a scenario.
        </p>

        {/* overall readout */}
        <div className="mt-5 flex items-center gap-4 max-w-[520px]">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full rounded-full" initial={rm ? false : { width: 0 }} animate={{ width: `${overall.pct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: 'linear-gradient(90deg,#c9a25c,#efd299)' }} />
          </div>
          <span className="font-['Inter'] text-[13px] font-bold tabular-nums whitespace-nowrap" dir="ltr" style={{ color: 'var(--brass-hi)' }}>
            {overall.done} / {overall.total} lessons
          </span>
        </div>
      </div>

      {/* ── continue card ── */}
      {current && (
        <motion.div initial={rm ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease: [0.16, 1, 0.3, 1] }}
          className="desk-glass overflow-hidden" style={{ borderColor: 'rgba(201,162,92,0.24)' }}>
          <Link to={`/desk/track/${current.id}`} className="group flex items-center gap-5 p-5 lg:p-6">
            <div className="desk-track-cont-mark">{current.label}</div>
            <div className="min-w-0 flex-1">
              <p className="font-['Inter'] text-[11px] font-bold mb-1 uppercase tracking-wider" dir="ltr" style={{ color: 'var(--brass)' }}>Continue here · {current.trackEn}</p>
              <h2 className="font-['Inter'] font-extrabold text-lg lg:text-xl leading-tight truncate" dir="ltr" style={{ color: 'var(--cream)' }}>{current.en}</h2>
              <p className="font-['Tajawal'] text-[12.5px] mt-0.5 truncate" style={{ color: 'rgba(243,238,226,0.5)' }}>{current.ar}</p>
            </div>
            <span className="desk-cta flex-shrink-0 inline-flex items-center gap-2 px-5 h-11 rounded-2xl font-['Inter'] font-bold text-[13px]" dir="ltr">
              Start <ArrowLeft size={16} />
            </span>
          </Link>
        </motion.div>
      )}

      {/* ── the tracks ── */}
      <div className="space-y-12">
        {CURRICULUM_TRACKS.map((track, ti) => {
          const Icon = TRACK_ICONS[track.icon] || Zap
          const prog = byTrack[track.id] || { done: 0, total: track.lessons.length }
          const trackDone = prog.done === prog.total
          return (
            <section key={track.id} className="desk-rise" style={{ animationDelay: `${ti * 60}ms` }}>
              {/* track header */}
              <div className="flex items-start gap-4 mb-5">
                <div className={`desk-track-badge ${trackDone ? 'is-done' : ''}`}>
                  <Icon size={19} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <h2 className="font-['Inter'] font-extrabold text-xl lg:text-[22px] leading-tight" dir="ltr" style={{ color: 'var(--cream)' }}>
                      <span className="font-['Inter'] font-black text-[13px] align-middle me-1.5" style={{ color: 'var(--brass)' }} dir="ltr">{ti + 1}</span>
                      {track.en}
                    </h2>
                    <span className="font-['Tajawal'] text-[13px]" style={{ color: 'rgba(243,238,226,0.45)' }}>{track.ar}</span>
                  </div>
                  <p className="font-['Inter'] text-[13px] mt-1 leading-relaxed" dir="ltr" style={{ color: 'rgba(243,238,226,0.55)' }}>{track.tagline}</p>
                </div>
                <span className="flex-shrink-0 font-['Inter'] text-[12px] font-bold tabular-nums mt-1.5" dir="ltr" style={{ color: trackDone ? 'var(--brass-hi)' : 'rgba(243,238,226,0.5)' }}>
                  {prog.done}/{prog.total}
                </span>
              </div>

              {/* lesson stations */}
              <div className="desk-track-lessons">
                {track.lessons.map((lesson, li) => {
                  const globalLabel = `${ti + 1}.${li + 1}`
                  const done = isCompleted(lesson.id)
                  const isCurrent = lesson.id === currentLessonId
                  const prevDone = li === 0 ? true : isCompleted(track.lessons[li - 1].id)
                  return (
                    <Link key={lesson.id} to={`/desk/track/${lesson.id}`} className="group desk-lesson-row">
                      {/* spine + node */}
                      <div className="desk-lesson-spine">
                        {li > 0 && <span className={`desk-lesson-line top ${prevDone ? 'is-lit' : ''}`} />}
                        {li < track.lessons.length - 1 && <span className={`desk-lesson-line bottom ${done ? 'is-lit' : ''}`} />}
                        <span className={`desk-lesson-node ${done ? 'is-done' : isCurrent ? 'is-current' : ''}`}>
                          {done ? <Check size={13} strokeWidth={3} /> : <span className="desk-lesson-node-idx">{globalLabel}</span>}
                        </span>
                      </div>
                      {/* content */}
                      <div className="desk-lesson-card">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h3 className="font-['Inter'] font-bold text-[15px] leading-snug" dir="ltr" style={{ color: 'var(--cream)' }}>{lesson.en}</h3>
                            {lesson.scenarioModuleNumber && (
                              <span className="desk-lesson-tag" dir="ltr"><Headset size={11} /> With scenario</span>
                            )}
                          </div>
                          <p className="font-['Tajawal'] text-[12.5px] mb-1.5" style={{ color: 'rgba(243,238,226,0.5)' }}>{lesson.ar}</p>
                          <p className="font-['Inter'] text-[12.5px] leading-relaxed line-clamp-2" dir="ltr" style={{ color: 'rgba(243,238,226,0.55)' }}>{lesson.outcome}</p>
                        </div>
                        <div className="flex flex-col items-end justify-between self-stretch gap-2 flex-shrink-0">
                          <span className="inline-flex items-center gap-1 font-['Inter'] text-[11px]" dir="ltr" style={{ color: 'rgba(243,238,226,0.42)' }}>
                            <Clock size={11} /> {lesson.minutes} min
                          </span>
                          <ChevronLeft size={17} className="desk-lesson-chev" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {/* footer — tie to scenarios */}
      <div className="desk-glass p-5 flex items-center justify-between gap-4 desk-rise">
        <div className="min-w-0">
          <p className="font-['Inter'] font-bold text-[14px]" dir="ltr" style={{ color: 'var(--cream)' }}>Ready to apply it?</p>
          <p className="font-['Inter'] text-[12.5px] mt-0.5" dir="ltr" style={{ color: 'rgba(243,238,226,0.55)' }}>Every skill you learn, try it live in a scenario call.</p>
        </div>
        <Link to="/desk/scenarios" className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl font-['Inter'] font-bold text-[13px]" dir="ltr"
          style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.10)', border: '1px solid rgba(201,162,92,0.24)' }}>
          Scenarios <ArrowLeft size={15} />
        </Link>
      </div>
    </div>
  )
}
