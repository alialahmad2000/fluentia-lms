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

// "Today Spotlight" (التركيز) is THE student dashboard — the single, default,
// only student-facing experience (owner decision 2026-06-03). The on-screen
// design switcher was removed so students see one consistent dashboard and
// are never offered alternatives.
//
// The ?design= params below remain ONLY as silent dev/rollback escape hatches
// (no UI surfaces them; students never use them). Nothing is lost:
//   ?design=journey | observatory | deck | premium → the other explorations
//   ?design=original | classic | v1 | v2 | v3       → older dashboards
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
    case 'observatory':
      return <ObservatoryDashboard />
    case 'deck':
    case 'premium':
      return <PremiumDashboard />
    case 'spotlight':
    default:
      return <SpotlightDashboard />
  }
}
