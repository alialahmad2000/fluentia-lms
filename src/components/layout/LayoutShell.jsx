import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { House, CalendarDays, Video, User, FileText, Users, Zap, Bot, CreditCard, Settings, BarChart3 } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import AIFloatingHelper from '../ai/AIFloatingHelper'
import { useAuthStore } from '../../stores/authStore'

// Bottom tab bar items per role (mobile only — top 5 most used)
const MOBILE_TABS = {
  student: [
    { to: '/student', label: 'الرئيسية', icon: House },
    { to: '/student/weekly-tasks', label: 'المهام', icon: CalendarDays },
    { to: '/student/schedule', label: 'الجدول', icon: CalendarDays },
    { to: '/student/recordings', label: 'التسجيلات', icon: Video },
    { to: '/student/profile', label: 'حسابي', icon: User },
  ],
  trainer: [
    { to: '/trainer', label: 'الرئيسية', icon: House },
    { to: '/trainer/assignments', label: 'الواجبات', icon: FileText },
    { to: '/trainer/students', label: 'الطلاب', icon: Users },
    { to: '/trainer/points', label: 'الحصة', icon: Zap },
    { to: '/trainer/ai-assistant', label: 'الذكاء', icon: Bot },
  ],
  admin: [
    { to: '/admin', label: 'الرئيسية', icon: House },
    { to: '/admin/users', label: 'الطلاب', icon: Users },
    { to: '/admin/packages', label: 'المالية', icon: CreditCard },
    { to: '/admin/reports', label: 'التحليلات', icon: BarChart3 },
    { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
  ],
}

const TAB_ACTIVE_COLORS = {
  student: 'text-sky-400',
  trainer: 'text-emerald-400',
  admin: 'text-gold-400',
}

export default function LayoutShell() {
  console.log('[DEBUG] LayoutShell rendering...')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { profile } = useAuthStore()
  const role = profile?.role || 'student'
  const tabs = MOBILE_TABS[role] || MOBILE_TABS.student
  const activeColor = TAB_ACTIVE_COLORS[role] || TAB_ACTIVE_COLORS.student

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-base)' }} data-role={role}>
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

        <main id="main-content" className="px-4 py-6 lg:px-10 lg:py-8 pb-24 lg:pb-10" style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
        </div>
      </nav>
    </div>
  )
}
