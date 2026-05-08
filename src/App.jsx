import { useEffect, useRef, useState, Suspense } from 'react'
import LanguageBootstrap from './components/i18n/LanguageBootstrap'
import { useQuery } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { supabase } from './lib/supabase'
import LoginPage from './pages/public/LoginPage'
import LayoutShell from './components/layout/LayoutShell'
import TrainerLayout from './layouts/TrainerLayout'
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
import { AuroraBackground } from './design-system/components'

// ─── Lazy-loaded Pages (with chunk retry on stale deploys) ───
const StudentDashboard = lazyRetry(() => import('./pages/student/StudentDashboard'))
const StudentAssignments = lazyRetry(() => import('./pages/student/StudentAssignments'))
const StudentGrades = lazyRetry(() => import('./pages/student/StudentGrades'))
const StudentProfile = lazyRetry(() => import('./pages/student/StudentProfile'))
const StudentSpeaking = lazyRetry(() => import('./pages/student/StudentSpeaking'))
const StudentLibrary = lazyRetry(() => import('./pages/student/StudentLibrary'))
const StudentLeaderboard = lazyRetry(() => import('./pages/student/StudentLeaderboard'))
const StudentPeerRecognition = lazyRetry(() => import('./pages/student/StudentPeerRecognition'))
const StudentActivityFeed = lazyRetry(() => import('./pages/student/StudentActivityFeed'))
const StudentGroupChat = lazyRetry(() => import('./pages/student/StudentGroupChat'))
const StudentMessages = lazyRetry(() => import('./pages/student/StudentMessages'))
const StudentChatbot = lazyRetry(() => import('./pages/student/StudentChatbot'))
const StudentVocabulary = lazyRetry(() => import('./pages/student/StudentVocabulary'))
const StudentBilling = lazyRetry(() => import('./pages/student/StudentBilling'))
const StudentExercises = lazyRetry(() => import('./pages/student/StudentExercises'))
const StudentErrorPatterns = lazyRetry(() => import('./pages/student/StudentErrorPatterns'))
const StudentVoiceJournal = lazyRetry(() => import('./pages/student/StudentVoiceJournal'))
const StudentPronunciation = lazyRetry(() => import('./pages/student/StudentPronunciation'))
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
const StudentWritingLab = lazyRetry(() => import('./pages/student/StudentWritingLab'))
const StudentGroupActivity = lazyRetry(() => import('./pages/student/StudentGroupActivity'))
const StudentAdaptiveTest = lazyRetry(() => import('./pages/student/StudentAdaptiveTest'))
const StudentAIInsights = lazyRetry(() => import('./pages/student/StudentAIInsights'))
const DailyReview = lazyRetry(() => import('./pages/student/DailyReview'))
const LevelExitTest = lazyRetry(() => import('./pages/student/LevelExitTest'))
const LevelJourneyMap = lazyRetry(() => import('./pages/student/LevelJourneyMap'))
const AccountPausedPage = lazyRetry(() => import('./pages/student/AccountPausedPage'))
const StudentDuels = lazyRetry(() => import('./pages/student/StudentDuels'))
const CompetitionHub   = lazyRetry(() => import('./pages/student/CompetitionHub'))
const CompetitionRules = lazyRetry(() => import('./pages/student/CompetitionRules'))
const HowToEarnPage = lazyRetry(() => import('./pages/student/HowToEarnPage'))
const ProgressDashboard = lazyRetry(() => import('./pages/student/ProgressDashboard'))
const StudentCurriculum = lazyRetry(() => import('./pages/student/StudentCurriculum'))
const VocabularyFlashcards = lazyRetry(() => import('./pages/student/vocabulary/VocabularyFlashcards'))
const CurriculumBrowser = lazyRetry(() => import('./pages/student/curriculum/CurriculumBrowser'))
const StylePreview = lazyRetry(() => import('./pages/student/curriculum/StylePreview'))
const LevelUnits = lazyRetry(() => import('./pages/student/curriculum/LevelUnits'))
const UnitContent = lazyRetry(() => import('./pages/student/curriculum/UnitContent'))
const PlacementTestPage = lazyRetry(() => import('./pages/student/placement/PlacementTestPage'))
const PlacementResultsPage = lazyRetry(() => import('./pages/student/placement/PlacementResultsPage'))
const StudentProgressReports = lazyRetry(() => import('./pages/student/ProgressReports'))
const StudentReportView = lazyRetry(() => import('./pages/student/ReportView'))
const StudentIELTSHub = lazyRetry(() => import('./pages/student/ielts/StudentIELTSHub'))
const IELTSComingSoon = lazyRetry(() => import('./pages/student/ielts/IELTSComingSoon'))
const DiagnosticFlow = lazyRetry(() => import('./pages/student/ielts/diagnostic/DiagnosticFlow'))
const ReadingLab = lazyRetry(() => import('./pages/student/ielts/reading/ReadingLab'))
const ReadingSkillModule = lazyRetry(() => import('./pages/student/ielts/reading/ReadingSkillModule'))
const ReadingPassagePractice = lazyRetry(() => import('./pages/student/ielts/reading/ReadingPassagePractice'))
const ListeningLab = lazyRetry(() => import('./pages/student/ielts/listening/ListeningLab'))
const ListeningSectionModule = lazyRetry(() => import('./pages/student/ielts/listening/ListeningSectionModule'))
const ListeningPractice = lazyRetry(() => import('./pages/student/ielts/listening/ListeningPractice'))
const WritingLab = lazyRetry(() => import('./pages/student/ielts/writing/WritingLab'))
const WritingTaskPicker = lazyRetry(() => import('./pages/student/ielts/writing/WritingTaskPicker'))
const WritingWorkspace = lazyRetry(() => import('./pages/student/ielts/writing/WritingWorkspace'))
const WritingFeedback = lazyRetry(() => import('./pages/student/ielts/writing/WritingFeedback'))
const WritingHistory = lazyRetry(() => import('./pages/student/ielts/writing/WritingHistory'))
const SpeakingLab = lazyRetry(() => import('./pages/student/ielts/speaking/SpeakingLab'))
const SpeakingPartPicker = lazyRetry(() => import('./pages/student/ielts/speaking/SpeakingPartPicker'))
const SpeakingSession = lazyRetry(() => import('./pages/student/ielts/speaking/SpeakingSession'))
const SpeakingFeedback = lazyRetry(() => import('./pages/student/ielts/speaking/SpeakingFeedback'))
const SpeakingHistory = lazyRetry(() => import('./pages/student/ielts/speaking/SpeakingHistory'))
const MockCenter = lazyRetry(() => import('./pages/student/ielts/mock/MockCenter'))
const MockPreFlight = lazyRetry(() => import('./pages/student/ielts/mock/MockPreFlight'))
const MockFlow = lazyRetry(() => import('./pages/student/ielts/mock/MockFlow'))
const MockResult = lazyRetry(() => import('./pages/student/ielts/mock/MockResult'))
const MockHistory = lazyRetry(() => import('./pages/student/ielts/mock/MockHistory'))
const IELTSPlanView = lazyRetry(() => import('./pages/student/ielts/plan/IELTSPlanView'))
const IELTSPlanEdit = lazyRetry(() => import('./pages/student/ielts/plan/IELTSPlanEdit'))
const ErrorBankHome = lazyRetry(() => import('./pages/student/ielts/errors/ErrorBankHome'))
const ErrorBankReview = lazyRetry(() => import('./pages/student/ielts/errors/ErrorBankReview'))
const IELTSGuard = lazyRetry(() => import('./components/ielts/IELTSGuard'))

