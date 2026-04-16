import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileBar from './MobileBar'
import MobileDrawer from './MobileDrawer'
import ErrorBoundary from '../ErrorBoundary'
import PWAInstallGate from '../pwa/PWAInstallGate'
import UpdateBanner from '../UpdateBanner'
import A11yFloatingButton from '../Accessibility/A11yFloatingButton'
import XPFloater from '../ui/XPFloater'
import FloatingToolbar from '../trainer/FloatingToolbar'
import TimerBadge from '../trainer/TimerBadge'
import { useAuthStore } from '@/stores/authStore'
import { getNavForRole } from '@/config/navigation'
import useClassMode from '@/stores/classModeStore'
import usePullToRefresh from '@/hooks/usePullToRefresh'
import { usePageTracking } from '@/hooks/usePageTracking'
import { tracker } from '@/services/activityTracker'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const GeometricMesh = lazy(() => import('../backgrounds/GeometricMesh'))

export default function LayoutShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('fluentia-sidebar-collapsed') === '1' } catch { return false }
  })

  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const impersonation = useAuthStore((s) => s.impersonation)
  const isClassMode = useClassMode((s) => s.isClassMode)
  const showPostSummary = useClassMode((s) => s.showPostSummary)
  const classStartedAt = useClassMode((s) => s.classStartedAt)
  const currentUnitId = useClassMode((s) => s.currentUnitId)
  const pointsGiven = useClassMode((s) => s.pointsGiven)
  const dismissSummary = useClassMode((s) => s.dismissSummary)

  const role = profile?.role || 'student'
  const nav = getNavForRole(role)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  // Persist collapsed state
  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem('fluentia-sidebar-collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }, [])

  // Scroll to top + close drawers on navigation
  useEffect(() => {
    window.scrollTo(0, 0)
    setMobileOpen(false)
    setDrawerOpen(false)
  }, [location.pathname])

  // Page view tracking
  usePageTracking()

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await queryClient.refetchQueries({ type: 'active' })
  }, [queryClient])
  const { isRefreshing, pullProgress, pullDistance } = usePullToRefresh(handleRefresh)

  // Impersonation banner height CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--impersonation-banner-height', impersonation ? '44px' : '0px')
    return () => document.documentElement.style.setProperty('--impersonation-banner-height', '0px')
  }, [impersonation])

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  return (
    <div
      className="min-h-dvh"
      style={{ background: 'var(--ds-bg-base, var(--surface-base))', paddingTop: impersonation ? '44px' : undefined }}
      data-role={role}
      onClick={() => tracker.touch()}
      onKeyDown={() => tracker.touch()}
    >
      <UpdateBanner />

      {/* Background */}
      <Suspense fallback={null}>
        <GeometricMesh />
      </Suspense>

      {/* Pull-to-refresh (mobile) */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed top-[var(--sat)] left-0 right-0 z-[60] flex flex-col items-center justify-center lg:hidden"
          style={{
            height: Math.max(pullDistance, isRefreshing ? 50 : 0),
            transition: isRefreshing ? 'none' : 'height 0.1s',
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--ds-surface-1, var(--surface-raised))',
              border: '1px solid var(--ds-border-subtle, var(--border-subtle))',
              opacity: Math.min(pullProgress, 1),
              transform: isRefreshing ? undefined : `rotate(${pullProgress * 360}deg)`,
            }}
          >
            <Loader2 size={16} className={isRefreshing ? 'animate-spin' : ''} style={{ color: 'var(--ds-accent-primary, var(--accent-sky))' }} />
          </div>
          {pullDistance > 20 && !isRefreshing && (
            <span className="text-[10px] mt-1 font-['Tajawal']" style={{ color: 'var(--ds-text-tertiary, var(--text-muted))', opacity: Math.min(pullProgress, 1) }}>
              {pullProgress >= 1 ? 'أفلت للتحديث' : 'اسحب للتحديث'}
            </span>
          )}
        </div>
      )}

      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:z-[100] focus:bg-sky-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm"
      >
        انتقل إلى المحتوى الرئيسي
      </a>

      {/* Sidebar (desktop only) */}
      {!isClassMode && (
        <Sidebar nav={nav} collapsed={collapsed} onToggle={handleToggleCollapsed} />
      )}

      {/* Main content area */}
      <div
        className={`relative z-[1] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isClassMode ? '' : collapsed ? 'lg:mr-[76px]' : 'lg:mr-[264px]'
        }`}
      >
        {!isClassMode && (
          <Header
            nav={nav}
            showMenuButton
            onMenuClick={openDrawer}
          />
        )}
        <PWAInstallGate />

        <main id="main-content" className="px-4 py-6 lg:px-10 lg:py-8 lg:pb-10" style={{ maxWidth: 1200, margin: '0 auto' }}>
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
          {/* Bottom spacer for mobile nav */}
          <div className="lg:hidden" aria-hidden="true" style={{ height: 150, flexShrink: 0 }} />
        </main>
      </div>

      {/* Floating elements */}
      <XPFloater />
      <TimerBadge />
      <FloatingToolbar />

      {/* Post-Class Summary */}
      <AnimatePresence>
        {showPostSummary && (role === 'trainer' || role === 'admin') && (
          <PostClassSummaryWrapper
            unitId={currentUnitId}
            classStartedAt={classStartedAt}
            pointsGiven={pointsGiven}
            profileId={profile?.id}
            role={role}
            onClose={dismissSummary}
          />
        )}
      </AnimatePresence>

      <A11yFloatingButton />

      {/* Mobile bottom bar */}
      {!isClassMode && <MobileBar nav={nav} onMoreClick={openDrawer} role={role} />}

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onClose={closeDrawer} nav={nav} />
    </div>
  )
}

// Resolve groupId for PostClassSummary
function PostClassSummaryWrapper({ unitId, classStartedAt, pointsGiven, profileId, role, onClose }) {
  const PostClassSummary = lazy(() => import('../trainer/PostClassSummary'))
  const { data: groups } = useQuery({
    queryKey: ['post-summary-group', profileId, role],
    queryFn: async () => {
      let q = supabase.from('groups').select('id').eq('is_active', true).order('level').limit(1)
      if (role !== 'admin') q = q.eq('trainer_id', profileId)
      const { data } = await q
      return data || []
    },
    enabled: !!profileId,
  })
  const groupId = groups?.[0]?.id
  if (!groupId) return null
  return (
    <Suspense fallback={null}>
      <PostClassSummary groupId={groupId} unitId={unitId} classStartedAt={classStartedAt} pointsGiven={pointsGiven} onClose={onClose} />
    </Suspense>
  )
}
