import { useEffect, Suspense, useCallback } from 'react'
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
import { ToastProvider } from './components/Toast'

import ComingSoon from './pages/student/ComingSoon'
import LockedFeature from './pages/student/LockedFeature'
import { hasPackageAccess } from './components/PackageGate'

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
const StudentCurriculum = lazyRetry(() => import('./pages/student/StudentCurriculum'))
const VocabularyFlashcards = lazyRetry(() => import('./pages/student/vocabulary/VocabularyFlashcards'))
const CurriculumBrowser = lazyRetry(() => import('./pages/student/curriculum/CurriculumBrowser'))
const StylePreview = lazyRetry(() => import('./pages/student/curriculum/StylePreview'))
const LevelUnits = lazyRetry(() => import('./pages/student/curriculum/LevelUnits'))
const UnitContent = lazyRetry(() => import('./pages/student/curriculum/UnitContent'))

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
const AdminTestBank = lazyRetry(() => import('./pages/admin/AdminTestBank'))
const AdminAIDashboard = lazyRetry(() => import('./pages/admin/AdminAIDashboard'))
const AdminContentBank = lazyRetry(() => import('./pages/admin/AdminContentBank'))
const AdminDailyReports = lazyRetry(() => import('./pages/admin/AdminDailyReports'))
const AdminAnalytics = lazyRetry(() => import('./pages/admin/AdminAnalytics'))

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

// ─── Full-screen Loading Skeleton ────────────────────────────
function LoadingSkeleton() {
  return (
    <div role="status" aria-busy="true" className="min-h-screen bg-darkest flex items-center justify-center p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="skeleton h-10 w-48 mx-auto" />
        <div className="skeleton h-4 w-64 mx-auto" />
        <div className="space-y-4 mt-10">
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-12 w-3/4" />
        </div>
      </div>
    </div>
  )
}

// ─── Protected Route ─────────────────────────────────────────
function ProtectedRoute({ allowedRoles }) {
  const { user, profile, loading } = useAuthStore()

  if (loading) return <LoadingSkeleton />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
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
    default:
      return <Navigate to="/login" replace />
  }
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    sessionStorage.removeItem('chunk_reload')
    initialize()
  }, [initialize])

  // Check session validity when user returns to the tab (e.g. after phone lock / background)
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        // Only redirect if user was previously logged in (not on login page)
        if ((!session || error) && window.location.pathname !== '/login' && window.location.pathname !== '/forgot-password' && window.location.pathname !== '/reset-password') {
          window.location.href = '/login'
        }
      })
    }
  }, [])

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [handleVisibilityChange])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
        <OfflineBanner />
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
              <Route path="/student/chat" element={<Page><StudentGroupChat /></Page>} />
              <Route path="/student/messages" element={<Page><StudentMessages /></Page>} />
              <Route path="/student/ai-chat" element={<Page><PackageRoute requiredPackage="talaqa" featureName="المساعد الذكي"><StudentChatbot /></PackageRoute></Page>} />
              <Route path="/student/vocabulary" element={<Page><StudentVocabulary /></Page>} />
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
              <Route path="/student/curriculum" element={<Page><CurriculumBrowser /></Page>} />
              <Route path="/student/curriculum/level/:levelNumber" element={<Page><LevelUnits /></Page>} />
              <Route path="/student/curriculum/unit/:unitId" element={<Page><UnitContent /></Page>} />
              <Route path="/student/curriculum-old" element={<Page><StudentCurriculum /></Page>} />
              <Route path="/student/style-preview" element={<Page><StylePreview /></Page>} />
            </Route>
          </Route>

          {/* Trainer routes */}
          <Route element={<ProtectedRoute allowedRoles={['trainer', 'admin']} />}>
            <Route element={<ErrorBoundary><LayoutShell /></ErrorBoundary>}>
              <Route path="/trainer" element={<Page><TrainerDashboard /></Page>} />
              <Route path="/trainer/assignments" element={<Page><TrainerAssignments /></Page>} />
              <Route path="/trainer/writing" element={<Page><TrainerGrading /></Page>} />
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
              <Route path="/trainer/student/:studentId/progress" element={<Page><StudentProgressDetail /></Page>} />
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
              <Route path="/admin/test-bank" element={<Page><AdminTestBank /></Page>} />
              <Route path="/admin/ai-dashboard" element={<Page><AdminAIDashboard /></Page>} />
              <Route path="/admin/content-bank" element={<Page><AdminContentBank /></Page>} />
              <Route path="/admin/daily-reports" element={<Page><AdminDailyReports /></Page>} />
              <Route path="/admin/analytics" element={<Page><AdminAnalytics /></Page>} />
              <Route path="/admin/student/:studentId/progress" element={<Page><StudentProgressDetail /></Page>} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )

}
