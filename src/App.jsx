import { useEffect, useRef, useState, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'
import LoginPage from './pages/public/LoginPage'
import LayoutShell from './components/layout/LayoutShell'
import OnboardingModal from './components/onboarding/OnboardingModal'
import ForcePasswordChange from './components/onboarding/ForcePasswordChange'
import GamificationProvider from './components/gamification/GamificationProvider'
import ErrorBoundary, { PageErrorFallback } from './components/ErrorBoundary'
import GlobalSearch from './components/GlobalSearch'
import lazyRetry from './utils/lazyRetry'
import OfflineBanner from './components/OfflineBanner'
import ImpersonationBanner from './components/ImpersonationBanner'
import { ToastProvider } from './components/Toast'

import ComingSoon from './pages/student/ComingSoon'
import LockedFeature from './pages/student/LockedFeature'
import { hasPackageAccess } from './components/PackageGate'

// ─── Design System (Phase 0) ────────────────────────────────
import ThemeProvider from './design-system/ThemeProvider'
import ThemeSwitcher from './design-system/ThemeSwitcher'
import ThemeOnboardingHint from './design-system/ThemeOnboardingHint'
import { AuroraBackground } from './design-system/components'

// ─── Lazy-loaded Pages (with chunk retry on stale deploys) ───
const StudentDashboard = lazyRetry(() => import('./pages/student/StudentDashboard'))
const StudentAssignments = lazyRetry(() => import('./pages/student/StudentAssignments'))
const StudentGrades = lazyRetry(() => import('./pages/student/StudentGrades'))
const StudentSchedule = lazyRetry(() => import('./pages/student/StudentSchedule'))
const StudentProfile = lazyRetry(() => import('./pages/student/StudentProfile'))
const StudentSpeaking = lazyRetry(() => import('./pages/student/StudentSpeaking'))
const StudentLibrary = lazyRetry(() => import('./pages/student/StudentLibrary'))
const StudentLeaderboard = lazyRetry(() => import('./pages/student/StudentLeaderboard'))
const StudentPeerRecognition = lazyRetry(() => import('./pages/student/StudentPeerRecognition'))
const StudentActivityFeed = lazyRetry(() => import('./pages/student/StudentActivityFeed'))
const StudentChallenges = lazyRetry(() => import('./pages/student/StudentChallenges'))
const StudentGroupChat = lazyRetry(() => import('./pages/student/StudentGroupChat'))
const StudentMessages = lazyRetry(() => import('./pages/student/StudentMessages'))
const StudentChatbot = lazyRetry(() => import('./pages/student/StudentChatbot'))
const StudentVocabulary = lazyRetry(() => import('./pages/student/StudentVocabulary'))
const StudentBilling = lazyRetry(() => import('./pages/student/StudentBilling'))
const StudentExercises = lazyRetry(() => import('./pages/student/StudentExercises'))
const StudentErrorPatterns = lazyRetry(() => import('./pages/student/StudentErrorPatterns'))
const StudentVoiceJournal = lazyRetry(() => import('./pages/student/StudentVoiceJournal'))
const StudentPronunciation = lazyRetry(() => import('./pages/student/StudentPronunciation'))
const StudentConversation = lazyRetry(() => import('./pages/student/StudentConversation'))
const StudentStreakBattles = lazyRetry(() => import('./pages/student/StudentStreakBattles'))
const StudentSuccessStories = lazyRetry(() => import('./pages/student/StudentSuccessStories'))
const StudentEvents = lazyRetry(() => import('./pages/student/StudentEvents'))
const StudentAvatar = lazyRetry(() => import('./pages/student/StudentAvatar'))
const StudentAssessments = lazyRetry(() => import('./pages/student/StudentAssessments'))
const StudentQuiz = lazyRetry(() => import('./pages/student/StudentQuiz'))
const StudentCertificate = lazyRetry(() => import('./pages/student/StudentCertificate'))
const StudentReferral = lazyRetry(() => import('./pages/student/StudentReferral'))
const StudentStudyPlan = lazyRetry(() => import('./pages/student/StudentStudyPlan'))
const StudentWeeklyTasks = lazyRetry(() => import('./pages/student/StudentWeeklyTasks'))
const StudentWeeklyTaskDetail = lazyRetry(() => import('./pages/student/StudentWeeklyTaskDetail'))
const StudentSpelling = lazyRetry(() => import('./pages/student/StudentSpelling'))
const IrregularVerbsPractice = lazyRetry(() => import('./pages/student/verbs/IrregularVerbsPractice'))
const StudentRecordings = lazyRetry(() => import('./pages/student/StudentRecordings'))
const StudentWritingLab = lazyRetry(() => import('./pages/student/StudentWritingLab'))
const StudentGroupActivity = lazyRetry(() => import('./pages/student/StudentGroupActivity'))
const StudentAdaptiveTest = lazyRetry(() => import('./pages/student/StudentAdaptiveTest'))
const StudentAIInsights = lazyRetry(() => import('./pages/student/StudentAIInsights'))
const DailyReview = lazyRetry(() => import('./pages/student/DailyReview'))
const LevelExitTest = lazyRetry(() => import('./pages/student/LevelExitTest'))
const StudentCreatorChallenge = lazyRetry(() => import('./pages/student/StudentCreatorChallenge'))
const StudentDuels = lazyRetry(() => import('./pages/student/StudentDuels'))
const ProgressDashboard = lazyRetry(() => import('./pages/student/ProgressDashboard'))
const StudentCurriculum = lazyRetry(() => import('./pages/student/StudentCurriculum'))
const VocabularyFlashcards = lazyRetry(() => import('./pages/student/vocabulary/VocabularyFlashcards'))
const CurriculumBrowser = lazyRetry(() => import('./pages/student/curriculum/CurriculumBrowser'))
const StylePreview = lazyRetry(() => import('./pages/student/curriculum/StylePreview'))
const LevelUnits = lazyRetry(() => import('./pages/student/curriculum/LevelUnits'))
const UnitContent = lazyRetry(() => import('./pages/student/curriculum/UnitContent'))
const PlacementTestPage = lazyRetry(() => import('./pages/student/placement/PlacementTestPage'))
const PlacementResultsPage = lazyRetry(() => import('./pages/student/placement/PlacementResultsPage'))

const TrainerOnboarding = lazyRetry(() => import('./pages/trainer/TrainerOnboarding'))
const TrainerDashboard = lazyRetry(() => import('./pages/trainer/TrainerDashboard'))
const TrainerAssignments = lazyRetry(() => import('./pages/trainer/TrainerAssignments'))
const TrainerGrading = lazyRetry(() => import('./pages/trainer/TrainerGrading'))
const TrainerSchedule = lazyRetry(() => import('./pages/trainer/TrainerSchedule'))
const TrainerNotes = lazyRetry(() => import('./pages/trainer/TrainerNotes'))
const TrainerLibrary = lazyRetry(() => import('./pages/trainer/TrainerLibrary'))
const TrainerQuickPoints = lazyRetry(() => import('./pages/trainer/TrainerQuickPoints'))
const TrainerAttendance = lazyRetry(() => import('./pages/trainer/TrainerAttendance'))
const TrainerQuickNotes = lazyRetry(() => import('./pages/trainer/TrainerQuickNotes'))
const TrainerStudentView = lazyRetry(() => import('./pages/trainer/TrainerStudentView'))
const TrainerChallenges = lazyRetry(() => import('./pages/trainer/TrainerChallenges'))
const TrainerTeams = lazyRetry(() => import('./pages/trainer/TrainerTeams'))
const TrainerGroupChat = lazyRetry(() => import('./pages/trainer/TrainerGroupChat'))
const TrainerAIAssistant = lazyRetry(() => import('./pages/trainer/TrainerAIAssistant'))
const TrainerProgressReports = lazyRetry(() => import('./pages/trainer/TrainerProgressReports'))
const TrainerLessonPlanner = lazyRetry(() => import('./pages/trainer/TrainerLessonPlanner'))
const TrainerQuizGenerator = lazyRetry(() => import('./pages/trainer/TrainerQuizGenerator'))
const TrainerWeeklyGrading = lazyRetry(() => import('./pages/trainer/TrainerWeeklyGrading'))
const TrainerCurriculum = lazyRetry(() => import('./pages/trainer/TrainerCurriculum'))
const TrainerProgressMatrix = lazyRetry(() => import('./pages/trainer/TrainerProgressMatrix'))
const MyNotes = lazyRetry(() => import('./pages/trainer/MyNotes'))
const WeeklyReport = lazyRetry(() => import('./pages/trainer/WeeklyReport'))
const MyStudents = lazyRetry(() => import('./pages/trainer/MyStudents'))
const StudentProgressDetail = lazyRetry(() => import('./pages/trainer/StudentProgressDetail'))

const AdminDashboard = lazyRetry(() => import('./pages/admin/AdminDashboard'))
const AdminStudents = lazyRetry(() => import('./pages/admin/AdminStudents'))
const AdminGroups = lazyRetry(() => import('./pages/admin/AdminGroups'))
const AdminTrainers = lazyRetry(() => import('./pages/admin/AdminTrainers'))
const AdminPayments = lazyRetry(() => import('./pages/admin/AdminPayments'))
const AdminReports = lazyRetry(() => import('./pages/admin/AdminReports'))
const AdminSettings = lazyRetry(() => import('./pages/admin/AdminSettings'))
const AdminChurnPrediction = lazyRetry(() => import('./pages/admin/AdminChurnPrediction'))
const AdminSmartScheduling = lazyRetry(() => import('./pages/admin/AdminSmartScheduling'))
const AdminContent = lazyRetry(() => import('./pages/admin/AdminContent'))
const AdminWeeklyTasks = lazyRetry(() => import('./pages/admin/AdminWeeklyTasks'))
const AdminHolidays = lazyRetry(() => import('./pages/admin/AdminHolidays'))
const AdminAuditLog = lazyRetry(() => import('./pages/admin/AdminAuditLog'))
const AdminTestimonials = lazyRetry(() => import('./pages/admin/AdminTestimonials'))
const AdminActionCenter = lazyRetry(() => import('./pages/admin/AdminActionCenter'))
const AdminDataExport = lazyRetry(() => import('./pages/admin/AdminDataExport'))
const AdminRecordings = lazyRetry(() => import('./pages/admin/AdminRecordings'))
const AdminCurriculum = lazyRetry(() => import('./pages/admin/curriculum/CurriculumOverview'))
const LevelDetail = lazyRetry(() => import('./pages/admin/curriculum/LevelDetail'))
const UnitEditor = lazyRetry(() => import('./pages/admin/curriculum/UnitEditor'))
const IELTSManagement = lazyRetry(() => import('./pages/admin/curriculum/IELTSManagement'))
const CurriculumProgress = lazyRetry(() => import('./pages/admin/curriculum/CurriculumProgress'))
const CurriculumMap = lazyRetry(() => import('./pages/admin/curriculum/CurriculumMap'))
const ComposeAnnouncement = lazyRetry(() => import('./pages/admin/announcements/ComposeAnnouncement'))
const AdminTestBank = lazyRetry(() => import('./pages/admin/AdminTestBank'))
const AdminAIDashboard = lazyRetry(() => import('./pages/admin/AdminAIDashboard'))
const AdminContentBank = lazyRetry(() => import('./pages/admin/AdminContentBank'))
const AdminDailyReports = lazyRetry(() => import('./pages/admin/AdminDailyReports'))
const AdminAnalytics = lazyRetry(() => import('./pages/admin/AdminAnalytics'))
const AdminCreatorChallenge = lazyRetry(() => import('./pages/admin/AdminCreatorChallenge'))
const PlacementQueuePage = lazyRetry(() => import('./pages/admin/PlacementQueuePage'))

const AdminCurriculumPreview = lazyRetry(() => import('./pages/admin/AdminCurriculumPreview'))
const TrainerCurriculumPreview = lazyRetry(() => import('./pages/trainer/TrainerCurriculumPreview'))
const InteractiveCurriculumLevels = lazyRetry(() => import('./pages/shared/InteractiveCurriculumLevels'))
const InteractiveCurriculumUnits = lazyRetry(() => import('./pages/shared/InteractiveCurriculumUnits'))
const InteractiveCurriculumPage = lazyRetry(() => import('./pages/shared/InteractiveCurriculumPage'))

const PartnersLanding = lazyRetry(() => import('./pages/partners/PartnersLanding'))
const PartnersSubmitted = lazyRetry(() => import('./pages/partners/PartnersSubmitted'))
const PartnersTerms = lazyRetry(() => import('./pages/partners/PartnersTerms'))
const AffiliatesList = lazyRetry(() => import('./pages/admin/AffiliatesList'))
const AffiliateDetail = lazyRetry(() => import('./pages/admin/AffiliateDetail'))
const AffiliatesDashboard = lazyRetry(() => import('./pages/admin/AffiliatesDashboard'))
const AffiliatePayouts = lazyRetry(() => import('./pages/admin/AffiliatePayouts'))
const AffiliateMaterialsAdmin = lazyRetry(() => import('./pages/admin/AffiliateMaterialsAdmin'))

const PartnerLayout = lazyRetry(() => import('./layouts/PartnerLayout'))
const PartnerRoute = lazyRetry(() => import('./components/PartnerRoute'))
const PartnerDashboard = lazyRetry(() => import('./pages/partner/PartnerDashboard'))
const PartnerConversions = lazyRetry(() => import('./pages/partner/PartnerConversions'))
const PartnerPayouts = lazyRetry(() => import('./pages/partner/PartnerPayouts'))
const PartnerMaterials = lazyRetry(() => import('./pages/partner/PartnerMaterials'))
const PartnerSettings = lazyRetry(() => import('./pages/partner/PartnerSettings'))
const PartnerSuspended = lazyRetry(() => import('./pages/partner/PartnerSuspended'))

const ForgotPassword = lazyRetry(() => import('./pages/public/ForgotPassword'))
const ResetPassword = lazyRetry(() => import('./pages/public/ResetPassword'))
const ParentDashboard = lazyRetry(() => import('./pages/public/ParentDashboard'))
const PlacementTest = lazyRetry(() => import('./pages/public/PlacementTest'))
const Testimonials = lazyRetry(() => import('./pages/public/Testimonials'))
const CertificateVerification = lazyRetry(() => import('./pages/public/CertificateVerification'))

// ─── Page wrapper: ErrorBoundary + Suspense ──────────────────
function Page({ children }) {
  return (
    <ErrorBoundary fallback={(error) => <PageErrorFallback error={error} />}>
      <Suspense fallback={<PageSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

// ─── Package-Gated Route Wrapper ─────────────────────────────
// Checks package access at the route level. If locked, shows LockedFeature page.
// ComingSoon pages are handled directly in routes and take priority.
function PackageRoute({ requiredPackage, featureName, children }) {
  const { profile, studentData } = useAuthStore()
  // Non-students always pass
  if (profile?.role !== 'student') return children
  const pkg = studentData?.package || 'asas'
  if (hasPackageAccess(pkg, requiredPackage)) return children
  return <LockedFeature requiredPackage={requiredPackage} featureName={featureName} />
}

// ─── Page Loading Skeleton ───────────────────────────────────
function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-6 p-2">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-4 w-64" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
      </div>
      <div className="skeleton h-64 w-full" />
    </div>
  )
}

// ─── Full-screen Boot Screen ─────────────────────────────────
// Shown while authStore.initialize() is running. Must be *visibly* something
// on every device, because the previous skeleton-only version rendered as a
// near-invisible dark page on mobile (skeleton CSS vars are ~2-6% opacity
// white on a dark bg) — users perceived it as "nothing loaded."
//
// After 6 seconds of loading, a reload escape-hatch appears so users aren't
// permanently stuck if the app fails to boot (e.g. stale SW, corrupt token).
function LoadingSkeleton() {
  const [showReload, setShowReload] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowReload(true), 6000)
    return () => clearTimeout(t)
  }, [])

  const handleReload = () => {
    // Clear local auth + SW caches to recover from a corrupted boot state,
    // then hard-reload. Wrapped in try/catch so storage errors don't block.
    try { localStorage.removeItem('sw_purge_v3') } catch {}
    try {
      if ('caches' in window) {
        caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
      }
    } catch {}
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()))
      }
    } catch {}
    window.location.reload()
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="min-h-dvh flex items-center justify-center p-8"
      style={{ background: 'var(--surface-base, #060e1c)' }}
    >
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        {/* Logo — always visible, independent of CSS vars */}
        <img
          src="/logo-icon-dark.png"
          alt="Fluentia Academy"
          className="h-16 w-16 rounded-2xl"
          style={{ filter: 'drop-shadow(0 0 24px rgba(56,189,248,0.35))' }}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />

        {/* Spinner — uses inline styles so it shows even if Tailwind fails to load */}
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.12)',
            borderTopColor: '#38bdf8',
            animation: 'fluentia-boot-spin 0.9s linear infinite',
          }}
        />

        {/* Arabic loading text — bright enough to be readable on every screen */}
        <div style={{ color: '#e2e8f0', fontFamily: 'Tajawal, sans-serif' }}>
          <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>جاري تحميل أكاديمية طلاقة...</p>
          <p style={{ fontSize: 13, marginTop: 6, color: '#94a3b8' }}>
            لحظات من فضلك
          </p>
        </div>

        {/* Escape hatch — appears after 6s if boot is taking too long */}
        {showReload && (
          <button
            type="button"
            onClick={handleReload}
            style={{
              marginTop: 8,
              padding: '12px 24px',
              borderRadius: 12,
              border: '1px solid rgba(56,189,248,0.35)',
              background: 'rgba(56,189,248,0.12)',
              color: '#7dd3fc',
              fontFamily: 'Tajawal, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            التحميل يأخذ وقتاً أطول من المعتاد — اضغط لإعادة المحاولة
          </button>
        )}
      </div>

      {/* Inline keyframes so spinner works even if external CSS is broken */}
      <style>{`
        @keyframes fluentia-boot-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ─── Protected Route ─────────────────────────────────────────
function ProtectedRoute({ allowedRoles }) {
  const { user, profile, loading, impersonation, _realProfile } = useAuthStore()

  if (loading) return <LoadingSkeleton />
  if (!user) return <Navigate to="/login" replace />

  // Allow admin through when impersonating as another role
  const realRole = impersonation ? _realProfile?.role : profile?.role
  const effectiveRole = profile?.role
  const hasAccess = !allowedRoles
    || allowedRoles.includes(effectiveRole)
    || (realRole === 'admin' && impersonation && allowedRoles.includes(impersonation.role))

  if (!hasAccess) return <Navigate to="/" replace />

  return <Outlet />
}

// ─── Trainer Onboarding Guard ─────────────────────────────────
function TrainerOnboardingGuard({ children }) {
  const { profile, trainerData, impersonation, _realProfile } = useAuthStore()
  // Admin never needs trainer onboarding (even when impersonating as trainer)
  if (_realProfile?.role === 'admin' || profile?.role === 'admin') {
    return children
  }
  // Only redirect real trainers who haven't completed onboarding
  if (profile?.role === 'trainer' && trainerData && trainerData.onboarding_completed === false) {
    return <Navigate to="/trainer/onboarding" replace />
  }
  return children
}

// ─── Role-Based Redirect ─────────────────────────────────────
function RoleRedirect() {
  const { user, profile, loading } = useAuthStore()

  if (loading) return <LoadingSkeleton />
  if (!user) return <Navigate to="/login" replace />

  switch (profile?.role) {
    case 'student':
      return <Navigate to="/student" replace />
    case 'trainer':
      return <Navigate to="/trainer" replace />
    case 'admin':
      return <Navigate to="/admin" replace />
    case 'affiliate':
      return <Navigate to="/partner" replace />
    default:
      return <Navigate to="/login" replace />
  }
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const profile = useAuthStore((s) => s.profile)

  useEffect(() => {
    initialize()
  }, [initialize])

  // Report device presence for install tracking (runs once per session after auth)
  useEffect(() => {
    if (!profile?.id) return
    import('./utils/reportDevicePresence').then(({ reportDevicePresence }) => {
      reportDevicePresence(profile.id)
    }).catch(() => {})
  }, [profile?.id])

  // Session refresh when user returns to tab (e.g. after phone lock / background).
  // ONLY refreshes the token — does NOT refetch queries directly.
  // The TOKEN_REFRESHED event in authStore handles refetching AFTER the token is valid.
  // This prevents the race condition where queries fire with an expired JWT.
  const lastVisibleCheck = useRef(0)

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return

      const publicPaths = ['/login', '/forgot-password', '/reset-password', '/test', '/testimonials', '/parent']
      if (publicPaths.some(p => window.location.pathname.startsWith(p))) return

      // Throttle: max once per 2 minutes (was 30s — too aggressive).
      // JWT tokens last 1 hour, so refreshing every 30s on tab focus was wasteful.
      // Each refresh triggers TOKEN_REFRESHED → invalidateQueries, causing unnecessary lag.
      const now = Date.now()
      if (now - lastVisibleCheck.current < 120000) return
      lastVisibleCheck.current = now

      // Fire-and-forget: refresh the session token.
      // If successful, Supabase fires TOKEN_REFRESHED → authStore refetches queries.
      // If it fails (truly expired), queries will fail → retry logic handles it.
      supabase.auth.refreshSession().catch(() => {})
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
        <ThemeProvider />
        <AuroraBackground />
        <ThemeSwitcher />
        <ThemeOnboardingHint />
        <OfflineBanner />
        <ImpersonationBanner />
        <ForcePasswordChange />
        <OnboardingModal />
        <GamificationProvider />
        <GlobalSearch />

        <Routes>
          <Route path="/" element={<RoleRedirect />} />

          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><ForgotPassword /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/reset-password" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><ResetPassword /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/parent" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><ParentDashboard /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/test" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PlacementTest /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/testimonials" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><Testimonials /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/verify/:certId" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><CertificateVerification /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/partners" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PartnersLanding /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/partners/submitted" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PartnersSubmitted /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/partners/terms" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PartnersTerms /></Suspense>
            </ErrorBoundary>
          } />

          {/* Student routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<ErrorBoundary><LayoutShell /></ErrorBoundary>}>
              <Route path="/student" element={<Page><StudentDashboard /></Page>} />
              <Route path="/student/assignments" element={<Page><StudentAssignments /></Page>} />
              <Route path="/student/schedule" element={<Page><StudentSchedule /></Page>} />
              <Route path="/student/study-plan" element={<Page><StudentStudyPlan /></Page>} />
              <Route path="/student/grades" element={<Page><PackageRoute requiredPackage="talaqa" featureName="الدرجات والنتائج"><StudentGrades /></PackageRoute></Page>} />
              <Route path="/student/speaking" element={<Page><ComingSoon featureName="معمل التحدث" /></Page>} />
              <Route path="/student/speaking-lab" element={<Page><ComingSoon featureName="معمل التحدث" /></Page>} />
              <Route path="/student/library" element={<Page><StudentLibrary /></Page>} />
              <Route path="/student/leaderboard" element={<Page><StudentLeaderboard /></Page>} />
              <Route path="/student/recognition" element={<Page><StudentPeerRecognition /></Page>} />
              <Route path="/student/activity" element={<Page><StudentActivityFeed /></Page>} />
              <Route path="/student/challenges" element={<Page><StudentChallenges /></Page>} />
              <Route path="/student/creator-challenge" element={<Page><StudentCreatorChallenge /></Page>} />
              <Route path="/student/duels" element={<Page><StudentDuels /></Page>} />
              <Route path="/student/chat" element={<Page><StudentGroupChat /></Page>} />
              <Route path="/student/messages" element={<Page><StudentMessages /></Page>} />
              <Route path="/student/ai-chat" element={<Page><PackageRoute requiredPackage="talaqa" featureName="المساعد الذكي"><StudentChatbot /></PackageRoute></Page>} />
              <Route path="/student/vocabulary" element={<Page><StudentVocabulary /></Page>} />
              <Route path="/student/daily-review" element={<Page><DailyReview /></Page>} />
              <Route path="/student/level-exit-test/:levelId" element={<Page><LevelExitTest /></Page>} />
              <Route path="/student/flashcards" element={<Page><VocabularyFlashcards /></Page>} />
              <Route path="/student/billing" element={<Page><StudentBilling /></Page>} />
              <Route path="/student/exercises" element={<Page><StudentExercises /></Page>} />
              <Route path="/student/my-patterns" element={<Page><StudentErrorPatterns /></Page>} />
              <Route path="/student/voice-journal" element={<Page><StudentVoiceJournal /></Page>} />
              <Route path="/student/pronunciation" element={<Page><StudentPronunciation /></Page>} />
              <Route path="/student/conversation" element={<Page><StudentConversation /></Page>} />
              <Route path="/student/battles" element={<Page><StudentStreakBattles /></Page>} />
              <Route path="/student/success" element={<Page><StudentSuccessStories /></Page>} />
              <Route path="/student/events" element={<Page><StudentEvents /></Page>} />
              <Route path="/student/avatar" element={<Page><StudentAvatar /></Page>} />
              <Route path="/student/assessments" element={<Page><ComingSoon featureName="الاختبارات" /></Page>} />
              <Route path="/student/quiz" element={<Page><StudentQuiz /></Page>} />
              <Route path="/student/profile" element={<Page><StudentProfile /></Page>} />
              <Route path="/student/certificates" element={<Page><StudentCertificate /></Page>} />
              <Route path="/student/referral" element={<Page><StudentReferral /></Page>} />
              <Route path="/student/weekly-tasks" element={<Page><StudentWeeklyTasks /></Page>} />
              <Route path="/student/weekly-tasks/:id" element={<Page><StudentWeeklyTaskDetail /></Page>} />
              <Route path="/student/spelling" element={<Page><StudentSpelling /></Page>} />
              <Route path="/student/verbs" element={<Page><IrregularVerbsPractice /></Page>} />
              <Route path="/student/recordings" element={<Page><StudentRecordings /></Page>} />
              <Route path="/student/writing-lab" element={<Page><ComingSoon featureName="معمل الكتابة" /></Page>} />
              <Route path="/student/group-activity" element={<Page><PackageRoute requiredPackage="talaqa" featureName="نشاط المجموعة"><StudentGroupActivity /></PackageRoute></Page>} />
              <Route path="/student/adaptive-test" element={<Page><PackageRoute requiredPackage="talaqa" featureName="اختبار المستوى"><StudentAdaptiveTest /></PackageRoute></Page>} />
              <Route path="/student/ai-insights" element={<Page><PackageRoute requiredPackage="talaqa" featureName="رؤى ذكية"><StudentAIInsights /></PackageRoute></Page>} />
              <Route path="/student/progress" element={<Page><ProgressDashboard /></Page>} />
              <Route path="/student/curriculum" element={<Page><CurriculumBrowser /></Page>} />
              <Route path="/student/curriculum/level/:levelNumber" element={<Page><LevelUnits /></Page>} />
              <Route path="/student/curriculum/unit/:unitId" element={<Page><UnitContent /></Page>} />
              <Route path="/student/curriculum-old" element={<Page><StudentCurriculum /></Page>} />
              <Route path="/student/style-preview" element={<Page><StylePreview /></Page>} />
              <Route path="/student/placement-test" element={<Suspense fallback={null}><PlacementTestPage /></Suspense>} />
              <Route path="/student/placement-test/results/:sessionId" element={<Suspense fallback={null}><PlacementResultsPage /></Suspense>} />
            </Route>
          </Route>

          {/* Trainer routes */}
          <Route element={<ProtectedRoute allowedRoles={['trainer', 'admin']} />}>
            {/* Onboarding — full-screen, outside LayoutShell */}
            <Route path="/trainer/onboarding" element={
              <ErrorBoundary fallback={<PageErrorFallback />}>
                <Suspense fallback={<LoadingSkeleton />}><TrainerOnboarding /></Suspense>
              </ErrorBoundary>
            } />
            <Route element={<ErrorBoundary><TrainerOnboardingGuard><LayoutShell /></TrainerOnboardingGuard></ErrorBoundary>}>
              <Route path="/trainer" element={<Page><TrainerDashboard /></Page>} />
              <Route path="/trainer/assignments" element={<Page><TrainerAssignments /></Page>} />
              <Route path="/trainer/writing" element={<Page><TrainerGrading /></Page>} />
              <Route path="/trainer/grading" element={<Page><TrainerGrading /></Page>} />
              <Route path="/trainer/schedule" element={<Page><TrainerSchedule /></Page>} />
              <Route path="/trainer/notes" element={<Page><TrainerNotes /></Page>} />
              <Route path="/trainer/library" element={<Page><TrainerLibrary /></Page>} />
              <Route path="/trainer/points" element={<Page><TrainerQuickPoints /></Page>} />
              <Route path="/trainer/attendance" element={<Page><TrainerAttendance /></Page>} />
              <Route path="/trainer/student-notes" element={<Page><TrainerQuickNotes /></Page>} />
              <Route path="/trainer/students" element={<Page><TrainerStudentView /></Page>} />
              <Route path="/trainer/challenges" element={<Page><TrainerChallenges /></Page>} />
              <Route path="/trainer/teams" element={<Page><TrainerTeams /></Page>} />
              <Route path="/trainer/chat" element={<Page><TrainerGroupChat /></Page>} />
              <Route path="/trainer/messages" element={<Page><StudentMessages /></Page>} />
              <Route path="/trainer/ai-assistant" element={<Page><TrainerAIAssistant /></Page>} />
              <Route path="/trainer/reports" element={<Page><TrainerProgressReports /></Page>} />
              <Route path="/trainer/lesson-planner" element={<Page><TrainerLessonPlanner /></Page>} />
              <Route path="/trainer/quiz" element={<Page><TrainerQuizGenerator /></Page>} />
              <Route path="/trainer/weekly-grading" element={<Page><TrainerWeeklyGrading /></Page>} />
              <Route path="/trainer/recordings" element={<Page><AdminRecordings /></Page>} />
              <Route path="/trainer/conversation" element={<Page><TrainerGroupChat /></Page>} />
              <Route path="/trainer/curriculum" element={<Page><TrainerCurriculum /></Page>} />
              <Route path="/trainer/progress-matrix" element={<Page><TrainerProgressMatrix /></Page>} />
              <Route path="/trainer/student-curriculum" element={<Page><TrainerCurriculumPreview><CurriculumBrowser /></TrainerCurriculumPreview></Page>} />
              <Route path="/trainer/student-curriculum/level/:levelNumber" element={<Page><TrainerCurriculumPreview><LevelUnits /></TrainerCurriculumPreview></Page>} />
              <Route path="/trainer/student-curriculum/unit/:unitId" element={<Page><TrainerCurriculumPreview><UnitContent /></TrainerCurriculumPreview></Page>} />
              <Route path="/trainer/interactive-curriculum" element={<Page><InteractiveCurriculumLevels /></Page>} />
              <Route path="/trainer/interactive-curriculum/:levelId" element={<Page><InteractiveCurriculumUnits /></Page>} />
              <Route path="/trainer/interactive-curriculum/:levelId/:unitId" element={<Page><InteractiveCurriculumPage /></Page>} />
              <Route path="/trainer/my-notes" element={<Page><MyNotes /></Page>} />
              <Route path="/trainer/weekly-report" element={<Page><WeeklyReport /></Page>} />
              <Route path="/trainer/my-students" element={<Page><MyStudents /></Page>} />
              <Route path="/trainer/student/:studentId/progress" element={<Page><StudentProgressDetail /></Page>} />
              <Route path="/trainer/student/:studentId" element={<Page><StudentProgressDetail /></Page>} />
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<ErrorBoundary><LayoutShell /></ErrorBoundary>}>
              <Route path="/admin" element={<Page><AdminDashboard /></Page>} />
              <Route path="/admin/users" element={<Page><AdminStudents /></Page>} />
              <Route path="/admin/groups" element={<Page><AdminGroups /></Page>} />
              <Route path="/admin/trainers" element={<Page><AdminTrainers /></Page>} />
              <Route path="/admin/packages" element={<Page><AdminPayments /></Page>} />
              <Route path="/admin/reports" element={<Page><AdminReports /></Page>} />
              <Route path="/admin/churn" element={<Page><AdminChurnPrediction /></Page>} />
              <Route path="/admin/scheduling" element={<Page><AdminSmartScheduling /></Page>} />
              <Route path="/admin/content" element={<Page><AdminContent /></Page>} />
              <Route path="/admin/settings" element={<Page><AdminSettings /></Page>} />
              <Route path="/admin/weekly-tasks" element={<Page><AdminWeeklyTasks /></Page>} />
              <Route path="/admin/holidays" element={<Page><AdminHolidays /></Page>} />
              <Route path="/admin/audit-log" element={<Page><AdminAuditLog /></Page>} />
              <Route path="/admin/testimonials" element={<Page><AdminTestimonials /></Page>} />
              <Route path="/admin/today" element={<Page><AdminActionCenter /></Page>} />
              <Route path="/admin/export" element={<Page><AdminDataExport /></Page>} />
              <Route path="/admin/recordings" element={<Page><AdminRecordings /></Page>} />
              <Route path="/admin/curriculum" element={<Page><AdminCurriculum /></Page>} />
              <Route path="/admin/curriculum/level/:levelId" element={<Page><LevelDetail /></Page>} />
              <Route path="/admin/curriculum/unit/:unitId" element={<Page><UnitEditor /></Page>} />
              <Route path="/admin/curriculum/ielts" element={<Page><IELTSManagement /></Page>} />
              <Route path="/admin/curriculum/progress" element={<Page><CurriculumProgress /></Page>} />
              <Route path="/admin/curriculum/map" element={<Page><CurriculumMap /></Page>} />
              <Route path="/admin/test-bank" element={<Page><AdminTestBank /></Page>} />
              <Route path="/admin/ai-dashboard" element={<Page><AdminAIDashboard /></Page>} />
              <Route path="/admin/content-bank" element={<Page><AdminContentBank /></Page>} />
              <Route path="/admin/daily-reports" element={<Page><AdminDailyReports /></Page>} />
              <Route path="/admin/announcements" element={<Page><ComposeAnnouncement /></Page>} />
              <Route path="/admin/analytics" element={<Page><AdminAnalytics /></Page>} />
              <Route path="/admin/placement-queue" element={<Page><PlacementQueuePage /></Page>} />
              <Route path="/admin/creator-challenge" element={<Page><AdminCreatorChallenge /></Page>} />
              <Route path="/admin/affiliates" element={<Page><AffiliatesList /></Page>} />
              <Route path="/admin/affiliates/dashboard" element={<Page><AffiliatesDashboard /></Page>} />
              <Route path="/admin/affiliates/payouts" element={<Page><AffiliatePayouts /></Page>} />
              <Route path="/admin/affiliates/materials" element={<Page><AffiliateMaterialsAdmin /></Page>} />
              <Route path="/admin/affiliates/:id" element={<Page><AffiliateDetail /></Page>} />
              <Route path="/admin/student-curriculum" element={<Page><AdminCurriculumPreview><CurriculumBrowser /></AdminCurriculumPreview></Page>} />
              <Route path="/admin/student-curriculum/level/:levelNumber" element={<Page><AdminCurriculumPreview><LevelUnits /></AdminCurriculumPreview></Page>} />
              <Route path="/admin/student-curriculum/unit/:unitId" element={<Page><AdminCurriculumPreview><UnitContent /></AdminCurriculumPreview></Page>} />
              <Route path="/admin/interactive-curriculum" element={<Page><InteractiveCurriculumLevels /></Page>} />
              <Route path="/admin/interactive-curriculum/:levelId" element={<Page><InteractiveCurriculumUnits /></Page>} />
              <Route path="/admin/interactive-curriculum/:levelId/:unitId" element={<Page><InteractiveCurriculumPage /></Page>} />
              <Route path="/admin/student/:studentId/progress" element={<Page><StudentProgressDetail /></Page>} />
            </Route>
          </Route>

          {/* Partner suspended (accessible without full partner auth) */}
          <Route path="/partner/suspended" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PartnerSuspended /></Suspense>
            </ErrorBoundary>
          } />

          {/* Partner portal routes */}
          <Route element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}>
                <PartnerRoute />
              </Suspense>
            </ErrorBoundary>
          }>
            <Route element={
              <Suspense fallback={<LoadingSkeleton />}>
                <PartnerLayout />
              </Suspense>
            }>
              <Route path="/partner" element={<Page><PartnerDashboard /></Page>} />
              <Route path="/partner/conversions" element={<Page><PartnerConversions /></Page>} />
              <Route path="/partner/payouts" element={<Page><PartnerPayouts /></Page>} />
              <Route path="/partner/materials" element={<Page><PartnerMaterials /></Page>} />
              <Route path="/partner/settings" element={<Page><PartnerSettings /></Page>} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )

}
