import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import ErrorBoundary from '@/components/ErrorBoundary'
import UpdateBanner from '@/components/UpdateBanner'
import A11yFloatingButton from '@/components/Accessibility/A11yFloatingButton'
import TeacherSidebar from '@/components/teacher/shell/TeacherSidebar'
import TeacherHeader from '@/components/teacher/shell/TeacherHeader'
import TeacherMobileBar from '@/components/teacher/shell/TeacherMobileBar'
import { usePageTracking } from '@/hooks/usePageTracking'
import { tracker } from '@/services/activityTracker'
import './teacher.css'

/**
 * TeacherLayout — the ground-up teacher app shell. Replaces the legacy
 * TrainerLayout (cockpit/floating-toolbar/XP). Self-contained premium dark
 * RTL chrome under the same /trainer/* URLs.
 */
export default function TeacherLayout() {
  const profile = useAuthStore((s) => s.profile)
  const impersonation = useAuthStore((s) => s.impersonation)
  const location = useLocation()

  usePageTracking()

  useEffect(() => {
    document.body.classList.add('teacher-role')
    return () => document.body.classList.remove('teacher-role')
  }, [])

  // Offset the shell below the admin impersonation banner (44px) so it never
  // covers the teacher header/sidebar while previewing as a trainer.
  useEffect(() => {
    document.documentElement.style.setProperty('--impersonation-banner-height', impersonation ? '44px' : '0px')
    return () => document.documentElement.style.setProperty('--impersonation-banner-height', '0px')
  }, [impersonation])

  useEffect(() => {
    const content = document.querySelector('.tea-content')
    if (content) content.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div
      className="teacher-app"
      data-role={profile?.role || 'trainer'}
      onClick={() => tracker.touch()}
      onKeyDown={() => tracker.touch()}
    >
      <UpdateBanner />
      <div className="tea-frame">
        <TeacherSidebar />
        <div className="tea-main">
          <TeacherHeader />
          <main id="main-content" className="tea-content">
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <TeacherMobileBar />
      <A11yFloatingButton />
    </div>
  )
}
