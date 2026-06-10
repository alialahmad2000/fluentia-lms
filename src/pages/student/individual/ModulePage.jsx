import { useEffect, useMemo, useState, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, ArrowLeft, Volume2, CheckCircle2, Target, Mic, PenLine,
  BookOpen, Quote, Loader2, Sparkles,
} from 'lucide-react'
import lazyRetry from '@/utils/lazyRetry'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import { useModule, MODULE_STAGES, stageDone } from '@/hooks/useIndividualTrack'
import { pronounceWord } from '@/lib/audio/pronounceWord'
import { useQueryClient } from '@tanstack/react-query'
import './individual.css'

const ConversationMode = lazyRetry(() => import('@/components/curriculum/speaking/ConversationMode'))

const STAGE_META = {
  brief: { label: 'المهمة', icon: Target },
  vocab: { label: 'المفردات', icon: BookOpen },
  phrases: { label: 'العبارات', icon: Quote },
  roleplay: { label: 'المحادثة', icon: Mic },
  writing: { label: 'الكتابة', icon: PenLine },
}

const countWords = (t) => (t || '').trim().split(/\s+/).filter(Boolean).length

export default function ModulePage() {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const g = useG()
  const reduce = useReducedMotion()
  const profile = useAuthStore((s) => s.profile)
  const queryClient = useQueryClient()
  const { module, progress, loading, completeStage } = useModule(moduleId)

  const firstOpen = useMemo(
    () => MODULE_STAGES.find((s) => !stageDone(progress, s)) || 'brief',
    // intentionally computed once per module load — tab switching stays manual after that
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [moduleId, loading]
  )
  const [stage, setStage] = useState(firstOpen)
  useEffect(() => { setStage(firstOpen) }, [firstOpen])

  const [writingText, setWritingText] = useState('')
  useEffect(() => {
    setWritingText(progress?.stage_state?.writing?.text || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, progress?.id])

  const isCompleted = progress?.status === 'completed'

  const goNextStage = (from) => {
    const idx = MODULE_STAGES.indexOf(from)
    if (idx < MODULE_STAGES.length - 1) setStage(MODULE_STAGES[idx + 1])
  }

  const markStage = async (s, extra) => {
    try {
      await completeStage.mutateAsync({ stage: s, extra })
      goNextStage(s)
    } catch {
      /* keep the student where they are; the button stays available */
    }
  }

  const fade = reduce
    ? {}
    : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }

  if (loading || !module) {
    return (
      <div className="iv-root flex items-center justify-center" style={{ minHeight: '50vh' }} dir="rtl">
        <Loader2 className="animate-spin" size={26} style={{ color: 'var(--iv-brass)' }} />
      </div>
    )
  }

  const wt = module.writing_task || {}
  const rp = module.roleplay || {}
  const wordCount = countWords(writingText)
  const minW = wt.min_words || 50
  const maxW = wt.max_words || 200

  return (
    <div className="iv-root relative" dir="rtl">
      <div className="iv-atmo" aria-hidden="true" />

      {/* header */}
      <header className="relative pt-1 pb-6">
        <button
          onClick={() => navigate('/student/track')}
          className="inline-flex items-center gap-1.5 text-[13px] mb-4 font-['Tajawal']"
          style={{ color: 'var(--iv-text-3)' }}
        >
          <ArrowRight size={15} /> المسار
        </button>
        <div className="iv-rule mb-3"><span className="iv-eyebrow">Mission {module.module_number} — {module.title_en}</span></div>
        <h1 className="font-['Tajawal'] font-bold" style={{ fontSize: 'clamp(23px, 3.2vw, 32px)' }}>{module.title_ar}</h1>
      </header>

      {/* stage stepper */}
      <nav className="relative flex gap-2 overflow-x-auto pb-1 mb-6" style={{ scrollbarWidth: 'none' }} aria-label="مراحل المهمة">
        {MODULE_STAGES.map((s) => {
          const Meta = STAGE_META[s]
          const done = stageDone(progress, s)
          return (
            <button
              key={s}
              className={`iv-stage-tab ${stage === s ? 'iv-stage-tab--active' : ''} ${done ? 'iv-stage-tab--done' : ''}`}
              onClick={() => setStage(s)}
            >
              {done ? <CheckCircle2 size={14} /> : <Meta.icon size={14} />}
              {Meta.label}
            </button>
          )
        })}
      </nav>

      <AnimatePresence mode="wait">
        {/* ── BRIEF ── */}
        {stage === 'brief' && (
          <motion.section key="brief" {...fade} className="relative iv-panel iv-panel--lit p-6 sm:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-7">
              <div>
                <div className="iv-rule mb-5"><span className="iv-eyebrow">الموقف</span></div>
                <p className="text-[16.5px] font-['Tajawal']" style={{ lineHeight: 2, color: 'var(--iv-text)', maxWidth: '62ch' }}>{module.scenario_ar}</p>
                <p className="mt-3 text-[14px]" style={{ lineHeight: 1.9, color: 'var(--iv-text-2)', fontStyle: 'italic', maxWidth: '62ch' }} dir="ltr">
                  {module.scenario_en}
                </p>
              </div>
              <div>
                <div className="iv-rule mb-4"><span className="iv-eyebrow">أهداف المهمة</span></div>
                <ul className="space-y-3">
                  {(module.objectives || []).map((o, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="iv-step-num" style={{ width: 26, height: 26, fontSize: 13, borderRadius: 9 }}>{i + 1}</span>
                      <div className="min-w-0">
                        <span className="block text-[14.5px] font-['Tajawal']" style={{ color: 'var(--iv-text)' }}>{o.ar}</span>
                        <span className="block text-[12.5px] mt-0.5" style={{ color: 'var(--iv-text-3)' }} dir="ltr">{o.en}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button className="iv-btn iv-btn--brass" disabled={completeStage.isPending} onClick={() => markStage('brief')}>
                {stageDone(progress, 'brief') ? 'التالي' : 'فهمت المهمة — لنبدأ'}
                <ArrowLeft size={16} />
              </button>
            </div>
          </motion.section>
        )}

        {/* ── VOCAB ── */}
        {stage === 'vocab' && (
          <motion.section key="vocab" {...fade} className="relative">
            <div className="iv-rule mb-4"><span className="iv-eyebrow">عتاد المهمة — {(module.vocabulary || []).length} مصطلحات</span></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(module.vocabulary || []).map((v, i) => (
                <div key={i} className="iv-term">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="iv-term-word truncate" dir="ltr">{v.term}</span>
                      {v.pos && <span className="iv-pos shrink-0">{v.pos}</span>}
                    </div>
                    <button
                      onClick={() => pronounceWord(v.term, { studentId: profile?.id })}
                      className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ border: '1px solid var(--iv-line)', color: 'var(--iv-brass)' }}
                      aria-label={`نطق ${v.term}`}
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                  <p className="mt-2 font-['Tajawal'] font-bold text-[15px]" style={{ color: 'var(--iv-brass-bright)' }}>{v.ar}</p>
                  <p className="mt-1 text-[13px]" style={{ color: 'var(--iv-text-2)', lineHeight: 1.7 }} dir="ltr">{v.def_en}</p>
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--iv-line-soft)' }}>
                    <p className="text-[13.5px]" style={{ color: 'var(--iv-text)', lineHeight: 1.7 }} dir="ltr">“{v.example}”</p>
                    <p className="text-[12.5px] mt-1 font-['Tajawal']" style={{ color: 'var(--iv-text-3)' }}>{v.example_ar}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-7 flex justify-end">
              <button className="iv-btn iv-btn--brass" disabled={completeStage.isPending} onClick={() => markStage('vocab')}>
                {stageDone(progress, 'vocab') ? 'التالي' : 'أتقنت المفردات'}
                <ArrowLeft size={16} />
              </button>
            </div>
          </motion.section>
        )}

        {/* ── PHRASES ── */}
        {stage === 'phrases' && (
          <motion.section key="phrases" {...fade} className="relative">
            <div className="iv-rule mb-4"><span className="iv-eyebrow">عبارات تصنع الحضور</span></div>
            <div className="space-y-3.5">
              {(module.phrases || []).map((p, i) => (
                <div key={i} className="iv-phrase">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15.5px] font-semibold" style={{ color: 'var(--iv-text)' }} dir="ltr">“{p.en}”</p>
                    <button
                      onClick={() => pronounceWord(p.en, { studentId: profile?.id })}
                      className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ border: '1px solid var(--iv-line)', color: 'var(--iv-brass)' }}
                      aria-label="استماع"
                    >
                      <Volume2 size={15} />
                    </button>
                  </div>
                  <p className="font-['Tajawal'] text-[14px]" style={{ color: 'var(--iv-brass-bright)' }}>{p.ar}</p>
                  {p.context_ar && <p className="text-[12.5px] font-['Tajawal']" style={{ color: 'var(--iv-text-3)' }}>{p.context_ar}</p>}
                </div>
              ))}
            </div>
            <div className="mt-7 flex justify-end">
              <button className="iv-btn iv-btn--brass" disabled={completeStage.isPending} onClick={() => markStage('phrases')}>
                {stageDone(progress, 'phrases') ? 'التالي' : g('جاهز للمحادثة', 'جاهزة للمحادثة')}
                <ArrowLeft size={16} />
              </button>
            </div>
          </motion.section>
        )}

        {/* ── ROLEPLAY ── */}
        {stage === 'roleplay' && (
          <motion.section key="roleplay" {...fade} className="relative">
            <div className="iv-rule mb-4"><span className="iv-eyebrow">تمثيل الموقف — صوتيًا</span></div>
            {rp.setting_ar && (
              <p className="mb-4 text-[14px] font-['Tajawal']" style={{ color: 'var(--iv-text-2)', lineHeight: 1.85 }}>
                <Sparkles size={14} style={{ display: 'inline', color: 'var(--iv-brass)', marginInlineEnd: 6 }} />
                {rp.setting_ar}
              </p>
            )}
            <Suspense fallback={<div className="iv-panel p-8 flex justify-center"><Loader2 className="animate-spin" style={{ color: 'var(--iv-brass)' }} /></div>}>
              {/* re-point the conversation surface's accent tokens at brass so the
                  roleplay stays inside the executive skin's one-accent discipline */}
              <div style={{
                '--ds-accent-primary': 'var(--iv-brass)',
                '--ds-accent-primary-glow': 'var(--iv-brass-glow)',
                '--ds-accent-secondary': 'var(--iv-brass-bright)',
              }}>
              <ConversationMode
                moduleId={moduleId}
                topic={{
                  title_en: rp.title_en || module.title_en,
                  prompt_en: rp.prompt_en,
                  prompt_ar: rp.prompt_ar,
                  useful_phrases: rp.useful_phrases || [],
                }}
                studentId={profile?.id}
                onComplete={() => {
                  // The grade fn wrote the roleplay stage + score server-side — refresh our view.
                  queryClient.invalidateQueries({ queryKey: ['module-progress'] })
                }}
              />
              </div>
            </Suspense>
            {stageDone(progress, 'roleplay') && (
              <div className="mt-5 flex justify-end">
                <button className="iv-btn iv-btn--ghost" onClick={() => setStage('writing')}>
                  إلى مرحلة الكتابة <ArrowLeft size={15} />
                </button>
              </div>
            )}
          </motion.section>
        )}

        {/* ── WRITING ── */}
        {stage === 'writing' && (
          <motion.section key="writing" {...fade} className="relative iv-panel p-6 sm:p-8">
            <div className="iv-rule mb-4"><span className="iv-eyebrow">{wt.title_ar || 'المهمة الكتابية'}</span></div>
            <p className="text-[15px] font-['Tajawal']" style={{ lineHeight: 1.95, color: 'var(--iv-text)' }}>{wt.prompt_ar}</p>
            {wt.prompt_en && (
              <p className="mt-2 text-[13.5px]" style={{ color: 'var(--iv-text-2)', lineHeight: 1.8 }} dir="ltr">{wt.prompt_en}</p>
            )}
            {Array.isArray(wt.hints) && wt.hints.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {wt.hints.map((h, i) => (
                  <li key={i} className="text-[13px] font-['Tajawal'] flex items-start gap-2" style={{ color: 'var(--iv-text-3)' }}>
                    <span style={{ color: 'var(--iv-brass)' }}>›</span> {h}
                  </li>
                ))}
              </ul>
            )}
            <textarea
              className="iv-textarea mt-5"
              dir="ltr"
              value={writingText}
              onChange={(e) => setWritingText(e.target.value)}
              placeholder="Write here in English…"
              disabled={stageDone(progress, 'writing')}
            />
            <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
              <span className="text-[12.5px] tabular-nums font-['Tajawal']" style={{ color: wordCount >= minW ? 'var(--iv-brass)' : 'var(--iv-text-3)' }}>
                {wordCount} / {minW}–{maxW} كلمة
              </span>
              {stageDone(progress, 'writing') ? (
                <span className="inline-flex items-center gap-1.5 text-[13.5px] font-['Tajawal'] font-bold" style={{ color: 'var(--iv-brass)' }}>
                  <CheckCircle2 size={15} /> تم التسليم — سيطلع عليها مدربك
                </span>
              ) : (
                <button
                  className="iv-btn iv-btn--brass"
                  disabled={wordCount < minW || completeStage.isPending}
                  onClick={() => markStage('writing', { text: writingText, words: wordCount })}
                >
                  {completeStage.isPending ? <Loader2 size={16} className="animate-spin" /> : null}
                  {g('سلّم المهمة', 'سلّمي المهمة')}
                </button>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* completion banner */}
      {isCompleted && (
        <motion.div
          initial={reduce ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative iv-panel iv-panel--lit p-6 mt-6 text-center"
        >
          <CheckCircle2 size={30} style={{ color: 'var(--iv-brass)', margin: '0 auto 8px' }} />
          <h3 className="font-['Tajawal'] font-bold text-[18px]">المهمة مكتملة — أداء احترافي بكل المقاييس</h3>
          {progress?.score != null && (
            <p className="mt-1 text-[13.5px] font-['Tajawal']" style={{ color: 'var(--iv-text-2)' }}>
              تقييم محادثتك: <span style={{ color: 'var(--iv-brass-bright)', fontWeight: 700 }}>{Number(progress.score)} / 10</span>
            </p>
          )}
          <button className="iv-btn iv-btn--brass mt-4" onClick={() => navigate('/student/track')}>
            إلى المهمة التالية <ArrowLeft size={16} />
          </button>
        </motion.div>
      )}
    </div>
  )
}
