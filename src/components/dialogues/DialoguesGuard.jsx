// DialoguesGuard — only a student with students.uses_dialogues === true (or staff
// previewing) may see /student/dialogues. Everyone else goes back to their home.
// «محادثات جاهزة» sits ALONGSIDE the curriculum — it fences nothing else off.
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function DialoguesGuard() {
  const loading = useAuthStore((s) => s.loading)
  const studentData = useAuthStore((s) => s.studentData)
  const profile = useAuthStore((s) => s.profile)

  if (loading) return null // ProtectedRoute already renders the boot skeleton
  const hasDialogues = studentData?.uses_dialogues === true
  const isStaff = profile?.role === 'admin' || profile?.role === 'trainer'
  if (!hasDialogues && !isStaff) return <Navigate to="/student" replace />
  return <Outlet />
}
