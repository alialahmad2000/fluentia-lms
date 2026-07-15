// TechTrackGuard — only a student with students.uses_tech_track === true (or staff
// previewing) may see /tech/*. Everyone else is bounced to their normal /student home.
// The Tech Track «مسار التقنية» lives ALONGSIDE the normal curriculum — /student stays
// fully reachable; this only fences the dedicated major-track surface.
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function TechTrackGuard() {
  const loading = useAuthStore((s) => s.loading)
  const studentData = useAuthStore((s) => s.studentData)
  const profile = useAuthStore((s) => s.profile)

  if (loading) return null // ProtectedRoute already renders the boot skeleton
  const hasTrack = studentData?.uses_tech_track === true
  const isStaff = profile?.role === 'admin' || profile?.role === 'trainer'
  if (!hasTrack && !isStaff) return <Navigate to="/student" replace />
  return <Outlet />
}
