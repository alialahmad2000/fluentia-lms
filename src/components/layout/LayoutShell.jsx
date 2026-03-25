import { useState, lazy, Suspense, useCallback } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  House, CalendarDays, Video, FileText, Users, Zap, Bot, CreditCard, Settings,
  BarChart3, User, MoreHorizontal, X, Mic, PenLine, MessageSquare, ClipboardCheck,
  UsersRound, GraduationCap, ListChecks, Loader2, Lock, Map,
} from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import AIFloatingHelper from '../ai/AIFloatingHelper'
import { useAuthStore } from '../../stores/authStore'
import { hasPackageAccess } from '../PackageGate'
import { PACKAGES } from '../../lib/constants'
import usePullToRefresh from '../../hooks/usePullToRefresh'
import useActivityTracker from '../../hooks/useActivityTracker'
import { useQueryClient } from '@tanstack/react-query'

const GeometricMesh = lazy(() => import('../backgrounds/GeometricMesh'))
const FloatingOrbs = lazy(() => import('../backgrounds/FloatingOrbs'))

// Bottom tab bar items per role (mobile only — top 4 + More)
const MOBILE_TABS = {
  student: [
    { to: '/student', label: 'الرئيسية', icon: House },
    { to: '/student/weekly-tasks', label: 'المهام', icon: FileText },
    { to: '/student/schedule', label: 'الجدول', icon: CalendarDays },
    { to: '/student/recordings', label: 'التسجيلات', icon: Video },
  ],
  trainer: [
    { to: '/trainer', label: 'الرئيسية', icon: House },
    { to: '/trainer/assignments', label: 'التدريس', icon: FileText },
    { to: '/trainer/students', label: 'الطلاب', icon: Users },
    { to: '/trainer/points', label: 'الحصة', icon: Zap },
  ],
  admin: [
    { to: '/admin', label: 'الرئيسية', icon: House },
    { to: '/admin/users', label: 'الطلاب', icon: Users },
    { to: '/admin/packages', label: 'المالية', icon: CreditCard },
    { to: '/admin/reports', label: 'التحليلات', icon: BarChart3 },
  ],
}

