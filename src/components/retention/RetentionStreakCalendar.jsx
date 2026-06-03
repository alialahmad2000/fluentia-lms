// RetentionStreakCalendar — last 30 days of activity as a 7-wide heat-map.
// Mounted on StudentDashboard below the Hero. Gated on retention_modules
// streak_activation = true via the wrapper (RetentionDashboardSection).

import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { useStreakSnapshot, useStreakHeatMap } from '../../lib/retention/useStreak.js'
import RetentionCard from '../../design-system/retention/RetentionCard.jsx'
import { useG } from '../../i18n/gender.js'

const WEEKDAY_LABELS_AR = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت']

function colorForActivity(count) {
  if (count === 0) return 'color-mix(in srgb, var(--ds-text-tertiary) 14%, transparent)'
  if (count <= 1) return 'color-mix(in srgb, var(--ds-accent-success) 32%, transparent)'
  if (count <= 3) return 'color-mix(in srgb, var(--ds-accent-success) 56%, transparent)'
  return 'var(--ds-accent-success)'
}

export default function RetentionStreakCalendar() {
  const g = useG()
  const snap = useStreakSnapshot()
  const heat = useStreakHeatMap({ days: 30 })

  const current = snap.data?.current ?? 0
  const longest = snap.data?.longest ?? 0
  const days = heat.data || []

  const isLoading = snap.isLoading || heat.isLoading

  return (
    <RetentionCard
      moduleKey="streak_activation"
      title={current >= 3 ? `سلسلتك ${current} يوم 🔥` : 'سلسلتك اليومية'}
      subtitle={
        current === 0
          ? g('ابدأ اليوم — أي نشاط بسيط يعدّ', 'ابدئي اليوم — أي نشاط بسيط يعدّ')
          : current === 1
          ? g('يوم واحد — بداية جيدة، خلّها سلسلة', 'يوم واحد — بداية جيدة، خلّيها سلسلة')
          : `آخر ${days.length} يوم نشاطك`
      }
      icon={<Flame size={20} />}
      badge={longest > 0 ? `أطول: ${longest}` : null}
      variant={current >= 3 ? 'featured' : 'default'}
    >
      <div className="mt-2">
        {/* Weekday header */}
        <div
          className="grid mb-2 text-center"
          style={{
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            color: 'var(--ds-text-tertiary)',
            fontSize: 11,
          }}
        >
          {WEEKDAY_LABELS_AR.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Heat grid */}
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
        >
          {isLoading
            ? Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square"
                  style={{
                    background: 'var(--ds-surface-2)',
                    borderRadius: 'var(--radius-sm)',
                    opacity: 0.4,
                  }}
                />
              ))
            : days.map((d, i) => (
                <motion.div
                  key={d.date}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.008, duration: 0.18 }}
                  className="aspect-square relative"
                  style={{
                    background: colorForActivity(d.activity_count),
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--ds-border-subtle)',
                  }}
                  title={`${d.date} — ${d.activity_count} نشاط`}
                />
              ))}
        </div>

        {/* Legend */}
        <div
          className="mt-3 flex items-center justify-between text-xs"
          style={{ color: 'var(--ds-text-tertiary)' }}
        >
          <span>أقل</span>
          <div className="flex gap-1.5 items-center">
            {[0, 1, 2, 4].map((n, i) => (
              <div
                key={i}
                className="w-3 h-3"
                style={{
                  background: colorForActivity(n),
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--ds-border-subtle)',
                }}
              />
            ))}
          </div>
          <span>أكثر</span>
        </div>
      </div>
    </RetentionCard>
  )
}
