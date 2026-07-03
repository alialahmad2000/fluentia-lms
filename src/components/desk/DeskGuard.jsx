// DeskGuard — only a Pro Desk student (students.uses_pro_desk === true), or staff
// previewing, may see /desk/*. Everyone else is bounced to their normal /student home.
// This is the fence that keeps the Desk invisible to سلطان and every other student while
// the flag is off. Their old surface is never removed — /student stays fully reachable.
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function DeskGuard() {
  const loading = useAuthStore((s) => s.loading)
  const studentData = useAuthStore((s) => s.studentData)
  const profile = useAuthStore((s) => s.profile)

  if (loading) return null // ProtectedRoute already renders the boot skeleton
  const isDeskStudent = studentData?.uses_pro_desk === true
  const isStaff = profile?.role === 'admin' || profile?.role === 'trainer'
  if (!isDeskStudent && !isStaff) return <Navigate to="/student" replace />
  return <Outlet />
}
