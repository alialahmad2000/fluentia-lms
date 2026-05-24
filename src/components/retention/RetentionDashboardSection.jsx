// RetentionDashboardSection — single mount point on StudentDashboard for ALL
// retention surfaces. Each card respects its own per-student per-module flag
// via the useRetentionModuleEnabled hook, so admin can selectively expose
// modules per student without code changes.
//
// Imported lazily; safe to render even when ALL modules are disabled (renders
// null cleanly).

import { useNavigate } from 'react-router-dom'
import { Pencil, MessageCircle } from 'lucide-react'
import RetentionStreakCalendar from './RetentionStreakCalendar.jsx'
import WeeklyChallengeCard from './WeeklyChallengeCard.jsx'
import StreakAtRiskBanner from './StreakAtRiskBanner.jsx'
import PendingBriefsCard from './PendingBriefsCard.jsx'
import RetentionCard from '../../design-system/retention/RetentionCard.jsx'
import { useRetentionModuleEnabled } from '../../lib/retention/useRetentionModule.js'
import { RETENTION_MODULES } from '../../lib/retention/constants.js'
import { useActiveHomeworkSet } from '../../lib/retention/useHomework.js'
import { useTodayScenario } from '../../lib/retention/useDialogue.js'

export default function RetentionDashboardSection() {
  const navigate = useNavigate()
  const streak = useRetentionModuleEnabled(RETENTION_MODULES.STREAK_ACTIVATION)
  const homework = useRetentionModuleEnabled(RETENTION_MODULES.SMART_HOMEWORK)
  const briefs = useRetentionModuleEnabled(RETENTION_MODULES.LESSON_BRIEFS)
  const dailyPartner = useRetentionModuleEnabled(RETENTION_MODULES.DAILY_PARTNER)
  const activeHomework = useActiveHomeworkSet()
  const todayScenario = useTodayScenario()

  const showStreakBlock = streak.enabled
  const showHomeworkBlock = homework.enabled
  const showBriefsBlock = briefs.enabled
  const showDailyPartnerBlock = dailyPartner.enabled

  if (!showStreakBlock && !showHomeworkBlock && !showBriefsBlock && !showDailyPartnerBlock) return null

  return (
    <section className="mb-8 space-y-5" dir="rtl">
      {showStreakBlock && <StreakAtRiskBanner />}

      <div className="grid gap-6 md:grid-cols-2">
        {showStreakBlock && <RetentionStreakCalendar />}
        {showStreakBlock && <WeeklyChallengeCard />}

        {showHomeworkBlock && (
          <RetentionCard
            moduleKey="smart_homework"
            title={activeHomework.data ? 'تابعي تمارينكِ' : 'تمارين اليوم'}
            subtitle={
              activeHomework.data
                ? `${activeHomework.data.completed_count}/${activeHomework.data.total_count} تمارين متبقية`
                : 'مجموعة ٥ تمارين مخصصة لكِ — أقل من ١٠ دقائق'
            }
            icon={<Pencil size={20} />}
            badge={activeHomework.data ? null : 'جديد'}
            onClick={() => navigate('/student/retention/homework')}
            variant={activeHomework.data ? 'featured' : 'default'}
          >
            <div className="mt-2 text-sm font-semibold" style={{ color: 'var(--ds-accent-primary)' }}>
              {activeHomework.data ? 'متابعة ←' : 'ابدئي ←'}
            </div>
          </RetentionCard>
        )}

        {showBriefsBlock && <PendingBriefsCard />}

        {showDailyPartnerBlock && (
          <RetentionCard
            moduleKey="daily_partner"
            title="رفيقك اليومي"
            subtitle={
              todayScenario.data
                ? `محادثة اليوم: ${todayScenario.data.title_ar}`
                : 'محادثة ٥ دقائق بصوتكِ'
            }
            icon={<MessageCircle size={20} />}
            badge="جديد"
            onClick={() => navigate('/student/retention/daily-partner')}
            variant="featured"
          >
            <div className="mt-2 text-sm font-semibold" style={{ color: 'var(--ds-accent-primary)' }}>
              ابدئي ←
            </div>
          </RetentionCard>
        )}
      </div>
    </section>
  )
}
