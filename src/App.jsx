import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LoginPage from './pages/public/LoginPage'
import LayoutShell from './components/layout/LayoutShell'
import OnboardingModal from './components/onboarding/OnboardingModal'
import GamificationProvider from './components/gamification/GamificationProvider'

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

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents'))
const AdminGroups = lazy(() => import('./pages/admin/AdminGroups'))
const AdminTrainers = lazy(() => import('./pages/admin/AdminTrainers'))
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminChurnPrediction = lazy(() => import('./pages/admin/AdminChurnPrediction'))

const ForgotPassword = lazy(() => import('./pages/public/ForgotPassword'))
const ParentDashboard = lazy(() => import('./pages/public/ParentDashboard'))

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
    <BrowserRouter>
      <OnboardingModal />
      <GamificationProvider />

      <Routes>
        <Route path="/" element={<RoleRedirect />} />

        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={
          <Suspense fallback={<LoadingSkeleton />}><ForgotPassword /></Suspense>
        } />
        <Route path="/parent" element={
          <Suspense fallback={<LoadingSkeleton />}><ParentDashboard /></Suspense>
        } />

        {/* Student routes */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route element={<LayoutShell />}>
            <Route path="/student" element={<Suspense fallback={<PageSkeleton />}><StudentDashboard /></Suspense>} />
            <Route path="/student/assignments" element={<Suspense fallback={<PageSkeleton />}><StudentAssignments /></Suspense>} />
            <Route path="/student/schedule" element={<Suspense fallback={<PageSkeleton />}><StudentSchedule /></Suspense>} />
            <Route path="/student/grades" element={<Suspense fallback={<PageSkeleton />}><StudentGrades /></Suspense>} />
            <Route path="/student/speaking" element={<Suspense fallback={<PageSkeleton />}><StudentSpeaking /></Suspense>} />
            <Route path="/student/library" element={<Suspense fallback={<PageSkeleton />}><StudentLibrary /></Suspense>} />
            <Route path="/student/leaderboard" element={<Suspense fallback={<PageSkeleton />}><StudentLeaderboard /></Suspense>} />
            <Route path="/student/recognition" element={<Suspense fallback={<PageSkeleton />}><StudentPeerRecognition /></Suspense>} />
            <Route path="/student/activity" element={<Suspense fallback={<PageSkeleton />}><StudentActivityFeed /></Suspense>} />
            <Route path="/student/challenges" element={<Suspense fallback={<PageSkeleton />}><StudentChallenges /></Suspense>} />
            <Route path="/student/chat" element={<Suspense fallback={<PageSkeleton />}><StudentGroupChat /></Suspense>} />
            <Route path="/student/messages" element={<Suspense fallback={<PageSkeleton />}><StudentMessages /></Suspense>} />
            <Route path="/student/ai-chat" element={<Suspense fallback={<PageSkeleton />}><StudentChatbot /></Suspense>} />
            <Route path="/student/vocabulary" element={<Suspense fallback={<PageSkeleton />}><StudentVocabulary /></Suspense>} />
            <Route path="/student/billing" element={<Suspense fallback={<PageSkeleton />}><StudentBilling /></Suspense>} />
            <Route path="/student/exercises" element={<Suspense fallback={<PageSkeleton />}><StudentExercises /></Suspense>} />
            <Route path="/student/my-patterns" element={<Suspense fallback={<PageSkeleton />}><StudentErrorPatterns /></Suspense>} />
            <Route path="/student/voice-journal" element={<Suspense fallback={<PageSkeleton />}><StudentVoiceJournal /></Suspense>} />
            <Route path="/student/pronunciation" element={<Suspense fallback={<PageSkeleton />}><StudentPronunciation /></Suspense>} />
            <Route path="/student/conversation" element={<Suspense fallback={<PageSkeleton />}><StudentConversation /></Suspense>} />
            <Route path="/student/battles" element={<Suspense fallback={<PageSkeleton />}><StudentStreakBattles /></Suspense>} />
            <Route path="/student/success" element={<Suspense fallback={<PageSkeleton />}><StudentSuccessStories /></Suspense>} />
            <Route path="/student/profile" element={<Suspense fallback={<PageSkeleton />}><StudentProfile /></Suspense>} />
          </Route>
        </Route>

        {/* Trainer routes */}
        <Route element={<ProtectedRoute allowedRoles={['trainer', 'admin']} />}>
          <Route element={<LayoutShell />}>
            <Route path="/trainer" element={<Suspense fallback={<PageSkeleton />}><TrainerDashboard /></Suspense>} />
            <Route path="/trainer/assignments" element={<Suspense fallback={<PageSkeleton />}><TrainerAssignments /></Suspense>} />
            <Route path="/trainer/writing" element={<Suspense fallback={<PageSkeleton />}><TrainerGrading /></Suspense>} />
            <Route path="/trainer/schedule" element={<Suspense fallback={<PageSkeleton />}><TrainerSchedule /></Suspense>} />
            <Route path="/trainer/notes" element={<Suspense fallback={<PageSkeleton />}><TrainerNotes /></Suspense>} />
            <Route path="/trainer/library" element={<Suspense fallback={<PageSkeleton />}><TrainerLibrary /></Suspense>} />
            <Route path="/trainer/points" element={<Suspense fallback={<PageSkeleton />}><TrainerQuickPoints /></Suspense>} />
            <Route path="/trainer/attendance" element={<Suspense fallback={<PageSkeleton />}><TrainerAttendance /></Suspense>} />
            <Route path="/trainer/student-notes" element={<Suspense fallback={<PageSkeleton />}><TrainerQuickNotes /></Suspense>} />
            <Route path="/trainer/students" element={<Suspense fallback={<PageSkeleton />}><TrainerStudentView /></Suspense>} />
            <Route path="/trainer/challenges" element={<Suspense fallback={<PageSkeleton />}><TrainerChallenges /></Suspense>} />
            <Route path="/trainer/teams" element={<Suspense fallback={<PageSkeleton />}><TrainerTeams /></Suspense>} />
            <Route path="/trainer/chat" element={<Suspense fallback={<PageSkeleton />}><TrainerGroupChat /></Suspense>} />
            <Route path="/trainer/messages" element={<Suspense fallback={<PageSkeleton />}><StudentMessages /></Suspense>} />
            <Route path="/trainer/ai-assistant" element={<Suspense fallback={<PageSkeleton />}><TrainerAIAssistant /></Suspense>} />
            <Route path="/trainer/reports" element={<Suspense fallback={<PageSkeleton />}><TrainerProgressReports /></Suspense>} />
          </Route>
        </Route>

        {/* Admin routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<LayoutShell />}>
            <Route path="/admin" element={<Suspense fallback={<PageSkeleton />}><AdminDashboard /></Suspense>} />
            <Route path="/admin/users" element={<Suspense fallback={<PageSkeleton />}><AdminStudents /></Suspense>} />
            <Route path="/admin/groups" element={<Suspense fallback={<PageSkeleton />}><AdminGroups /></Suspense>} />
            <Route path="/admin/trainers" element={<Suspense fallback={<PageSkeleton />}><AdminTrainers /></Suspense>} />
            <Route path="/admin/packages" element={<Suspense fallback={<PageSkeleton />}><AdminPayments /></Suspense>} />
            <Route path="/admin/reports" element={<Suspense fallback={<PageSkeleton />}><AdminReports /></Suspense>} />
            <Route path="/admin/churn" element={<Suspense fallback={<PageSkeleton />}><AdminChurnPrediction /></Suspense>} />
            <Route path="/admin/settings" element={<Suspense fallback={<PageSkeleton />}><AdminSettings /></Suspense>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