// IELTS Masterclass V2 (feature-flagged, Phase 0B scaffold)
const IELTSV2Gate           = lazyRetry(() => import('./pages/student/ielts-v2/_layout/IELTSV2Gate'))
const IELTSMasterclassLayout = lazyRetry(() => import('./pages/student/ielts-v2/_layout/IELTSMasterclassLayout'))
const IELTSV2Home           = lazyRetry(() => import('./pages/student/ielts-v2/Home'))
const IELTSV2Diagnostic        = lazyRetry(() => import('./pages/student/ielts-v2/Diagnostic'))
const IELTSV2DiagnosticResults = lazyRetry(() => import('./pages/student/ielts-v2/DiagnosticResults'))
const IELTSV2Reading           = lazyRetry(() => import('./pages/student/ielts-v2/Reading'))
const IELTSV2Listening      = lazyRetry(() => import('./pages/student/ielts-v2/Listening'))
const IELTSV2Writing        = lazyRetry(() => import('./pages/student/ielts-v2/Writing'))
const IELTSV2Speaking       = lazyRetry(() => import('./pages/student/ielts-v2/Speaking'))
const IELTSV2Journey        = lazyRetry(() => import('./pages/student/ielts-v2/Journey'))
const IELTSV2Errors         = lazyRetry(() => import('./pages/student/ielts-v2/Errors'))
const IELTSV2Mock           = lazyRetry(() => import('./pages/student/ielts-v2/Mock'))
const IELTSV2Trainer        = lazyRetry(() => import('./pages/student/ielts-v2/Trainer'))
const IELTSV2Readiness      = lazyRetry(() => import('./pages/student/ielts-v2/Readiness'))

