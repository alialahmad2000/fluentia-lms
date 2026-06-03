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
import DashboardDesignSwitcher from './dashboards/DashboardDesignSwitcher'

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
  const impersonation = useAuthStore((s) => s.impersonation)
  const realProfile = useAuthStore((s) => s._realProfile)
  const [searchParams] = useSearchParams()
  const variant = searchParams.get('design')
  const dashboard = useStudentDashboard(profile?.id)

  // Owner/staff-only design switcher — shown when impersonating, when the
  // real account is staff, or on the test account. NEVER for real students.
  const realRole = impersonation ? realProfile?.role : profile?.role
  const showSwitcher =
    realRole === 'admin' || realRole === 'trainer' || profile?.is_test_account === true

  // ── all hooks above any conditional return ──
  let variantEl
  switch (variant) {
    case 'original':
    case 'classic':
      variantEl = <OriginalDashboard />
      break
    case 'v1':
      variantEl = <EditorialDashboard {...dashboard} profile={profile} />
      break
    case 'v2':
      variantEl = <CinematicDashboard {...dashboard} profile={profile} />
      break
    case 'v3':
      variantEl = <AtelierMinimalDashboard {...dashboard} profile={profile} />
      break
    case 'journey':
      variantEl = <JourneyDashboard />
      break
    case 'spotlight':
      variantEl = <SpotlightDashboard />
      break
    case 'observatory':
      variantEl = <ObservatoryDashboard />
      break
    default:
      variantEl = <PremiumDashboard />
  }

  return (
    <>
      {variantEl}
      {showSwitcher && <DashboardDesignSwitcher />}
    </>
  )
}
