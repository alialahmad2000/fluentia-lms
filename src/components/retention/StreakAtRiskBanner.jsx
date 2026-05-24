// StreakAtRiskBanner — shows after 18:00 Riyadh time if the student has a
// current streak but no activity today. Soft nudge, dismissible.
// Mounted on StudentDashboard inside RetentionDashboardSection.

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, X } from 'lucide-react'
import { useStreakSnapshot, useStreakHeatMap } from '../../lib/retention/useStreak.js'

const DISMISS_KEY = 'fluentia:retention:streak-at-risk-dismissed'

function isAfter6PmRiyadh() {
  const nowRiyadh = new Date(Date.now() + 3 * 60 * 60 * 1000)
  return nowRiyadh.getUTCHours() >= 18
}

function todayRiyadhKey() {
  const t = new Date(Date.now() + 3 * 60 * 60 * 1000)
  t.setUTCHours(0, 0, 0, 0)
  return t.toISOString().slice(0, 10)
}

export default function StreakAtRiskBanner() {
  const snap = useStreakSnapshot()
  const heat = useStreakHeatMap({ days: 2 })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY)
      if (raw === todayRiyadhKey()) setDismissed(true)
    } catch {}
  }, [])

  if (dismissed) return null
  if (!snap.data || !heat.data) return null
  if (snap.data.current < 1) return null
  if (!isAfter6PmRiyadh()) return null

  const todayBucket = heat.data.find((d) => d.date === todayRiyadhKey())
  if (todayBucket && todayBucket.activity_count > 0) return null

  const handleDismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, todayRiyadhKey())
    } catch {}
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.25 }}
        className="relative flex items-center gap-3 p-4 mb-5"
        style={{
          background: 'color-mix(in srgb, var(--ds-amber) 12%, var(--ds-bg-elevated))',
          border: '1px solid color-mix(in srgb, var(--ds-amber) 35%, transparent)',
          borderRadius: 'var(--radius-md)',
        }}
        dir="rtl"
      >
        <div
          className="w-10 h-10 flex items-center justify-center shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--ds-amber) 22%, transparent)',
            color: 'var(--ds-amber)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <Flame size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-semibold text-sm md:text-base"
            style={{ color: 'var(--ds-text-primary)' }}
          >
            سلسلتك ({snap.data.current} يوم) على وشك الانتهاء
          </div>
          <div
            className="text-xs md:text-sm mt-0.5"
            style={{ color: 'var(--ds-text-secondary)' }}
          >
            أي نشاط بسيط اليوم يحافظ عليها — محادثة قصيرة أو تمارين
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="w-8 h-8 flex items-center justify-center opacity-60 hover:opacity-100 transition"
          style={{
            color: 'var(--ds-text-secondary)',
            borderRadius: 'var(--radius-full)',
          }}
          aria-label="إخفاء"
        >
          <X size={16} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
