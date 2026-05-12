import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import InterestSurveyCard from '../../components/personalization/InterestSurveyCard'
import { supabase } from '../../lib/supabase'
import { getEncouragement } from '../../utils/encouragement'
// Legacy: import { DashboardSkeleton } from '../../components/ui/PageSkeleton'
import StudentDashboardSkeleton from '../../components/skeletons/StudentDashboardSkeleton'
import StaggeredList from '../../design-system/components/StaggeredList'

// Widgets
import HeroBlock from './dashboard/widgets/HeroBlock'
import WeeklyTasksWidget from './dashboard/widgets/WeeklyTasksWidget'
import NextClassWidget from './dashboard/widgets/NextClassWidget'
import QuickAccessGrid from './dashboard/widgets/QuickAccessGrid'
import PaymentWidget from './dashboard/widgets/PaymentWidget'
import EncouragementWidget from './dashboard/widgets/EncouragementWidget'

// Existing child widgets (own their queries, theme-aware via --accent-* vars)
import DailyProgressWidget from '../../components/student/dashboard/DailyProgressWidget'
import WeeklyProgressWidget from '../../components/student/dashboard/WeeklyProgressWidget'
import LiveLevelActivityFeed from '../../components/student/dashboard/LiveLevelActivityFeed'
import StreakWidget from '../../components/student/StreakWidget'
import TeamCard from '../../components/student/TeamCard'

// Gamification widgets (deferred)
import SrsReviewCard from '../../components/gamification/SrsReviewCard'
import LevelExitTestCard from '../../components/gamification/LevelExitTestCard'
import MysteryBox from '../../components/gamification/MysteryBox'
import EnableNotificationsPrompt from '../../components/notifications/EnableNotificationsPrompt'
import PlacementTestCard from './placement/PlacementTestCard'
import CompetitionKickoffModal from '../../components/competition/CompetitionKickoffModal'
import CompetitionBanner from '../../components/competition/CompetitionBanner'
import JourneyMapHeroCTA from '../../components/student/JourneyMapHeroCTA'
import PWAInstallBanner from '../../components/pwa/PWAInstallBanner'

export default function StudentDashboard() {
  // ── ALL HOOKS AT TOP (React #310 safe) ──────────────────────────
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)

  // Defer non-critical widgets
  const [showSecondary, setShowSecondary] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShowSecondary(true), 300)
    return () => clearTimeout(t)
  }, [])

  // Weekly tasks progress
  const { data: weeklyProgress, isLoading: loadingWeekly } = useQuery({
    queryKey: ['dashboard-weekly-progress', profile?.id],
    staleTime: 30000,
    queryFn: async () => {
      const now = new Date()
      const sunday = new Date(now)
      sunday.setDate(now.getDate() - now.getDay())
      sunday.setHours(0, 0, 0, 0)
      const { data } = await supabase
        .from('weekly_task_sets')
        .select('id, total_tasks, completed_tasks, completion_percentage, status')
        .eq('student_id', profile?.id)
        .gte('week_start', sunday.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
    enabled: !!profile?.id,
  })

  // Individual weekly tasks
  const { data: weeklyTasks } = useQuery({
    queryKey: ['dashboard-weekly-tasks-detail', weeklyProgress?.id],
    staleTime: 30000,
    queryFn: async () => {
      const { data } = await supabase
        .from('weekly_tasks')
        .select('id, type, title, status')
        .eq('task_set_id', weeklyProgress.id)
        .order('sequence_number')
      return data || []
    },
    enabled: !!weeklyProgress?.id,
  })

  // Pending assignments count
  const { data: pendingAssignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['student-pending-assignments'],
    staleTime: 60000,
    queryFn: async () => {
      const { count } = await supabase
        .from('assignments')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', studentData?.group_id)
        .eq('is_visible', true)
        .is('deleted_at', null)
        .gte('deadline', new Date().toISOString())
      return count || 0
    },
    enabled: !!studentData?.group_id,
  })

  // Payment status
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

  // ── DERIVED VALUES (after all hooks, before any return) ─────────
  const xp = studentData?.xp_total || 0
  const streak = studentData?.current_streak || 0
  const group = studentData?.groups
  const schedule = group?.schedule

  const encouragement = getEncouragement({
    streak,
    xp,
    tasksCompleted: weeklyProgress?.completed_tasks || 0,
    tasksTotal: weeklyProgress?.total_tasks || 0,
    pendingAssignments: pendingAssignments || 0,
  })

  // ── GUARDS (after all hooks) ────────────────────────────────────
  const isInitialLoading = !profile || (loadingWeekly && loadingAssignments)
  if (isInitialLoading) return <StudentDashboardSkeleton />

  // ── RENDER ──────────────────────────────────────────────────────
  return (
    <>
    <CompetitionKickoffModal />
    <PWAInstallBanner />
    <StaggeredList stagger={0.06} className="space-y-6">
      {/* 0. Journey Map CTA — hidden once student opens first unit */}
      <JourneyMapHeroCTA />

      {/* 1. Competition Banner (only when active) */}
      <CompetitionBanner />

      {/* 1.5 Interest survey — dismissible, shown until completed */}
      <InterestSurveyCard />

      {/* 1. Hero */}
      <HeroBlock
        profile={profile}
        studentData={studentData}
        loading={false}
      />

      {/* 2. Daily Progress */}
      <DailyProgressWidget studentId={profile?.id} />

      {/* 3. Weekly Progress */}
      <WeeklyProgressWidget studentId={profile?.id} />

      {/* 4. Weekly Tasks (always visible) */}
      <WeeklyTasksWidget
        weeklyProgress={weeklyProgress}
        weeklyTasks={weeklyTasks}
        loading={loadingWeekly}
      />

      {/* 5. Streak + Team */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StreakWidget profileId={profile?.id} />
        <TeamCard groupId={studentData?.group_id} />
      </div>

      {/* 6. Next Class */}
      <NextClassWidget group={group} schedule={schedule} />

      {/* 7. SRS Review */}
      <SrsReviewCard studentId={profile?.id} />

      {/* 7.5 Placement Test */}
      <PlacementTestCard studentId={profile?.id} />

      {/* 8. Level Exit Test */}
      <LevelExitTestCard studentId={profile?.id} academicLevel={studentData?.academic_level} />

      {/* 9. Quick Access */}
      <QuickAccessGrid pendingAssignments={pendingAssignments} />

      {/* 10. Push Notifications (conditional, one-time) */}
      <EnableNotificationsPrompt />

      {/* 11. Encouragement */}
      <EncouragementWidget encouragement={encouragement} />

      {/* 12. Mystery Box (deferred) */}
      {showSecondary && (
        <div className="grid lg:grid-cols-2 gap-5">
          <MysteryBox />
        </div>
      )}

      {/* 13. Live Activity Feed */}
      <LiveLevelActivityFeed studentId={profile?.id} />

      {/* 14. Payment Status (conditional) */}
      <PaymentWidget payment={nextPayment} />

      {/* Bottom padding for mobile bar */}
      <div className="h-4" aria-hidden="true" />
    </StaggeredList>
    </>
  )
}
