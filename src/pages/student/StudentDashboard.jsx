import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useStudentDashboard } from '../../hooks/useStudentDashboard'
import OriginalDashboard from './StudentDashboardOriginal'
import EditorialDashboard from './dashboards/EditorialDashboard'
import CinematicDashboard from './dashboards/CinematicDashboard'
import AtelierMinimalDashboard from './dashboards/AtelierMinimalDashboard'

// Dashboard 100× — thin switch. Production students (no ?design) see the ORIGINAL
// dashboard unchanged. ?design=v1|v2|v3 mounts a premium variant for evaluation.
// All variants consume the single useStudentDashboard feed (no per-variant fetch).
export default function StudentDashboard() {
  const profile = useAuthStore((s) => s.profile)
  const [searchParams] = useSearchParams()
  const variant = searchParams.get('design')
  const dashboard = useStudentDashboard(profile?.id)

  // ── all hooks above any conditional return ──
  switch (variant) {
    case 'v1':
      return <EditorialDashboard {...dashboard} profile={profile} />
    case 'v2':
      return <CinematicDashboard {...dashboard} profile={profile} />
    case 'v3':
      return <AtelierMinimalDashboard {...dashboard} profile={profile} />
    default:
      return <OriginalDashboard />
  }
}