// Extra items for the "More" bottom sheet
// requiredPackage: minimum package needed (omit for all-access)
// comingSoon: true = feature not ready yet (blocks all packages)
const MORE_ITEMS = {
  student: [
    { to: '/student/study-plan', label: 'خطة الدراسة', icon: Map },
    { to: '/student/assignments', label: 'الواجبات', icon: FileText },
    { to: '/student/speaking-lab', label: 'معمل التحدث', icon: Mic, requiredPackage: 'tamayuz', comingSoon: true },
    { to: '/student/writing-lab', label: 'معمل الكتابة', icon: PenLine, requiredPackage: 'tamayuz', comingSoon: true },
    { to: '/student/assessments', label: 'الاختبارات', icon: ClipboardCheck, requiredPackage: 'talaqa', comingSoon: true },
    { to: '/student/grades', label: 'الدرجات', icon: BarChart3, requiredPackage: 'talaqa' },
    { to: '/student/conversation', label: 'المحادثة', icon: MessageSquare },
    { to: '/student/ai-chat', label: 'المساعد الذكي', icon: Bot, requiredPackage: 'talaqa' },
    { to: '/student/group-activity', label: 'نشاط المجموعة', icon: UsersRound, requiredPackage: 'talaqa' },
    { to: '/student/profile', label: 'حسابي', icon: User },
  ],
  trainer: [
    { to: '/trainer/schedule', label: 'الجدول', icon: CalendarDays },
    { to: '/trainer/recordings', label: 'التسجيلات', icon: Video },
    { to: '/trainer/quiz', label: 'الاختبارات', icon: ClipboardCheck },
    { to: '/trainer/weekly-grading', label: 'المهام الأسبوعية', icon: ListChecks },
    { to: '/trainer/conversation', label: 'المحادثة', icon: MessageSquare },
    { to: '/trainer/ai-assistant', label: 'المساعد الذكي', icon: Bot },
  ],
  admin: [
    { to: '/admin/groups', label: 'المجموعات', icon: Users },
    { to: '/admin/trainers', label: 'المدربين', icon: GraduationCap },
    { to: '/admin/weekly-tasks', label: 'المهام الأسبوعية', icon: ListChecks },
    { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
  ],
}

const TAB_ACTIVE_COLORS = {
  student: 'text-sky-400',
  trainer: 'text-emerald-400',
  admin: 'text-gold-400',
}

export default function LayoutShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const { profile, studentData } = useAuthStore()
  const role = profile?.role || 'student'
  const studentPackage = studentData?.package || 'asas'
  const tabs = MOBILE_TABS[role] || MOBILE_TABS.student
  const moreItems = MORE_ITEMS[role] || []
  const activeColor = TAB_ACTIVE_COLORS[role] || TAB_ACTIVE_COLORS.student
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Lightweight activity tracking (students only)
  useActivityTracker()

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Pull to refresh — invalidates all queries
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries()
  }, [queryClient])
  const { isRefreshing, pullProgress, pullDistance } = usePullToRefresh(handleRefresh)

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-base)' }} data-role={role}>
      {/* Background layers */}
      <Suspense fallback={null}>
        <GeometricMesh />
        <FloatingOrbs />
      </Suspense>

      {/* Pull-to-refresh indicator (mobile) */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center lg:hidden"
          style={{
            height: `${Math.max(pullDistance, isRefreshing ? 40 : 0)}px`,
            transition: isRefreshing ? 'none' : 'height 0.1s',
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)',
              opacity: Math.min(pullProgress, 1),
              transform: `rotate(${pullProgress * 360}deg)`,
            }}
          >
            <Loader2 size={16} className={isRefreshing ? 'animate-spin' : ''} style={{ color: 'var(--accent-sky)' }} />
          </div>
        </div>
      )}

      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:right-4 focus:z-[100] focus:bg-sky-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm">
        انتقل إلى المحتوى الرئيسي
      </a>
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main content area — offset by sidebar width */}
      <div
        className={`relative z-[1] transition-all duration-300 ease-apple ${
          collapsed ? 'lg:mr-[72px]' : 'lg:mr-[260px]'
        }`}
      >
        <Header onMenuToggle={() => setMobileOpen(true)} />

        <main id="main-content" className="px-4 py-6 lg:px-10 lg:py-8 pb-safe-bottom lg:pb-10" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      {/* AI Floating Helper */}
      <AIFloatingHelper />

      {/* Mobile bottom tab bar */}
      <nav aria-label="التنقل الرئيسي" className="mobile-tab-bar lg:hidden">
        <div className="flex items-center justify-around w-full max-w-lg mx-auto h-16">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === `/${role}` || tab.to === '/admin' || tab.to === '/trainer' || tab.to === '/student'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-200 min-w-[56px] min-h-[44px] justify-center ${
                  isActive ? `${activeColor} bg-[var(--surface-raised)]` : 'text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <tab.icon size={20} style={isActive ? { filter: `drop-shadow(0 0 4px currentColor)` } : undefined} />
                  <span>{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-200 min-w-[56px] min-h-[44px] justify-center ${
              moreOpen ? `${activeColor} bg-[var(--surface-raised)]` : 'text-muted'
            }`}
          >
            <MoreHorizontal size={20} />
            <span>المزيد</span>
          </button>
        </div>
      </nav>

      {/* More bottom sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] lg:hidden"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setMoreOpen(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-[71] rounded-t-2xl lg:hidden"
              style={{
                background: 'var(--surface-raised)',
                borderTop: '1px solid var(--border-subtle)',
                maxHeight: '70vh',
                overflowY: 'auto',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 80px)',
              }}
            >
              {/* Handle */}
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-default)' }} />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3">
                <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>المزيد</h3>
                <button onClick={() => setMoreOpen(false)} className="p-2 rounded-lg" style={{ color: 'var(--text-tertiary)' }}>
                  <X size={18} />
                </button>
              </div>
              {/* Items grid */}
              <div className="grid grid-cols-4 gap-1 px-4 pb-6">
                {moreItems.map((item) => {
                  const isComingSoon = item.comingSoon
                  const isLocked = !isComingSoon && item.requiredPackage && role === 'student' && !hasPackageAccess(studentPackage, item.requiredPackage)

                  return (
                    <button
                      key={item.to}
                      onClick={() => {
                        if (isComingSoon) {
                          showToast('نشتغل عليها! بتكون جاهزة قريب إن شاء الله')
                          return
                        }
                        if (isLocked) {
                          const pkgName = PACKAGES[item.requiredPackage]?.name_ar || item.requiredPackage
                          showToast(`هالميزة متاحة لـ${pkgName} وأعلى`)
                          return
                        }
                        setMoreOpen(false)
                        navigate(item.to)
                      }}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors min-h-[72px] justify-center relative"
                      style={{ color: isComingSoon || isLocked ? 'var(--text-tertiary)' : 'var(--text-secondary)', opacity: isComingSoon || isLocked ? 0.6 : 1 }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ background: 'var(--surface-overlay)' }}>
                        <item.icon size={18} strokeWidth={1.5} />
                        {isLocked && (
                          <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--accent-gold-glow)' }}>
                            <Lock size={9} style={{ color: 'var(--accent-gold)' }} />
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                      {isComingSoon && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-amber-glow)', color: 'var(--accent-amber)' }}>قريباً</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-medium text-center max-w-xs"
            style={{
              background: 'var(--surface-overlay)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
