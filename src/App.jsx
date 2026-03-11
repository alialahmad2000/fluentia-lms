import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LoginPage from './pages/public/LoginPage'
import LayoutShell from './components/layout/LayoutShell'
import OnboardingModal from './components/onboarding/OnboardingModal'
import GamificationProvider from './components/gamification/GamificationProvider'
import StudentDashboard from './pages/student/StudentDashboard'
import StudentAssignments from './pages/student/StudentAssignments'
import StudentGrades from './pages/student/StudentGrades'
import StudentSchedule from './pages/student/StudentSchedule'
import StudentProfile from './pages/student/StudentProfile'
import StudentSpeaking from './pages/student/StudentSpeaking'
import StudentLibrary from './pages/student/StudentLibrary'
import StudentLeaderboard from './pages/student/StudentLeaderboard'
import StudentPeerRecognition from './pages/student/StudentPeerRecognition'
import StudentActivityFeed from './pages/student/StudentActivityFeed'
import StudentChallenges from './pages/student/StudentChallenges'
import TrainerDashboard from './pages/trainer/TrainerDashboard'
import TrainerAssignments from './pages/trainer/TrainerAssignments'
import TrainerGrading from './pages/trainer/TrainerGrading'
import TrainerSchedule from './pages/trainer/TrainerSchedule'
import TrainerNotes from './pages/trainer/TrainerNotes'
import TrainerLibrary from './pages/trainer/TrainerLibrary'
import TrainerQuickPoints from './pages/trainer/TrainerQuickPoints'
import TrainerAttendance from './pages/trainer/TrainerAttendance'
import TrainerQuickNotes from './pages/trainer/TrainerQuickNotes'
import TrainerStudentView from './pages/trainer/TrainerStudentView'
import TrainerChallenges from './pages/trainer/TrainerChallenges'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminStudents from './pages/admin/AdminStudents'
import AdminGroups from './pages/admin/AdminGroups'
import AdminTrainers from './pages/admin/AdminTrainers'
import AdminPayments from './pages/admin/AdminPayments'
import AdminReports from './pages/admin/AdminReports'
import AdminSettings from './pages/admin/AdminSettings'

// ─── Placeholder Page ────────────────────────────────────────
function PlaceholderPage({ title }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-muted">قريباً...</p>
      </div>
    </div>
  )
}

// ─── Loading Skeleton ────────────────────────────────────────
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
      {/* Onboarding modal for new students */}
      <OnboardingModal />
      {/* Achievement unlock + Level-up celebrations */}
      <GamificationProvider />

      <Routes>
        {/* Role-based redirect from root */}
        <Route path="/" element={<RoleRedirect />} />

        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/test" element={<PlaceholderPage title="اختبار تحديد المستوى" />} />

        {/* Student routes */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route element={<LayoutShell />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/assignments" element={<StudentAssignments />} />
            <Route path="/student/schedule" element={<StudentSchedule />} />
            <Route path="/student/grades" element={<StudentGrades />} />
            <Route path="/student/speaking" element={<StudentSpeaking />} />
            <Route path="/student/library" element={<StudentLibrary />} />
            <Route path="/student/leaderboard" element={<StudentLeaderboard />} />
            <Route path="/student/recognition" element={<StudentPeerRecognition />} />
            <Route path="/student/activity" element={<StudentActivityFeed />} />
            <Route path="/student/challenges" element={<StudentChallenges />} />
            <Route path="/student/profile" element={<StudentProfile />} />
          </Route>
        </Route>

        {/* Trainer routes */}
        <Route element={<ProtectedRoute allowedRoles={['trainer', 'admin']} />}>
          <Route element={<LayoutShell />}>
            <Route path="/trainer" element={<TrainerDashboard />} />
            <Route path="/trainer/assignments" element={<TrainerAssignments />} />
            <Route path="/trainer/writing" element={<TrainerGrading />} />
            <Route path="/trainer/schedule" element={<TrainerSchedule />} />
            <Route path="/trainer/notes" element={<TrainerNotes />} />
            <Route path="/trainer/library" element={<TrainerLibrary />} />
            <Route path="/trainer/points" element={<TrainerQuickPoints />} />
            <Route path="/trainer/attendance" element={<TrainerAttendance />} />
            <Route path="/trainer/student-notes" element={<TrainerQuickNotes />} />
            <Route path="/trainer/students" element={<TrainerStudentView />} />
            <Route path="/trainer/challenges" element={<TrainerChallenges />} />
          </Route>
        </Route>

        {/* Admin routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route element={<LayoutShell />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminStudents />} />
            <Route path="/admin/groups" element={<AdminGroups />} />
            <Route path="/admin/trainers" element={<AdminTrainers />} />
            <Route path="/admin/packages" element={<AdminPayments />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
