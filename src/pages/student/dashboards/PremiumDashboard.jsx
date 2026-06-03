import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarDays, FileText, Crosshair, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { getEncouragement } from '../../../utils/encouragement'
import StudentDashboardSkeleton from '../../../components/skeletons/StudentDashboardSkeleton'
import GlassPanel from '../../../design-system/components/GlassPanel'

import { AmbientField, SectionLabel, Band } from './_premiumShell'
import PremiumHero from './PremiumHero'
import './premiumDashboard.css'

/* Legacy data-bound widgets — premium, theme-aware, own their empty/loading
 * states. We KEEP all of them so the premium dashboard has 100% feature
 * parity with the original. */
import WeeklyTasksWidget from '../dashboard/widgets/WeeklyTasksWidget'
import NextClassWidget from '../dashboard/widgets/NextClassWidget'
import PaymentWidget from '../dashboard/widgets/PaymentWidget'
import EncouragementWidget from '../dashboard/widgets/EncouragementWidget'

/* Self-contained child widgets (each owns its own query / realtime sub). */
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
 * Fluentia LMS — PRODUCTION STUDENT DASHBOARD (Premium)
 *
 * This is what real students see at /student. It owns the SAME real
 * queries and renders the SAME complete feature set as the legacy
 * dashboard (weekly tasks + links, daily/weekly progress, streak, team,
 * next class, SRS, placement, level-exit, quick access, mystery box,
 * live feed, payment, retention, competition, journey map, PWA &
 * notification prompts) — but through a refined, spacious, Apple-grade
 * presentation layer. Nothing is dropped; nothing is faked.
 *
 * NOTE: it intentionally re-implements the original queries (rather than
 * consuming the thin useStudentDashboard feed) so every binding stays
 * real and every link is preserved — this is the production data path.
 * ------------------------------------------------------------------ */

const QUICK_ACCESS = [
  { to: '/student/weekly-tasks', label: 'المهام الأسبوعية', icon: CalendarDays },
  { to: '/student/assignments', label: 'الواجبات', icon: FileText, badgeKey: 'assignments' },
  { to: '/student/adaptive-test', label: 'اختبار المستوى', icon: Crosshair },
  { to: '/student/ai-insights', label: 'رؤى ذكية', icon: Sparkles },
]

function QuickAccessGrid({ pendingAssignments = 0 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      {QUICK_ACCESS.map((item) => (
        <Link key={item.to} to={item.to}>
          <GlassPanel padding="md" className="pd-quick cursor-pointer relative h-full">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                className="flex items-center justify-center rounded-2xl mb-3.5"
                style={{
                  width: 46,
                  height: 46,
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--ds-accent-primary) 22%, transparent), color-mix(in srgb, var(--ds-accent-secondary) 14%, transparent))',
                  border: '1px solid var(--ds-border-subtle)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
              >
                <item.icon size={21} strokeWidth={1.7} style={{ color: 'var(--ds-accent-primary)' }} />
              </div>
              <p className="font-semibold" style={{ fontSize: 14.5, color: 'var(--ds-text-primary)', lineHeight: 1.3 }}>
                {item.label}
              </p>
            </div>
            {item.badgeKey === 'assignments' && pendingAssignments > 0 && (
              <span
                className="absolute top-3 left-3 min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-[11px] font-bold px-1.5"
                style={{
                  zIndex: 2,
                  background: 'var(--ds-accent-primary)',
                  color: 'var(--ds-text-inverse)',
                  boxShadow: '0 4px 12px -3px var(--ds-accent-primary-glow)',
                }}
              >
                {pendingAssignments}
              </span>
            )}
          </GlassPanel>
        </Link>
      ))}
    </div>
  )
}

