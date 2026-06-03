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

// Thin switch. Production students (no ?design) see the DEFAULT dashboard,
// now the "Today Spotlight" (التركيز) — chosen by the owner 2026-06-03.
//
// STRUCTURE VARIANTS (each a different page *structure*, all on real data):
//   (no param) / ?design=spotlight → Today Spotlight  (DEFAULT — focus-first)
//   ?design=journey               → Journey Map  (the dashboard is a path)
//   ?design=observatory           → Observatory  (centered command center)
//   ?design=deck | premium        → the previous "Command Deck" bento
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
    case 'observatory':
      variantEl = <ObservatoryDashboard />
      break
    case 'deck':
    case 'premium':
      variantEl = <PremiumDashboard />
      break
    case 'spotlight':
    default:
      variantEl = <SpotlightDashboard />
  }

  return (
    <>
      {variantEl}
      {showSwitcher && <DashboardDesignSwitcher />}
    </>
  )
}
