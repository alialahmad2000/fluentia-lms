import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import ErrorBoundary from '@/components/ErrorBoundary'
import UpdateBanner from '@/components/UpdateBanner'
import XPFloater from '@/components/ui/XPFloater'
import TimerBadge from '@/components/trainer/TimerBadge'
import FloatingToolbar from '@/components/trainer/FloatingToolbar'
import A11yFloatingButton from '@/components/Accessibility/A11yFloatingButton'
import TrainerSidebar from '@/components/layout/TrainerSidebar'
import TrainerHeader from '@/components/layout/TrainerHeader'
import TrainerMobileBar from '@/components/layout/TrainerMobileBar'
import { applyTrainerTheme } from '@/design-system/applyTheme'
import { usePageTracking } from '@/hooks/usePageTracking'
import { tracker } from '@/services/activityTracker'
import './TrainerLayout.css'

export default function TrainerLayout() {
  const profile = useAuthStore((s) => s.profile)
  const location = useLocation()

  usePageTracking()

  useEffect(() => {
    document.body.classList.add('trainer-role')
    applyTrainerTheme(profile?.theme_preference)
    return () => {
      document.body.classList.remove(
        'trainer-role',
        'theme-linear',
        'theme-gold-command',
        'theme-deep-teal',
        'theme-daylight-study',
        'theme-mission-black'
      )
    }
  }, [profile?.theme_preference])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div
      className="trainer-layout"
      data-role={profile?.role || 'trainer'}
      onClick={() => tracker.touch()}
      onKeyDown={() => tracker.touch()}
    >
      <UpdateBanner />

      <div className="trainer-layout__frame">
        <TrainerSidebar />
        <div className="trainer-layout__main">
          <TrainerHeader />
          <main id="main-content" className="trainer-layout__content">
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>

      <TrainerMobileBar />
      <XPFloater />
      <TimerBadge />
      <FloatingToolbar />
      <A11yFloatingButton />
    </div>
  )
}