export default function PremiumDashboard() {
  /* ── ALL HOOKS AT TOP (React #310 safe) ── */
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)

  // Defer non-critical widgets so the hero paints instantly.
  const [showSecondary, setShowSecondary] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShowSecondary(true), 300)
    return () => clearTimeout(t)
  }, [])

  // Weekly tasks progress (this week's set).
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

  // Individual weekly tasks for the horizontal strip.
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

  // Pending assignments count (drives the Quick Access badge).
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

  // Next pending/overdue payment (conditional widget).
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

  // ── DERIVED VALUES (after all hooks, before any return) ──
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

  // ── GUARD ──
  const isInitialLoading = !profile || (loadingWeekly && loadingAssignments)
  if (isInitialLoading) return <StudentDashboardSkeleton />

  // ── RENDER ──
  const weekHint = weeklyProgress
    ? `${weeklyProgress.completed_tasks || 0}/${weeklyProgress.total_tasks || 0} مهمة`
    : undefined

  return (
    <div className="pd-root">
      <AmbientField />

      {/* one-time modals / banners (own their own visibility gating) */}
      <CompetitionKickoffModal />
      <PWAInstallBanner />

      <div className="space-y-10" style={{ position: 'relative', zIndex: 1 }}>
        {/* Journey Map CTA — hides itself once the first unit is opened. */}
        <JourneyMapHeroCTA />

        {/* Competition banner — only renders when a competition is active. */}
        <CompetitionBanner />

        {/* 1. HERO — real XP / streak / level / package, premium presentation. */}
        <PremiumHero profile={profile} studentData={studentData} />

        {/* 1.2 QUICK ACCESS — primary destinations, elevated right under the hero. */}
        <Band delay={0.02}>
          <SectionLabel>وصول سريع</SectionLabel>
          <QuickAccessGrid pendingAssignments={pendingAssignments} />
        </Band>

        {/* 1.5 Retention surfaces (self-gates per student/module → may render null). */}
        <RetentionDashboardSection />

        {/* 2. PROGRESS — daily + weekly snapshots side by side on desktop. */}
        <Band>
          <SectionLabel>تقدّمك</SectionLabel>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <DailyProgressWidget studentId={profile?.id} />
            <WeeklyProgressWidget studentId={profile?.id} />
          </div>
        </Band>

        {/* 3. THIS WEEK — weekly tasks (always visible). */}
        <Band delay={0.04}>
          <SectionLabel hint={weekHint}>هذا الأسبوع</SectionLabel>
          <WeeklyTasksWidget
            weeklyProgress={weeklyProgress}
            weeklyTasks={weeklyTasks}
            loading={loadingWeekly}
          />
        </Band>

        {/* 4. STREAK + TEAM. */}
        <Band delay={0.04}>
          <SectionLabel>إيقاعك ومجموعتك</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StreakWidget profileId={profile?.id} />
            <TeamCard groupId={studentData?.group_id} />
          </div>
        </Band>

        {/* 5. NEXT CLASS. */}
        <Band delay={0.04}>
          <SectionLabel>حصّتك القادمة</SectionLabel>
          <NextClassWidget group={group} schedule={schedule} />
        </Band>

        {/* 6. ASSESSMENTS & REVIEW — SRS, placement, level-exit (each self-gates). */}
        <Band delay={0.04}>
          <SectionLabel>المراجعة والاختبارات</SectionLabel>
          <div className="space-y-4">
            <SrsReviewCard studentId={profile?.id} />
            <PlacementTestCard studentId={profile?.id} />
            <LevelExitTestCard studentId={profile?.id} academicLevel={studentData?.academic_level} />
          </div>
        </Band>

        {/* 7. Push-notification prompt (conditional, one-time). */}
        <EnableNotificationsPrompt />

        {/* 8. Encouragement line (derived from real stats). */}
        <EncouragementWidget encouragement={encouragement} />

        {/* 9. Mystery box (deferred — non-critical). */}
        {showSecondary && (
          <Band>
            <div className="grid lg:grid-cols-2 gap-4">
              <MysteryBox />
            </div>
          </Band>
        )}

        {/* 10. Live activity feed across the level. */}
        <Band delay={0.04}>
          <SectionLabel>نبض الأكاديمية</SectionLabel>
          <LiveLevelActivityFeed studentId={profile?.id} />
        </Band>

        {/* 11. Payment status (renders null unless a payment is due). */}
        <PaymentWidget payment={nextPayment} />

        {/* bottom breathing room (mobile bar is handled by LayoutShell spacer) */}
        <div className="h-2" aria-hidden="true" />
      </div>
    </div>
  )
}
