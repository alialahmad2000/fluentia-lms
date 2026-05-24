// /student/retention/brief/:deliveryId — full brief view
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, BookOpen, CheckCircle2, ChevronLeft, Sparkles } from 'lucide-react'
import {
  useBriefDelivery,
  useMarkBriefOpened,
  useSubmitBriefSelfCheck,
} from '../../../lib/retention/useBriefs'
import { useRetentionModuleEnabled } from '../../../lib/retention/useRetentionModule'
import { RETENTION_MODULES } from '../../../lib/retention/constants'
import AuroraBackground from '../../../design-system/components/AuroraBackground'
import GlassPanel from '../../../design-system/components/GlassPanel'
import RetentionAudioPlayer from '../../../design-system/retention/RetentionAudioPlayer'
import RetentionDisabledState from '../../../design-system/retention/RetentionDisabledState'

export default function BriefView() {
  const { deliveryId } = useParams()
  const navigate = useNavigate()
  const moduleEnabled = useRetentionModuleEnabled(RETENTION_MODULES.LESSON_BRIEFS)
  const { data, isLoading } = useBriefDelivery(deliveryId)
  const markOpened = useMarkBriefOpened()
  const submit = useSubmitBriefSelfCheck()
  const [selectedAnswer, setSelectedAnswer] = useState(null)

  useEffect(() => {
    if (data && !data.opened_at) {
      markOpened.mutate(deliveryId)
    }
  }, [data, deliveryId, markOpened])

  if (moduleEnabled.isLoading || isLoading) {
    return <div className="p-8" dir="rtl"><div className="h-40 animate-pulse rounded-xl" style={{ background: 'var(--ds-surface-1)' }} /></div>
  }
  if (!moduleEnabled.enabled) {
    return <RetentionDisabledState moduleLabel="ملخّصات الكلاس" />
  }
  if (!data) {
    return <div className="p-8 text-center" dir="rtl" style={{ color: 'var(--ds-text-secondary)' }}>الملخص غير متوفر.</div>
  }

  const brief = data.brief
  const isPrep = brief.brief_type === 'prep'

  const handleSubmitCheck = () => {
    if (!selectedAnswer) return
    submit.mutate({
      deliveryId,
      answer: selectedAnswer,
      isCorrect: selectedAnswer === brief.self_check_correct,
    })
  }

  const answered = !!data.self_check_answer
  const wasCorrect = data.self_check_correct === true

  return (
    <div className="relative min-h-screen" dir="rtl">
      <AuroraBackground />
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5 relative">
        <button
          onClick={() => navigate('/student')}
          className="flex items-center gap-1 text-sm"
          style={{ color: 'var(--ds-text-secondary)' }}
        >
          <ChevronLeft size={16} />
          الرئيسية
        </button>

        <GlassPanel padding="lg">
          <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
            <Clock size={14} />
            {isPrep ? 'قبل الكلاس · ٦٠ ثانية' : 'بعد الكلاس · ٩٠ ثانية'}
          </div>
          <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--ds-text-primary)' }}>
            {brief.title_ar}
          </h1>

          {brief.audio_path && (
            <RetentionAudioPlayer
              src={brief.audio_path}
              label="الاستماع للملخص"
              className="mb-4"
            />
          )}

          <div
            className="prose-ar text-base leading-relaxed whitespace-pre-line"
            style={{ color: 'var(--ds-text-secondary)' }}
          >
            {brief.body_ar}
          </div>

          {brief.vocab_words && brief.vocab_words.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--ds-text-tertiary)' }}>
                مفردات مفتاحية
              </div>
              <div className="flex flex-wrap gap-2">
                {brief.vocab_words.map((w, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-sm"
                    style={{
                      background: 'color-mix(in srgb, var(--ds-accent-primary) 14%, transparent)',
                      color: 'var(--ds-accent-primary)',
                      borderRadius: 'var(--radius-full)',
                      direction: 'ltr',
                      display: 'inline-block',
                    }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </GlassPanel>

        {!isPrep && brief.self_check_question_ar && (
          <GlassPanel padding="lg">
            <div className="flex items-center gap-2 mb-3 text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
              <Sparkles size={14} />
              مراجعة سريعة
            </div>
            <p className="text-base font-semibold mb-4" style={{ color: 'var(--ds-text-primary)' }}>
              {brief.self_check_question_ar}
            </p>
            <div className="space-y-2">
              {(brief.self_check_options || []).map((opt) => {
                const isPicked = (answered ? data.self_check_answer : selectedAnswer) === opt.key
                const isCorrectOpt = answered && opt.key === brief.self_check_correct
                return (
                  <motion.button
                    key={opt.key}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => !answered && setSelectedAnswer(opt.key)}
                    disabled={answered}
                    className="w-full text-right p-4 transition"
                    style={{
                      background: isCorrectOpt
                        ? 'color-mix(in srgb, var(--ds-accent-success) 18%, var(--ds-surface-1))'
                        : isPicked
                        ? 'color-mix(in srgb, var(--ds-accent-primary) 18%, var(--ds-surface-1))'
                        : 'var(--ds-surface-1)',
                      border: '1px solid ' + (isCorrectOpt
                        ? 'var(--ds-accent-success)'
                        : isPicked ? 'var(--ds-accent-primary)' : 'var(--ds-border-subtle)'),
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--ds-text-primary)',
                    }}
                  >
                    {opt.text}
                  </motion.button>
                )
              })}
            </div>
            {!answered ? (
              <button
                onClick={handleSubmitCheck}
                disabled={!selectedAnswer || submit.isPending}
                className="w-full mt-4 font-semibold py-3"
                style={{
                  background: selectedAnswer ? 'var(--ds-accent-primary)' : 'var(--ds-surface-2)',
                  color: selectedAnswer ? 'var(--ds-text-inverse)' : 'var(--ds-text-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  opacity: selectedAnswer ? 1 : 0.6,
                }}
              >
                {submit.isPending ? 'جاري الحفظ…' : 'تحقّق'}
              </button>
            ) : (
              <div
                className="mt-4 p-3 flex items-center gap-2 text-sm font-semibold"
                style={{
                  background: wasCorrect
                    ? 'color-mix(in srgb, var(--ds-accent-success) 12%, transparent)'
                    : 'color-mix(in srgb, var(--ds-amber) 12%, transparent)',
                  color: wasCorrect ? 'var(--ds-accent-success)' : 'var(--ds-amber)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <CheckCircle2 size={16} />
                {wasCorrect ? 'إجابة صحيحة — أحسنتِ!' : 'الإجابة الصحيحة موضّحة أعلاه — راجعيها'}
              </div>
            )}
          </GlassPanel>
        )}

        {!isPrep && brief.mini_task_ar && (
          <GlassPanel padding="lg">
            <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
              <BookOpen size={14} />
              مهمة قصيرة
            </div>
            <p className="text-base leading-relaxed" style={{ color: 'var(--ds-text-secondary)' }}>
              {brief.mini_task_ar}
            </p>
            <p className="text-xs mt-3" style={{ color: 'var(--ds-text-tertiary)' }}>
              اكتبيها على ورقة أو في مذكّرتكِ — لا تحتاج تسليم.
            </p>
          </GlassPanel>
        )}
      </div>
    </div>
  )
}
