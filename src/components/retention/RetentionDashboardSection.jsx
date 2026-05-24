// RetentionDashboardSection — single mount point on StudentDashboard for ALL
// retention surfaces. Each card respects its own per-student per-module flag
// via the useRetentionModuleEnabled hook, so admin can selectively expose
// modules per student without code changes.
//
// Imported lazily; safe to render even when ALL modules are disabled (renders
// null cleanly).

import RetentionStreakCalendar from './RetentionStreakCalendar.jsx'
import WeeklyChallengeCard from './WeeklyChallengeCard.jsx'
import StreakAtRiskBanner from './StreakAtRiskBanner.jsx'
import { useRetentionModuleEnabled } from '../../lib/retention/useRetentionModule.js'
import { RETENTION_MODULES } from '../../lib/retention/constants.js'

export default function RetentionDashboardSection() {
  const streak = useRetentionModuleEnabled(RETENTION_MODULES.STREAK_ACTIVATION)
  // Future module gates will hook in here (daily_partner, smart_homework,
  // weekly_reports, lesson_briefs) as their dashboard cards land in
  // Blocks 3–6.

  // Module 4 (streak activation) UI block
  const showStreakBlock = streak.enabled

  if (!showStreakBlock) return null

  return (
    <section className="mb-8" dir="rtl">
      <StreakAtRiskBanner />
      <div className="grid gap-6 md:grid-cols-2">
        <RetentionStreakCalendar />
        <WeeklyChallengeCard />
      </div>
    </section>
  )
}
