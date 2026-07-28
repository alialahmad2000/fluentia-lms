// PhraseBankGuard — only a student with students.uses_phrase_bank === true (or staff
// previewing) may see /student/phrases. Everyone else goes back to their normal home.
// The phrase bank sits ALONGSIDE the curriculum — it fences nothing else.
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function PhraseBankGuard() {
  const loading = useAuthStore((s) => s.loading)
  const studentData = useAuthStore((s) => s.studentData)
  const profile = useAuthStore((s) => s.profile)

  if (loading) return null // ProtectedRoute already renders the boot skeleton
  const hasBank = studentData?.uses_phrase_bank === true
  const isStaff = profile?.role === 'admin' || profile?.role === 'trainer'
  if (!hasBank && !isStaff) return <Navigate to="/student" replace />
  return <Outlet />
}
