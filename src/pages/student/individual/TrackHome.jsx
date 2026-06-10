import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Clock3, Lock, CheckCircle2 } from 'lucide-react'
import { useIndividualTrack, MODULE_STAGES, stageDone } from '@/hooks/useIndividualTrack'
import './individual.css'

/* /student/track — the full professional track for individual students.
   A numbered "portfolio index": completed → current (lit) → locked. */

export default function TrackHome() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const { specialization, loading, items, completedCount, total, trackPercent } = useIndividualTrack()

  const fade = reduce
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }

  return (
    <div className="iv-root relative" dir="rtl">
      <div className="iv-atmo" aria-hidden="true" />

      <motion.header {...fade} className="relative pt-2 pb-7">
        <div className="iv-rule mb-4"><span className="iv-eyebrow">{specialization?.title_en || 'Track'}</span></div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-['Tajawal'] font-bold" style={{ fontSize: 'clamp(24px, 3.4vw, 34px)' }}>
              مساري المهني{specialization ? ` — ${specialization.title_ar}` : ''}
            </h1>
            <p className="mt-2 text-[14.5px]" style={{ color: 'var(--iv-text-2)', maxWidth: 560, lineHeight: 1.85 }}>
              مهام واقعية من يوم العمل: لكل مهمة موقف، مفردات، عبارات، محادثة صوتية، وكتابة احترافية.
            </p>
          </div>
          <div className="iv-kpi" style={{ minWidth: 150 }}>
            <span className="iv-kpi-num">{completedCount}<span style={{ fontSize: 16, color: 'var(--iv-text-3)' }}> / {total}</span></span>
            <span className="iv-kpi-label">{trackPercent}% من المسار</span>
          </div>
        </div>
      </motion.header>

      <motion.div {...fade} className="relative iv-panel p-3 sm:p-5">
        {loading && <div style={{ height: 320 }} />}
        {(items || []).map((m, idx) => {
          const stagesDone = MODULE_STAGES.filter((s) => stageDone(m.progress, s)).length
          return (
            <div
              key={m.id}
              className={`iv-step ${m.completed ? 'iv-step--done' : ''} ${m.isCurrent ? 'iv-step--current' : ''} ${m.locked ? 'iv-step--locked' : 'iv-step--open'}`}
              onClick={() => { if (!m.locked) navigate(`/student/track/${m.id}`) }}
              role={m.locked ? undefined : 'button'}
              tabIndex={m.locked ? -1 : 0}
              onKeyDown={(e) => { if (e.key === 'Enter' && !m.locked) navigate(`/student/track/${m.id}`) }}
              style={{ alignItems: 'flex-start' }}
            >
              <div className="iv-step-num">{m.completed ? <CheckCircle2 size={19} /> : m.locked ? <Lock size={16} /> : m.module_number}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-['Tajawal'] font-bold text-[16px]" data-title-ar>{m.title_ar}</span>
                  <span className="text-[12.5px] iv-display" style={{ color: 'var(--iv-text-3)', fontWeight: 400 }}>{m.title_en}</span>
                </div>
                {!m.locked && (
                  <p className="mt-1.5 text-[13.5px]" style={{ color: 'var(--iv-text-2)', lineHeight: 1.8, maxWidth: 640 }}>
                    {m.scenario_ar}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-4 text-[12px]" style={{ color: 'var(--iv-text-3)' }}>
                  <span className="inline-flex items-center gap-1.5"><Clock3 size={12.5} /> {m.estimated_minutes} دقيقة</span>
                  {!m.locked && !m.completed && stagesDone > 0 && (
                    <span style={{ color: 'var(--iv-brass)' }}>{stagesDone} / {MODULE_STAGES.length} مراحل</span>
                  )}
                  {m.completed && m.progress?.score != null && (
                    <span style={{ color: 'var(--iv-brass)' }}>تقييم المحادثة {Number(m.progress.score)} / 10</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 self-center text-[12.5px] font-['Tajawal'] font-bold" style={{ color: m.completed ? 'var(--iv-brass)' : m.isCurrent ? 'var(--iv-brass-bright)' : 'var(--iv-text-3)' }}>
                {m.completed ? 'مكتملة ✓' : m.isCurrent ? '← المهمة الحالية' : m.locked ? <span className="iv-pos">بعد المهمة {m.module_number - 1}</span> : `${m.completion}%`}
              </div>
              {idx < items.length - 1 && <span className="iv-spine" aria-hidden="true" />}
            </div>
          )
        })}
        {!loading && !(items || []).length && (
          <p className="p-6 text-center text-[14px]" style={{ color: 'var(--iv-text-3)' }}>
            لم يُسند لك مسار بعد — يرجى التواصل مع الإدارة.
          </p>
        )}
      </motion.div>
    </div>
  )
}
