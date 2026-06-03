// WeeklyChallengeCard — current week's retention challenge progress.
// Renders nothing if no assignment exists (Module 4 disabled OR cron hasn't
// run yet this Sunday). Animates the progress bar; celebrates on completion.

import { motion } from 'framer-motion'
import { Trophy, Target, CheckCircle2 } from 'lucide-react'
import { useCurrentWeeklyChallenge } from '../../lib/retention/useStreak.js'
import RetentionCard from '../../design-system/retention/RetentionCard.jsx'
import { useG } from '../../i18n/gender.js'

export default function WeeklyChallengeCard() {
  const g = useG()
  const { data, isLoading } = useCurrentWeeklyChallenge()

  if (!data && !isLoading) return null
  if (isLoading) {
    return (
      <RetentionCard
        moduleKey="streak_activation"
        title="تحدي الأسبوع"
        icon={<Trophy size={20} />}
      >
        <div
          className="h-6 rounded mt-2"
          style={{ background: 'var(--ds-surface-2)', opacity: 0.5 }}
        />
      </RetentionCard>
    )
  }

  const challenge = data.challenge
  const progress = data.current_progress ?? 0
  const target = data.target_value ?? challenge?.target_value ?? 1
  const pct = Math.min(100, Math.round((progress / target) * 100))
  const isDone = data.completed

  return (
    <RetentionCard
      moduleKey="streak_activation"
      title={challenge?.title_ar || 'تحدي الأسبوع'}
      subtitle={challenge?.description_ar}
      icon={isDone ? <CheckCircle2 size={20} /> : <Target size={20} />}
      badge={isDone ? 'مكتمل ✓' : null}
      variant={isDone ? 'featured' : 'default'}
    >
      <div className="mt-2">
        <div
          className="flex items-baseline justify-between mb-2"
          style={{ color: 'var(--ds-text-secondary)' }}
        >
          <span className="text-sm">
            {progress} / {target}
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: 'var(--ds-accent-gold)' }}
          >
            مكافأة: +{data.reward_xp} XP
          </span>
        </div>
        <div
          className="h-3 overflow-hidden"
          style={{
            background: 'var(--ds-surface-2)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--ds-border-subtle)',
          }}
        >
          <motion.div
            className="h-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              background: isDone
                ? 'var(--ds-accent-success)'
                : 'linear-gradient(90deg, var(--ds-accent-primary), var(--ds-accent-gold))',
              borderRadius: 'var(--radius-full)',
            }}
          />
        </div>
        {isDone && data.completed_at && (
          <div
            className="mt-2 text-xs"
            style={{ color: 'var(--ds-accent-success)' }}
          >
            {g('أتممته — أحسنت! 🎯', 'أتممتيه — أحسنتِ! 🎯')}
          </div>
        )}
      </div>
    </RetentionCard>
  )
}
