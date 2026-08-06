import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { hasSTEPAccess } from '@/lib/packageAccess'
import STEPLockedPanel from '@/pages/student/step/STEPLockedPanel'

// Structural copy of IELTSGuard. The loading skeleton is load-bearing: without it
// a student sees the locked panel for a frame while studentData is still null.
function STEPGuardSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ds-bg-base, var(--surface-base))',
      }}
    />
  )
}

export default function STEPGuard() {
  const loading = useAuthStore((s) => s.loading)
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)

  // Auth not yet resolved — blank skeleton, never a flash of the locked panel.
  if (loading) return <STEPGuardSkeleton />

  if (!profile) return <Navigate to="/login" replace />

  // Staff have their own portals.
  if (profile.role !== 'student') return <Navigate to="/" replace />

  if (!hasSTEPAccess(studentData)) return <STEPLockedPanel />

  return <Outlet />
}
