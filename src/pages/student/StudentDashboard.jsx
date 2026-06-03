import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useStudentDashboard } from '../../hooks/useStudentDashboard'
import OriginalDashboard from './StudentDashboardOriginal'
import PremiumDashboard from './dashboards/PremiumDashboard'
import EditorialDashboard from './dashboards/EditorialDashboard'
import CinematicDashboard from './dashboards/CinematicDashboard'
import AtelierMinimalDashboard from './dashboards/AtelierMinimalDashboard'

// Thin switch. Production students (no ?design) see the PREMIUM dashboard —
// the original feature set with full real data wiring, rendered through a
// refined Apple-grade presentation layer (PremiumDashboard owns its own
// production queries, exactly like the legacy dashboard did).
//
// Escape hatches for evaluation / rollback (all reachable, nothing lost):
//   ?design=original | classic  → the previous plain dashboard (1:1 rollback)
//   ?design=v1                   → Editorial   (exploration, feed-only)
//   ?design=v2                   → Cinematic    (exploration, feed-only)
//   ?design=v3                   → AtelierMinimal (exploration, feed-only)
// The v1/v2/v3 variants consume the single useStudentDashboard feed.
export default function StudentDashboard() {
  const profile = useAuthStore((s) => s.profile)
  const [searchParams] = useSearchParams()
  const variant = searchParams.get('design')
  const dashboard = useStudentDashboard(profile?.id)

  // ── all hooks above any conditional return ──
  switch (variant) {
    case 'original':
    case 'classic':
      return <OriginalDashboard />
    case 'v1':
      return <EditorialDashboard {...dashboard} profile={profile} />
    case 'v2':
      return <CinematicDashboard {...dashboard} profile={profile} />
    case 'v3':
      return <AtelierMinimalDashboard {...dashboard} profile={profile} />
    default:
      return <PremiumDashboard />
  }
}