const TrainerOnboarding = lazyRetry(() => import('./pages/trainer/TrainerOnboarding'))
const TrainerStudentView = lazyRetry(() => import('./pages/trainer/TrainerStudentView.legacy'))
const TrainerCurriculum = lazyRetry(() => import('./pages/trainer/TrainerCurriculum'))
const ReportReview = lazyRetry(() => import('./pages/trainer/ReportReview'))
const StudentProgressDetail = lazyRetry(() => import('./pages/trainer/StudentProgressDetail'))
const CockpitPage = lazyRetry(() => import('./pages/trainer/v2/CockpitPage'))
// Trainer V2 pages
const GradingStationPage = lazyRetry(() => import('./pages/trainer/v2/GradingStationPage'))
const ClassDebriefPage = lazyRetry(() => import('./pages/trainer/v2/ClassDebriefPage'))

const HelpPage = lazyRetry(() => import('./pages/trainer/v2/HelpPage'))
const TrainerSettings = lazyRetry(() => import('./pages/trainer/TrainerSettings'))
const Student360Page = lazyRetry(() => import('./pages/trainer/v2/Student360Page'))
const IELTSOverview = lazyRetry(() => import('./pages/trainer/IELTSOverview'))

const AdminDashboard = lazyRetry(() => import('./pages/admin/AdminDashboard'))
const EvaluationHealthPage = lazyRetry(() => import('./pages/admin/EvaluationHealthPage'))
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
const CompetitionAdmin = lazyRetry(() => import('./pages/admin/CompetitionAdmin'))
const PlacementQueuePage = lazyRetry(() => import('./pages/admin/PlacementQueuePage'))
const UnitMasteryPage = lazyRetry(() => import('./pages/student/assessment/UnitMasteryPage'))
const UnitMasteryResultPage = lazyRetry(() => import('./pages/student/assessment/UnitMasteryResultPage'))
const UnitMasteryManagerPage = lazyRetry(() => import('./pages/admin/UnitMasteryManagerPage'))

const AdminCurriculumPreview = lazyRetry(() => import('./pages/admin/AdminCurriculumPreview'))
const IELTSPreview = lazyRetry(() => import('./pages/admin/IELTSPreview'))
const TrainerCurriculumPreview = lazyRetry(() => import('./pages/trainer/TrainerCurriculumPreview'))
const InteractiveCurriculumLevels = lazyRetry(() => import('./pages/shared/InteractiveCurriculumLevels'))
const InteractiveCurriculumUnits = lazyRetry(() => import('./pages/shared/InteractiveCurriculumUnits'))
const InteractiveCurriculumPage = lazyRetry(() => import('./pages/shared/InteractiveCurriculumPage'))

const SharedReport = lazyRetry(() => import('./pages/public/SharedReport'))

