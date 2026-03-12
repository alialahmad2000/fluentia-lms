import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LoginPage from './pages/public/LoginPage'
import LayoutShell from './components/layout/LayoutShell'
import OnboardingModal from './components/onboarding/OnboardingModal'
import GamificationProvider from './components/gamification/GamificationProvider'
import ErrorBoundary, { PageErrorFallback } from './components/ErrorBoundary'

// ─── Lazy-loaded Pages ───────────────────────────────────────
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'))
const StudentAssignments = lazy(() => import('./pages/student/StudentAssignments'))
const StudentGrades = lazy(() => import('./pages/student/StudentGrades'))
const StudentSchedule = lazy(() => import('./pages/student/StudentSchedule'))
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'))
const StudentSpeaking = lazy(() => import('./pages/student/StudentSpeaking'))
const StudentLibrary = lazy(() => import('./pages/student/StudentLibrary'))
const StudentLeaderboard = lazy(() => import('./pages/student/StudentLeaderboard'))
const StudentPeerRecognition = lazy(() => import('./pages/student/StudentPeerRecognition'))
const StudentActivityFeed = lazy(() => import('./pages/student/StudentActivityFeed'))
const StudentChallenges = lazy(() => import('./pages/student/StudentChallenges'))
const StudentGroupChat = lazy(() => import('./pages/student/StudentGroupChat'))
const StudentMessages = lazy(() => import('./pages/student/StudentMessages'))
const StudentChatbot = lazy(() => import('./pages/student/StudentChatbot'))
const StudentVocabulary = lazy(() => import('./pages/student/StudentVocabulary'))
const StudentBilling = lazy(() => import('./pages/student/StudentBilling'))
const StudentExercises = lazy(() => import('./pages/student/StudentExercises'))
const StudentErrorPatterns = lazy(() => import('./pages/student/StudentErrorPatterns'))
const StudentVoiceJournal = lazy(() => import('./pages/student/StudentVoiceJournal'))
const StudentPronunciation = lazy(() => import('./pages/student/StudentPronunciation'))
const StudentConversation = lazy(() => import('./pages/student/StudentConversation'))
const StudentStreakBattles = lazy(() => import('./pages/student/StudentStreakBattles'))
const StudentSuccessStories = lazy(() => import('./pages/student/StudentSuccessStories'))
const StudentEvents = lazy(() => import('./pages/student/StudentEvents'))
const StudentAvatar = lazy(() => import('./pages/student/StudentAvatar'))

