// FieldNotesGuard — only a student with students.uses_field_notes === true (or staff
// previewing) may see /student/field-notes. Everyone else goes back to their normal home.
// «دفتر الميدان» sits ALONGSIDE the curriculum — it fences nothing else.
// Mirrors PhraseBankGuard exactly; do not invent a parallel style here.
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function FieldNotesGuard() {
  const loading = useAuthStore((s) => s.loading)
  const studentData = useAuthStore((s) => s.studentData)
  const profile = useAuthStore((s) => s.profile)

  if (loading) return null // ProtectedRoute already renders the boot skeleton
  const hasNotes = studentData?.uses_field_notes === true
  const isStaff = profile?.role === 'admin' || profile?.role === 'trainer'
  if (!hasNotes && !isStaff) return <Navigate to="/student" replace />
  return <Outlet />
}
