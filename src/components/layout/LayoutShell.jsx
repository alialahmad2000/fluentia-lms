import { useState, lazy, Suspense, useCallback } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  House, CalendarDays, Video, FileText, Users, Zap, Bot, CreditCard, Settings,
  BarChart3, User, MoreHorizontal, X, Mic, PenLine, MessageSquare, ClipboardCheck,
  UsersRound, GraduationCap, ListChecks, Loader2,
} from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import AIFloatingHelper from '../ai/AIFloatingHelper'
import { useAuthStore } from '../../stores/authStore'
import usePullToRefresh from '../../hooks/usePullToRefresh'
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
const MORE_ITEMS = {
  student: [
    { to: '/student/assignments', label: 'الواجبات', icon: FileText },
    { to: '/student/speaking-lab', label: 'معمل التحدث', icon: Mic },
    { to: '/student/writing-lab', label: 'معمل الكتابة', icon: PenLine },
    { to: '/student/assessments', label: 'الاختبارات', icon: ClipboardCheck },
    { to: '/student/grades', label: 'الدرجات', icon: BarChart3 },
    { to: '/student/conversation', label: 'المحادثة', icon: MessageSquare },
    { to: '/student/ai-chat', label: 'المساعد الذكي', icon: Bot },
    { to: '/student/group-activity', label: 'نشاط المجموعة', icon: UsersRound },
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
  const { profile } = useAuthStore()
  const role = profile?.role || 'student'
  const tabs = MOBILE_TABS[role] || MOBILE_TABS.student
  const moreItems = MORE_ITEMS[role] || []
  const activeColor = TAB_ACTIVE_COLORS[role] || TAB_ACTIVE_COLORS.student
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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
                {moreItems.map((item) => (
                  <button
                    key={item.to}
                    onClick={() => { setMoreOpen(false); navigate(item.to) }}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-colors min-h-[72px] justify-center"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-overlay)' }}>
                      <item.icon size={18} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