const PartnersLanding = lazyRetry(() => import('./pages/partners/PartnersLanding'))
const PartnersSubmitted = lazyRetry(() => import('./pages/partners/PartnersSubmitted'))
const PartnersTerms = lazyRetry(() => import('./pages/partners/PartnersTerms'))
const AffiliatesList = lazyRetry(() => import('./pages/admin/AffiliatesList'))
const AffiliateDetail = lazyRetry(() => import('./pages/admin/AffiliateDetail'))
const AffiliatesDashboard = lazyRetry(() => import('./pages/admin/AffiliatesDashboard'))
const AffiliatePayouts = lazyRetry(() => import('./pages/admin/AffiliatePayouts'))
const AffiliateMaterialsAdmin = lazyRetry(() => import('./pages/admin/AffiliateMaterialsAdmin'))
const MasterclassDesignShowcase = lazyRetry(() => import('./pages/admin/MasterclassDesignShowcase'))
const AtelierStudentPreview = lazyRetry(() => import('./pages/admin/atelier-preview/AtelierStudentPreview'))
const AtelierTrainerPreview = lazyRetry(() => import('./pages/admin/atelier-preview/AtelierTrainerPreview'))
const AtelierAdminPreview   = lazyRetry(() => import('./pages/admin/atelier-preview/AtelierAdminPreview'))

const PartnerLayout = lazyRetry(() => import('./layouts/PartnerLayout'))
const PartnerRoute = lazyRetry(() => import('./components/PartnerRoute'))
const PartnerDashboard = lazyRetry(() => import('./pages/partner/PartnerDashboard'))
const PartnerConversions = lazyRetry(() => import('./pages/partner/PartnerConversions'))
const PartnerPayouts = lazyRetry(() => import('./pages/partner/PartnerPayouts'))
const PartnerMaterials = lazyRetry(() => import('./pages/partner/PartnerMaterials'))
const PartnerSettings = lazyRetry(() => import('./pages/partner/PartnerSettings'))
const PartnerSuspended = lazyRetry(() => import('./pages/partner/PartnerSuspended'))
const PartnerLogin = lazyRetry(() => import('./pages/partner/PartnerLogin'))
const PartnerSetPassword = lazyRetry(() => import('./pages/partner/PartnerSetPassword'))

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
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
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
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const loading = useAuthStore((s) => s.loading)
  const impersonation = useAuthStore((s) => s.impersonation)
  const _realProfile = useAuthStore((s) => s._realProfile)

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

// ─── Student Status Guard — redirects paused students ─────────
function StudentStatusGuard() {
  const profile = useAuthStore((s) => s.profile)
  const isImpersonating = useAuthStore((s) => s.isImpersonating)
  const navigate = useNavigate()
  const location = useLocation()

  const { data: student } = useQuery({
    queryKey: ['student-status-guard', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('status')
        .eq('id', profile.id)
        .single()
      return data
    },
    enabled: !!profile?.id && profile?.role === 'student',
    staleTime: 60_000,
  })

  useEffect(() => {
    if (isImpersonating) return
    if (student?.status === 'paused' && location.pathname !== '/account/paused') {
      navigate('/account/paused', { replace: true })
    }
  }, [student, location.pathname, navigate, isImpersonating])

  return <Outlet />
}

