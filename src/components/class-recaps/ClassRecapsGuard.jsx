// ClassRecapsGuard — only a student with students.uses_class_notes === true (or
// staff previewing) may see /student/class-recaps. Everyone else goes to their home.
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function ClassRecapsGuard() {
  const loading = useAuthStore((s) => s.loading)
  const studentData = useAuthStore((s) => s.studentData)
  const profile = useAuthStore((s) => s.profile)

  if (loading) return null // ProtectedRoute already renders the boot skeleton
  const hasRecaps = studentData?.uses_class_notes === true
  const isStaff = profile?.role === 'admin' || profile?.role === 'trainer'
  if (!hasRecaps && !isStaff) return <Navigate to="/student" replace />
  return <Outlet />
}
