import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { House, CalendarDays, Mic, BarChart3, User, FileText, Users, Zap, Bot, CreditCard, Settings } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import AIFloatingHelper from '../ai/AIFloatingHelper'
import { useAuthStore } from '../../stores/authStore'

// Bottom tab bar items per role (mobile only — top 5 most used)
const MOBILE_TABS = {
  student: [
    { to: '/student', label: 'الرئيسية', icon: House },
    { to: '/student/weekly-tasks', label: 'مهامي', icon: CalendarDays },
    { to: '/student/speaking', label: 'التحدث', icon: Mic },
    { to: '/student/grades', label: 'الدرجات', icon: BarChart3 },
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { profile } = useAuthStore()
  const role = profile?.role || 'student'
  const tabs = MOBILE_TABS[role] || MOBILE_TABS.student
  const activeColor = TAB_ACTIVE_COLORS[role] || TAB_ACTIVE_COLORS.student

  return (
    <div className="min-h-screen bg-darkest" data-role={role}>
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
        className={`transition-all duration-300 ease-apple ${
          collapsed ? 'lg:mr-[72px]' : 'lg:mr-[250px]'
        }`}
      >
        <Header onMenuToggle={() => setMobileOpen(true)} />

        <main id="main-content" className="p-5 lg:p-10 pb-24 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* AI Floating Helper */}
      <AIFloatingHelper />

      {/* Mobile bottom tab bar */}
      <nav aria-label="التنقل الرئيسي" className="fixed bottom-0 left-0 right-0 z-40 lg:hidden backdrop-blur-2xl border-t border-border-subtle" style={{ background: 'var(--color-bg-sidebar)' }}>
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === `/${role}` || tab.to === '/admin' || tab.to === '/trainer' || tab.to === '/student'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 min-w-[56px] ${
                  isActive ? `${activeColor} bg-[var(--color-bg-hover)]` : 'text-muted'
                }`
              }
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
