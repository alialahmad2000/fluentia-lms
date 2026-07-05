// DeskTrack (المسار) — the curriculum home. Not a course of lessons stacked in a
// list: a professional's progression map. Five tracks, each a titled "phase" of
// connected lesson stations over the Operations Room, with a lit rail marking
// how far she's come. Classy, brass-on-obsidian, RTL. Creditless (authored).
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Compass, ArrowLeft, Clock, Check, Headset, Zap, PenLine, Cpu, HeartHandshake, ChevronLeft } from 'lucide-react'
import { useG } from '@/i18n/gender'
import { CURRICULUM_TRACKS, ALL_LESSONS } from '@/data/desk/curriculum'
import { useCurriculumProgress } from './useCurriculumProgress'
import './desk.css'

const TRACK_ICONS = { Zap, Headset, PenLine, Cpu, HeartHandshake }

export default function DeskTrack() {
  const g = useG()
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
        <h1 className="font-['Tajawal'] font-extrabold text-2xl lg:text-[32px] leading-tight" style={{ color: 'var(--cream)' }}>المسار</h1>
        <p className="font-['Tajawal'] text-[14px] mt-1.5 max-w-[560px]" style={{ color: 'rgba(243,238,226,0.58)' }}>
          {g('منهجك المهني المصمّم لشغلك — مو دروس عامة، بل المهارات اللي تحتاجها فعلاً في المكالمات والاجتماعات والكتابة. كل درس تطبّقه مباشرة في سيناريو.',
             'منهجك المهني المصمّم لشغلك — مو دروس عامة، بل المهارات اللي تحتاجينها فعلاً في المكالمات والاجتماعات والكتابة. كل درس تطبّقينه مباشرة في سيناريو.')}
        </p>

        {/* overall readout */}
        <div className="mt-5 flex items-center gap-4 max-w-[520px]">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div className="h-full rounded-full" initial={rm ? false : { width: 0 }} animate={{ width: `${overall.pct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: 'linear-gradient(90deg,#c9a25c,#efd299)' }} />
          </div>
          <span className="font-['Tajawal'] text-[13px] font-bold tabular-nums whitespace-nowrap" style={{ color: 'var(--brass-hi)' }}>
            {overall.done} / {overall.total} {g('درس', 'درس')}
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
              <p className="font-['Tajawal'] text-[11px] font-bold mb-1" style={{ color: 'var(--brass)' }}>{g('تابع من هنا', 'تابعي من هنا')} · {current.trackAr}</p>
              <h2 className="font-['Tajawal'] font-extrabold text-lg lg:text-xl leading-tight truncate" style={{ color: 'var(--cream)' }}>{current.ar}</h2>
              <p className="font-['Inter'] text-[12px] mt-0.5 truncate" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>{current.en}</p>
            </div>
            <span className="desk-cta flex-shrink-0 inline-flex items-center gap-2 px-5 h-11 rounded-2xl font-['Tajawal'] font-bold text-[13px]">
              {g('ابدأ', 'ابدئي')} <ArrowLeft size={16} />
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
                    <h2 className="font-['Tajawal'] font-extrabold text-xl lg:text-[22px] leading-tight" style={{ color: 'var(--cream)' }}>
                      <span className="font-['Inter'] font-black text-[13px] align-middle ms-1" style={{ color: 'var(--brass)' }} dir="ltr">{ti + 1}</span>
                      {track.ar}
                    </h2>
                    <span className="font-['Inter'] text-[12px]" dir="ltr" style={{ color: 'rgba(243,238,226,0.45)' }}>{track.en}</span>
                  </div>
                  <p className="font-['Tajawal'] text-[13px] mt-1 leading-relaxed" style={{ color: 'rgba(243,238,226,0.5)' }}>{track.tagline_ar}</p>
                </div>
                <span className="flex-shrink-0 font-['Tajawal'] text-[12px] font-bold tabular-nums mt-1.5" style={{ color: trackDone ? 'var(--brass-hi)' : 'rgba(243,238,226,0.5)' }}>
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
                            <h3 className="font-['Tajawal'] font-bold text-[15px] leading-snug" style={{ color: 'var(--cream)' }}>{lesson.ar}</h3>
                            {lesson.scenarioModuleNumber && (
                              <span className="desk-lesson-tag"><Headset size={11} /> {g('مع سيناريو', 'مع سيناريو')}</span>
                            )}
                          </div>
                          <p className="font-['Inter'] text-[12px] mb-1.5" dir="ltr" style={{ color: 'rgba(243,238,226,0.55)' }}>{lesson.en}</p>
                          <p className="font-['Tajawal'] text-[12.5px] leading-relaxed line-clamp-2" style={{ color: 'rgba(243,238,226,0.55)' }}>{lesson.outcome_ar}</p>
                        </div>
                        <div className="flex flex-col items-end justify-between self-stretch gap-2 flex-shrink-0">
                          <span className="inline-flex items-center gap-1 font-['Tajawal'] text-[11px]" style={{ color: 'rgba(243,238,226,0.42)' }}>
                            <Clock size={11} /> {lesson.minutes} {g('د', 'د')}
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
          <p className="font-['Tajawal'] font-bold text-[14px]" style={{ color: 'var(--cream)' }}>{g('جاهز تطبّق؟', 'جاهزة تطبّقين؟')}</p>
          <p className="font-['Tajawal'] text-[12.5px] mt-0.5" style={{ color: 'rgba(243,238,226,0.5)' }}>{g('كل مهارة تعلّمتها، جرّبها حيّة في مكالمة سيناريو.', 'كل مهارة تعلّمتيها، جرّبيها حيّة في مكالمة سيناريو.')}</p>
        </div>
        <Link to="/desk/scenarios" className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 px-4 h-10 rounded-xl font-['Tajawal'] font-bold text-[13px]"
          style={{ color: 'var(--brass-hi)', background: 'rgba(201,162,92,0.10)', border: '1px solid rgba(201,162,92,0.24)' }}>
          {g('السيناريوهات', 'السيناريوهات')} <ArrowLeft size={15} />
        </Link>
      </div>
    </div>
  )
}