// ─── Trainer Onboarding Guard ─────────────────────────────────
function TrainerOnboardingGuard({ children }) {
  const profile = useAuthStore((s) => s.profile)
  const trainerData = useAuthStore((s) => s.trainerData)
  const impersonation = useAuthStore((s) => s.impersonation)
  const _realProfile = useAuthStore((s) => s._realProfile)
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
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const loading = useAuthStore((s) => s.loading)

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
      <LanguageBootstrap>
      <BrowserRouter>
        <ToastProvider>
        <ThemeProvider />
        <AuroraBackground />
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
          <Route path="/r/:token" element={<Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full" /></div>}><SharedReport /></Suspense>} />
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

          {/* Account paused — outside student layout, no sidebar */}
          <Route path="/account/paused" element={
            <Suspense fallback={<LoadingSkeleton />}><AccountPausedPage /></Suspense>
          } />

          {/* Student routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<StudentStatusGuard />}>
            <Route element={<ErrorBoundary><LayoutShell /></ErrorBoundary>}>
              <Route path="/student" element={<Page><StudentDashboard /></Page>} />
              <Route path="/student/assignments" element={<Page><StudentAssignments /></Page>} />
              <Route path="/student/study-plan" element={<Page><StudentStudyPlan /></Page>} />
              <Route path="/student/grades" element={<Page><PackageRoute requiredPackage="talaqa" featureName="الدرجات والنتائج"><StudentGrades /></PackageRoute></Page>} />
              <Route path="/student/speaking" element={<Page><ComingSoon featureName="معمل التحدث" /></Page>} />
              <Route path="/student/speaking-lab" element={<Page><ComingSoon featureName="معمل التحدث" /></Page>} />
              <Route path="/student/library" element={<Page><StudentLibrary /></Page>} />
              <Route path="/student/leaderboard" element={<Page><StudentLeaderboard /></Page>} />
              <Route path="/student/recognition" element={<Page><StudentPeerRecognition /></Page>} />
              <Route path="/student/activity" element={<Page><StudentActivityFeed /></Page>} />
              <Route path="/student/duels" element={<Page><StudentDuels /></Page>} />
              <Route path="/student/competition" element={<Page><CompetitionHub /></Page>} />
              <Route path="/student/competition/rules" element={<Page><CompetitionRules /></Page>} />
              <Route path="/student/how-to-earn" element={<Page><HowToEarnPage /></Page>} />
              <Route path="/student/chat" element={<Page><StudentGroupChat /></Page>} />
              <Route path="/student/messages" element={<Page><StudentMessages /></Page>} />
              <Route path="/student/ai-chat" element={<Page><PackageRoute requiredPackage="talaqa" featureName="المساعد الذكي"><StudentChatbot /></PackageRoute></Page>} />
              <Route path="/student/vocabulary" element={<Page><StudentVocabulary /></Page>} />
              <Route path="/student/daily-review" element={<Page><DailyReview /></Page>} />
              <Route path="/student/level-exit-test/:levelId" element={<Page><LevelExitTest /></Page>} />
              <Route path="/student/level-journey" element={<Page><LevelJourneyMap /></Page>} />
              <Route path="/student/flashcards" element={<Page><VocabularyFlashcards /></Page>} />
              <Route path="/student/billing" element={<Page><StudentBilling /></Page>} />
              <Route path="/student/exercises" element={<Page><StudentExercises /></Page>} />
              <Route path="/student/my-patterns" element={<Page><StudentErrorPatterns /></Page>} />
              <Route path="/student/voice-journal" element={<Page><StudentVoiceJournal /></Page>} />
              <Route path="/student/pronunciation" element={<Page><StudentPronunciation /></Page>} />
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
              <Route path="/student/writing-lab" element={<Page><ComingSoon featureName="معمل الكتابة" /></Page>} />
              <Route path="/student/group-activity" element={<Page><PackageRoute requiredPackage="talaqa" featureName="نشاط المجموعة"><StudentGroupActivity /></PackageRoute></Page>} />
              <Route path="/student/adaptive-test" element={<Page><PackageRoute requiredPackage="talaqa" featureName="اختبار المستوى"><StudentAdaptiveTest /></PackageRoute></Page>} />
              <Route path="/student/ai-insights" element={<Page><PackageRoute requiredPackage="talaqa" featureName="رؤى ذكية"><StudentAIInsights /></PackageRoute></Page>} />
              <Route path="/student/progress" element={<Page><ProgressDashboard /></Page>} />
              <Route path="/student/progress-reports" element={<Page><StudentProgressReports /></Page>} />
              <Route path="/student/progress-reports/:id" element={<Page><StudentReportView /></Page>} />
              <Route path="/student/curriculum" element={<Page><CurriculumBrowser /></Page>} />
              <Route path="/student/curriculum/level/:levelNumber" element={<Page><LevelUnits /></Page>} />
              <Route path="/student/curriculum/unit/:unitId" element={<Page><UnitContent /></Page>} />
              <Route path="/student/curriculum-old" element={<Page><StudentCurriculum /></Page>} />
              <Route path="/student/style-preview" element={<Page><StylePreview /></Page>} />
              <Route path="/student/placement-test" element={<Suspense fallback={null}><PlacementTestPage /></Suspense>} />
              <Route path="/student/placement-test/results/:sessionId" element={<Suspense fallback={null}><PlacementResultsPage /></Suspense>} />
              <Route path="/student/unit-mastery/:assessmentId" element={<Suspense fallback={null}><UnitMasteryPage /></Suspense>} />
              <Route path="/student/unit-mastery-result/:attemptId" element={<Suspense fallback={null}><UnitMasteryResultPage /></Suspense>} />
              {/* IELTS routes — all gated by IELTSGuard (single package-access check) */}
              <Route path="/student/ielts" element={<Suspense fallback={<PageSkeleton />}><IELTSGuard /></Suspense>}>
                <Route index element={<Page><StudentIELTSHub /></Page>} />
                <Route path="diagnostic" element={<Page><DiagnosticFlow /></Page>} />
                <Route path="reading" element={<Page><ReadingLab /></Page>} />
                <Route path="reading/skill/:questionType" element={<Page><ReadingSkillModule /></Page>} />
                <Route path="reading/passage/:passageId" element={<Page><ReadingPassagePractice /></Page>} />
                <Route path="listening" element={<Page><ListeningLab /></Page>} />
                <Route path="listening/section/:sectionNumber" element={<Page><ListeningSectionModule /></Page>} />
                <Route path="listening/section/:sectionNumber/practice/:sectionId" element={<Page><ListeningPractice /></Page>} />
                <Route path="writing" element={<Page><WritingLab /></Page>} />
                <Route path="writing/history" element={<Page><WritingHistory /></Page>} />
                <Route path="writing/feedback/:submissionId" element={<Page><WritingFeedback /></Page>} />
                <Route path="writing/:category" element={<Page><WritingTaskPicker /></Page>} />
                <Route path="writing/:category/task/:taskId" element={<Page><WritingWorkspace /></Page>} />
                <Route path="speaking" element={<Page><SpeakingLab /></Page>} />
                <Route path="speaking/history" element={<Page><SpeakingHistory /></Page>} />
                <Route path="speaking/feedback/:sessionId" element={<Page><SpeakingFeedback /></Page>} />
                <Route path="speaking/part/:partNum" element={<Page><SpeakingPartPicker /></Page>} />
                <Route path="speaking/session/:questionId" element={<Page><SpeakingSession /></Page>} />
                <Route path="mock" element={<Page><MockCenter /></Page>} />
                <Route path="mock/history" element={<Page><MockHistory /></Page>} />
                <Route path="mock/brief/:mockId" element={<Page><MockPreFlight /></Page>} />
                <Route path="mock/attempt/:attemptId" element={<Page><MockFlow /></Page>} />
                <Route path="mock/result/:resultId" element={<Page><MockResult /></Page>} />
                <Route path="plan" element={<Page><IELTSPlanView /></Page>} />
                <Route path="plan/edit" element={<Page><IELTSPlanEdit /></Page>} />
                <Route path="errors" element={<Page><ErrorBankHome /></Page>} />
                <Route path="errors/review" element={<Page><ErrorBankReview /></Page>} />
                <Route path=":section" element={<Page><IELTSComingSoon /></Page>} />
              </Route>

              {/* IELTS Masterclass V2 — feature-flagged scaffold (Phase 0B) */}
              <Route path="/student/ielts-v2" element={<Suspense fallback={<PageSkeleton />}><IELTSV2Gate /></Suspense>}>
                <Route element={<Suspense fallback={<PageSkeleton />}><IELTSGuard /></Suspense>}>
                  <Route element={<IELTSMasterclassLayout />}>
                    <Route index element={<IELTSV2Home />} />
                    <Route path="diagnostic" element={<IELTSV2Diagnostic />} />
                    <Route path="diagnostic/results" element={<IELTSV2DiagnosticResults />} />
                    <Route path="reading"    element={<IELTSV2Reading />} />
                    <Route path="listening"  element={<IELTSV2Listening />} />
                    <Route path="writing"    element={<IELTSV2Writing />} />
                    <Route path="speaking"   element={<IELTSV2Speaking />} />
                    <Route path="journey"    element={<IELTSV2Journey />} />
                    <Route path="errors"     element={<IELTSV2Errors />} />
                    <Route path="mock"       element={<IELTSV2Mock />} />
                    <Route path="trainer"    element={<IELTSV2Trainer />} />
                    <Route path="readiness"  element={<IELTSV2Readiness />} />
                  </Route>
                </Route>
              </Route>
            </Route>
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
            <Route element={<ErrorBoundary><TrainerOnboardingGuard><TrainerLayout /></TrainerOnboardingGuard></ErrorBoundary>}>
              {/* ── V2: real pages (existing components, swapped in T3/T6/T7) ── */}
              <Route path="/trainer" element={<Page><CockpitPage /></Page>} />
              <Route path="/trainer/grading" element={<Page><GradingStationPage /></Page>} />
              <Route path="/trainer/debrief/:summaryId" element={<Page><ClassDebriefPage /></Page>} />
              <Route path="/trainer/students" element={<Page><TrainerStudentView /></Page>} />
              <Route path="/trainer/curriculum" element={<Page><TrainerCurriculum /></Page>} />

              {/* ── Deprecated routes → redirect to active pages ── */}
              <Route path="/trainer/interventions" element={<Navigate to="/trainer/students" replace />} />
              <Route path="/trainer/prep" element={<Navigate to="/trainer" replace />} />
              <Route path="/trainer/live" element={<Navigate to="/trainer" replace />} />
              <Route path="/trainer/competition" element={<Navigate to="/trainer" replace />} />
              <Route path="/trainer/my-growth" element={<Navigate to="/trainer" replace />} />
              <Route path="/trainer/nabih" element={<Navigate to="/trainer" replace />} />
              <Route path="/trainer/nabih/:conversationId" element={<Navigate to="/trainer" replace />} />
              <Route path="/trainer/help" element={<Page><HelpPage /></Page>} />
              <Route path="/trainer/settings" element={<Page><TrainerSettings /></Page>} />
              <Route path="/trainer/students/:studentId" element={<Page><TrainerStudentView /></Page>} />

              {/* ── Keep as-is: still functional ── */}
              <Route path="/trainer/progress-reports/:id/review" element={<Page><ReportReview /></Page>} />
              <Route path="/trainer/student-curriculum" element={<Page><TrainerCurriculumPreview><CurriculumBrowser /></TrainerCurriculumPreview></Page>} />
              <Route path="/trainer/student-curriculum/level/:levelNumber" element={<Page><TrainerCurriculumPreview><LevelUnits /></TrainerCurriculumPreview></Page>} />
              <Route path="/trainer/student-curriculum/unit/:unitId" element={<Page><TrainerCurriculumPreview><UnitContent /></TrainerCurriculumPreview></Page>} />
              <Route path="/trainer/interactive-curriculum" element={<Page><InteractiveCurriculumLevels /></Page>} />
              <Route path="/trainer/interactive-curriculum/:levelId" element={<Page><InteractiveCurriculumUnits /></Page>} />
              <Route path="/trainer/interactive-curriculum/:levelId/:unitId" element={<Page><InteractiveCurriculumPage /></Page>} />
              <Route path="/trainer/student/:studentId/progress" element={<Page><StudentProgressDetail /></Page>} />
              <Route path="/trainer/student/:studentId" element={<Page><Student360Page /></Page>} />
              <Route path="/trainer/ielts" element={<Page><IELTSOverview /></Page>} />

              {/* ── Redirects: 19 legacy routes → V2 equivalents ── */}
              {['/trainer/notes', '/trainer/library', '/trainer/points',
                '/trainer/chat', '/trainer/messages', '/trainer/my-notes',
                '/trainer/weekly-report'].map(p => (
                <Route key={p} path={p} element={<Navigate to="/trainer" replace />} />
              ))}
              {['/trainer/assignments', '/trainer/writing', '/trainer/weekly-grading'].map(p => (
                <Route key={p} path={p} element={<Navigate to="/trainer/grading" replace />} />
              ))}
              {['/trainer/student-notes', '/trainer/teams', '/trainer/reports',
                '/trainer/progress-matrix', '/trainer/my-students'].map(p => (
                <Route key={p} path={p} element={<Navigate to="/trainer/students" replace />} />
              ))}
              {['/trainer/attendance', '/trainer/lesson-planner', '/trainer/quiz'].map(p => (
                <Route key={p} path={p} element={<Navigate to="/trainer" replace />} />
              ))}
              <Route path="/trainer/ai-assistant" element={<Navigate to="/trainer" replace />} />
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
              <Route path="/admin/evaluation-health" element={<Page><EvaluationHealthPage /></Page>} />
              <Route path="/admin/announcements" element={<Page><ComposeAnnouncement /></Page>} />
              <Route path="/admin/analytics" element={<Page><AdminAnalytics /></Page>} />
              <Route path="/admin/placement-queue" element={<Page><PlacementQueuePage /></Page>} />
              <Route path="/admin/unit-mastery" element={<Page><UnitMasteryManagerPage /></Page>} />
              <Route path="/admin/competition" element={<Page><CompetitionAdmin /></Page>} />
              <Route path="/admin/affiliates" element={<Page><AffiliatesList /></Page>} />
              <Route path="/admin/affiliates/dashboard" element={<Page><AffiliatesDashboard /></Page>} />
              <Route path="/admin/affiliates/payouts" element={<Page><AffiliatePayouts /></Page>} />
              <Route path="/admin/affiliates/materials" element={<Page><AffiliateMaterialsAdmin /></Page>} />
              <Route path="/admin/affiliates/:id" element={<Page><AffiliateDetail /></Page>} />
              <Route path="/admin/ielts-v2-preview" element={<Page><IELTSPreview /></Page>} />
              <Route path="/admin/student-curriculum" element={<Page><AdminCurriculumPreview><CurriculumBrowser /></AdminCurriculumPreview></Page>} />
              <Route path="/admin/student-curriculum/level/:levelNumber" element={<Page><AdminCurriculumPreview><LevelUnits /></AdminCurriculumPreview></Page>} />
              <Route path="/admin/student-curriculum/unit/:unitId" element={<Page><AdminCurriculumPreview><UnitContent /></AdminCurriculumPreview></Page>} />
              <Route path="/admin/interactive-curriculum" element={<Page><InteractiveCurriculumLevels /></Page>} />
              <Route path="/admin/interactive-curriculum/:levelId" element={<Page><InteractiveCurriculumUnits /></Page>} />
              <Route path="/admin/interactive-curriculum/:levelId/:unitId" element={<Page><InteractiveCurriculumPage /></Page>} />
              <Route path="/admin/student/:studentId/progress" element={<Page><StudentProgressDetail /></Page>} />
              <Route path="/admin/design-showcase-masterclass" element={<Page><MasterclassDesignShowcase /></Page>} />
              <Route path="/admin/atelier-preview/student" element={<AtelierStudentPreview />} />
              <Route path="/admin/atelier-preview/trainer" element={<AtelierTrainerPreview />} />
              <Route path="/admin/atelier-preview/admin"   element={<AtelierAdminPreview />} />
            </Route>
          </Route>

          {/* Partner public routes — no auth required */}
          <Route path="/partner/login" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PartnerLogin /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/partner/set-password" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><PartnerSetPassword /></Suspense>
            </ErrorBoundary>
          } />

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
      </LanguageBootstrap>
    </ErrorBoundary>
  )

}
