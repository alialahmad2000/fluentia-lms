import { useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useStudentDashboard } from '../../hooks/useStudentDashboard'
import OriginalDashboard from './StudentDashboardOriginal'
import PremiumDashboard from './dashboards/PremiumDashboard'
import EditorialDashboard from './dashboards/EditorialDashboard'
import CinematicDashboard from './dashboards/CinematicDashboard'
import AtelierMinimalDashboard from './dashboards/AtelierMinimalDashboard'
import JourneyDashboard from './dashboards/JourneyDashboard'
import SpotlightDashboard from './dashboards/SpotlightDashboard'
import ObservatoryDashboard from './dashboards/ObservatoryDashboard'

// Thin switch. Production students (no ?design) see the default dashboard
// (currently the "Command Deck" PremiumDashboard) — full real data wiring
// through a premium presentation layer.
//
// CREATIVE-STRUCTURE PREVIEWS (each a different page *structure*, real data):
//   ?design=journey      → Journey Map  (the dashboard is a learning path)
//   ?design=spotlight    → Today Spotlight (one focus mission + collapsibles)
//   ?design=observatory  → Observatory  (centered level-ring command center)
// Once one is chosen, set it as the `default` below to ship it to everyone.
//
// Escape hatches for evaluation / rollback (all reachable, nothing lost):
//   ?design=original | classic  → the previous plain dashboard (1:1 rollback)
//   ?design=v1 | v2 | v3        → older feed-only explorations
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
    case 'journey':
      return <JourneyDashboard />
    case 'spotlight':
      return <SpotlightDashboard />
    case 'observatory':
      return <ObservatoryDashboard />
    default:
      return <PremiumDashboard />
  }
}