const TrainerDashboard = lazy(() => import('./pages/trainer/TrainerDashboard'))
const TrainerAssignments = lazy(() => import('./pages/trainer/TrainerAssignments'))
const TrainerGrading = lazy(() => import('./pages/trainer/TrainerGrading'))
const TrainerSchedule = lazy(() => import('./pages/trainer/TrainerSchedule'))
const TrainerNotes = lazy(() => import('./pages/trainer/TrainerNotes'))
const TrainerLibrary = lazy(() => import('./pages/trainer/TrainerLibrary'))
const TrainerQuickPoints = lazy(() => import('./pages/trainer/TrainerQuickPoints'))
const TrainerAttendance = lazy(() => import('./pages/trainer/TrainerAttendance'))
const TrainerQuickNotes = lazy(() => import('./pages/trainer/TrainerQuickNotes'))
const TrainerStudentView = lazy(() => import('./pages/trainer/TrainerStudentView'))
const TrainerChallenges = lazy(() => import('./pages/trainer/TrainerChallenges'))
const TrainerTeams = lazy(() => import('./pages/trainer/TrainerTeams'))
const TrainerGroupChat = lazy(() => import('./pages/trainer/TrainerGroupChat'))
const TrainerAIAssistant = lazy(() => import('./pages/trainer/TrainerAIAssistant'))
const TrainerProgressReports = lazy(() => import('./pages/trainer/TrainerProgressReports'))
const TrainerLessonPlanner = lazy(() => import('./pages/trainer/TrainerLessonPlanner'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents'))
const AdminGroups = lazy(() => import('./pages/admin/AdminGroups'))
const AdminTrainers = lazy(() => import('./pages/admin/AdminTrainers'))
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminChurnPrediction = lazy(() => import('./pages/admin/AdminChurnPrediction'))
const AdminSmartScheduling = lazy(() => import('./pages/admin/AdminSmartScheduling'))

const ForgotPassword = lazy(() => import('./pages/public/ForgotPassword'))
const ParentDashboard = lazy(() => import('./pages/public/ParentDashboard'))

// ─── Page wrapper: ErrorBoundary + Suspense ──────────────────
function Page({ children }) {
  return (
    <ErrorBoundary fallback={<PageErrorFallback />}>
      <Suspense fallback={<PageSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

// ─── Page Loading Skeleton ───────────────────────────────────
function PageSkeleton() {
  return (
    <div className="space-y-6 p-2">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-4 w-64" />
      <div className="grid grid-cols-3 gap-4">
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
    <div className="min-h-screen bg-darkest flex items-center justify-center p-8">
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
    initialize()
  }, [initialize])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <OnboardingModal />
        <GamificationProvider />

        <Routes>
          <Route path="/" element={<RoleRedirect />} />

          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><ForgotPassword /></Suspense>
            </ErrorBoundary>
          } />
          <Route path="/parent" element={
            <ErrorBoundary fallback={<PageErrorFallback />}>
              <Suspense fallback={<LoadingSkeleton />}><ParentDashboard /></Suspense>
            </ErrorBoundary>
          } />

          {/* Student routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<LayoutShell />}>
              <Route path="/student" element={<Page><StudentDashboard /></Page>} />
              <Route path="/student/assignments" element={<Page><StudentAssignments /></Page>} />
              <Route path="/student/schedule" element={<Page><StudentSchedule /></Page>} />
              <Route path="/student/grades" element={<Page><StudentGrades /></Page>} />
              <Route path="/student/speaking" element={<Page><StudentSpeaking /></Page>} />
              <Route path="/student/library" element={<Page><StudentLibrary /></Page>} />
              <Route path="/student/leaderboard" element={<Page><StudentLeaderboard /></Page>} />
              <Route path="/student/recognition" element={<Page><StudentPeerRecognition /></Page>} />
              <Route path="/student/activity" element={<Page><StudentActivityFeed /></Page>} />
              <Route path="/student/challenges" element={<Page><StudentChallenges /></Page>} />
              <Route path="/student/chat" element={<Page><StudentGroupChat /></Page>} />
              <Route path="/student/messages" element={<Page><StudentMessages /></Page>} />
              <Route path="/student/ai-chat" element={<Page><StudentChatbot /></Page>} />
              <Route path="/student/vocabulary" element={<Page><StudentVocabulary /></Page>} />
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
              <Route path="/student/profile" element={<Page><StudentProfile /></Page>} />
            </Route>
          </Route>

          {/* Trainer routes */}
          <Route element={<ProtectedRoute allowedRoles={['trainer', 'admin']} />}>
            <Route element={<LayoutShell />}>
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
            </Route>
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<LayoutShell />}>
              <Route path="/admin" element={<Page><AdminDashboard /></Page>} />
              <Route path="/admin/users" element={<Page><AdminStudents /></Page>} />
              <Route path="/admin/groups" element={<Page><AdminGroups /></Page>} />
              <Route path="/admin/trainers" element={<Page><AdminTrainers /></Page>} />
              <Route path="/admin/packages" element={<Page><AdminPayments /></Page>} />
              <Route path="/admin/reports" element={<Page><AdminReports /></Page>} />
              <Route path="/admin/churn" element={<Page><AdminChurnPrediction /></Page>} />
              <Route path="/admin/scheduling" element={<Page><AdminSmartScheduling /></Page>} />
              <Route path="/admin/settings" element={<Page><AdminSettings /></Page>} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
