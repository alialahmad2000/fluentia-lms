import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { isIELTSV2Enabled } from '@/lib/ieltsV2Flag'

export default function IELTSV2Gate() {
  const profile = useAuthStore((s) => s.profile)
  const loading = useAuthStore((s) => s.loading)
  const location = useLocation()

  if (loading || profile === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ color: 'var(--ds-text-muted)', fontSize: 14 }}>جاري التحميل…</div>
      </div>
    )
  }

  if (!isIELTSV2Enabled(profile)) {
    return <Navigate to="/student/ielts" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
