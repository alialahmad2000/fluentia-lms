import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { House, FileText, BarChart3, MessageSquare, User } from 'lucide-react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuthStore } from '../../stores/authStore'

// Bottom tab bar items per role (mobile only — top 5 most used)
const MOBILE_TABS = {
  student: [
    { to: '/student', label: 'الرئيسية', icon: House },
    { to: '/student/assignments', label: 'الواجبات', icon: FileText },
    { to: '/student/grades', label: 'الدرجات', icon: BarChart3 },
    { to: '/student/chat', label: 'المحادثة', icon: MessageSquare },
    { to: '/student/profile', label: 'حسابي', icon: User },
  ],
  trainer: [
    { to: '/trainer', label: 'الرئيسية', icon: House },
    { to: '/trainer/assignments', label: 'الواجبات', icon: FileText },
    { to: '/trainer/students', label: 'الطلاب', icon: User },
    { to: '/trainer/chat', label: 'المحادثة', icon: MessageSquare },
    { to: '/trainer/attendance', label: 'الحضور', icon: BarChart3 },
  ],
  admin: [
    { to: '/admin', label: 'الرئيسية', icon: House },
    { to: '/admin/users', label: 'الطلاب', icon: User },
    { to: '/admin/groups', label: 'المجموعات', icon: MessageSquare },
    { to: '/admin/packages', label: 'المالية', icon: BarChart3 },
    { to: '/admin/settings', label: 'الإعدادات', icon: FileText },
  ],
}

export default function LayoutShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { profile } = useAuthStore()
  const role = profile?.role || 'student'
  const tabs = MOBILE_TABS[role] || MOBILE_TABS.student

  return (
    <div className="min-h-screen bg-darkest">
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main content area — offset by sidebar width */}
      <div
        className={`transition-all duration-300 ${
          collapsed ? 'lg:mr-[72px]' : 'lg:mr-64'
        }`}
      >
        <Header onMenuToggle={() => setMobileOpen(true)} />

        <main className="p-4 lg:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-navy-950/95 backdrop-blur-xl border-t border-border-subtle">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === `/${role}` || tab.to === '/admin' || tab.to === '/trainer' || tab.to === '/student'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-sky-400' : 'text-muted'
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
