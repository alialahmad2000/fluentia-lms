import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { hasIELTSAccess } from '@/lib/packageAccess'
import IELTSLockedPanel from '@/pages/student/ielts/IELTSLockedPanel'

function IELTSGuardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ds-bg-base, var(--surface-base))',
      }}
    />
  )
}

export default function IELTSGuard() {
  const loading = useAuthStore((s) => s.loading)
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)

  // Auth not yet resolved — show blank skeleton to avoid flash of unauthorized content
  if (loading) return <IELTSGuardSkeleton />

  // Not authenticated → login
  if (!profile) return <Navigate to="/login" replace />

  // Trainer/admin accessing student IELTS paths → root (they have their own portals)
  if (profile.role !== 'student') return <Navigate to="/" replace />

  // Package/custom_access check — single source of truth
  if (!hasIELTSAccess(studentData)) return <IELTSLockedPanel />

  return <Outlet />
}
