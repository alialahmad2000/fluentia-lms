import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { getEncouragement } from '../../../utils/encouragement'
import StudentDashboardSkeleton from '../../../components/skeletons/StudentDashboardSkeleton'

import { AmbientField, SectionLabel, Band } from './_premiumShell'
import PremiumHero from './PremiumHero'
import './premiumDashboard.css'

/* Data-bound widgets — each owns its own query / realtime sub + empty/loading
 * states. They are arranged into a brand-new "command deck" bento grid. */
import NextClassWidget from '../dashboard/widgets/NextClassWidget'
import PaymentWidget from '../dashboard/widgets/PaymentWidget'
import EncouragementWidget from '../dashboard/widgets/EncouragementWidget'
import DailyProgressWidget from '../../../components/student/dashboard/DailyProgressWidget'
import WeeklyProgressWidget from '../../../components/student/dashboard/WeeklyProgressWidget'
import LiveLevelActivityFeed from '../../../components/student/dashboard/LiveLevelActivityFeed'
import StreakWidget from '../../../components/student/StreakWidget'
import TeamCard from '../../../components/student/TeamCard'
import SrsReviewCard from '../../../components/gamification/SrsReviewCard'
import LevelExitTestCard from '../../../components/gamification/LevelExitTestCard'
import MysteryBox from '../../../components/gamification/MysteryBox'
import EnableNotificationsPrompt from '../../../components/notifications/EnableNotificationsPrompt'
import PlacementTestCard from '../placement/PlacementTestCard'
import CompetitionKickoffModal from '../../../components/competition/CompetitionKickoffModal'
import CompetitionBanner from '../../../components/competition/CompetitionBanner'
import JourneyMapHeroCTA from '../../../components/student/JourneyMapHeroCTA'
import PWAInstallBanner from '../../../components/pwa/PWAInstallBanner'
import RetentionDashboardSection from '../../../components/retention/RetentionDashboardSection'

/* ------------------------------------------------------------------ *
 * Fluentia LMS — PRODUCTION STUDENT DASHBOARD  ·  "Command Deck"
 *
 * A complete structural redesign (2026-06-03). Gone is the long vertical
 * stack of labelled report-sections; in its place a cinematic hero over a
 * modern asymmetric BENTO grid of self-gating widgets, on a living,
 * multi-colour ambient field. Deprecated surfaces were removed per the
 * owner: the Quick-Access tiles (weekly-tasks / assignments / adaptive-
 * test / ai-insights) and the Weekly-Tasks band — none are used anymore.
 *
 * Every remaining tile is wired to a LIVE feature and keeps its real data
 * path; nothing is faked. Widgets self-gate (render null when empty), so
 * the deck stays clean for every student regardless of what's unlocked.
 * ------------------------------------------------------------------ */

export default function PremiumDashboard() {
  /* ── ALL HOOKS AT TOP (React #310 safe) ── */
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)

  // Next pending/overdue payment (the only page-level query left; the rest
  // live inside their own widgets). Renders null unless something is due.
  const { data: nextPayment } = useQuery({
    queryKey: ['student-next-payment'],
    staleTime: 120000,
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('id, amount, status, period_end')
        .eq('student_id', profile?.id)
        .in('status', ['pending', 'overdue'])
        .is('deleted_at', null)
        .order('period_end', { ascending: true })
        .limit(1)
      return data?.[0] ?? null
    },
    enabled: !!profile?.id,
  })

  // ── DERIVED VALUES ──
  const xp = studentData?.xp_total || 0
  const streak = studentData?.current_streak || 0
  const group = studentData?.groups
  const schedule = group?.schedule

  const encouragement = getEncouragement({
    streak,
    xp,
    tasksCompleted: 0,
    tasksTotal: 0,
    pendingAssignments: 0,
  })

  // ── GUARD ──
  if (!profile) return <StudentDashboardSkeleton />

  // ── RENDER ──
  return (
    <div className="pd-root">
      <AmbientField />

      {/* one-time modals / banners (own their own visibility gating) */}
      <CompetitionKickoffModal />
      <PWAInstallBanner />

      <div className="space-y-8" style={{ position: 'relative', zIndex: 1 }}>
        {/* Conditional hero banners — each hides itself when not relevant. */}
        <JourneyMapHeroCTA />
        <CompetitionBanner />

        {/* THE HERO — real XP / streak / level / package, cinematic. */}
        <PremiumHero profile={profile} studentData={studentData} />

        {/* Engagement-first: retention surfaces (self-gate → may render null). */}
        <RetentionDashboardSection />

        {/* THE COMMAND DECK — asymmetric bento of live, self-gating tiles. */}
        <Band delay={0.02}>
          <SectionLabel>لمحة سريعة</SectionLabel>
          <div className="pd-bento">
            <div className="pd-cell pd-cell--7">
              <DailyProgressWidget studentId={profile?.id} />
            </div>
            <div className="pd-cell pd-cell--5">
              <StreakWidget profileId={profile?.id} />
            </div>
            <div className="pd-cell pd-cell--5">
              <TeamCard groupId={studentData?.group_id} />
            </div>
            <div className="pd-cell pd-cell--7">
              <WeeklyProgressWidget studentId={profile?.id} />
            </div>
            <div className="pd-cell pd-cell--4">
              <NextClassWidget group={group} schedule={schedule} />
            </div>
            <div className="pd-cell pd-cell--4">
              <SrsReviewCard studentId={profile?.id} />
            </div>
            <div className="pd-cell pd-cell--4">
              <MysteryBox />
            </div>
          </div>
        </Band>

        {/* MILESTONES — placement + level-exit (each self-gates, often null). */}
        <Band delay={0.04}>
          <div className="space-y-4">
            <PlacementTestCard studentId={profile?.id} />
            <LevelExitTestCard studentId={profile?.id} academicLevel={studentData?.academic_level} />
          </div>
        </Band>

        {/* ACADEMY PULSE — live activity across the level. */}
        <Band delay={0.04}>
          <SectionLabel>نبض الأكاديمية</SectionLabel>
          <LiveLevelActivityFeed studentId={profile?.id} />
        </Band>

        {/* Encouragement + system prompts (each conditional / one-time). */}
        <EncouragementWidget encouragement={encouragement} />
        <EnableNotificationsPrompt />
        <PaymentWidget payment={nextPayment} />

        {/* bottom breathing room (mobile bar spacer handled by LayoutShell) */}
        <div className="h-2" aria-hidden="true" />
      </div>
    </div>
  )
}
