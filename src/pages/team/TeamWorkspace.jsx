import { NavLink, Outlet } from 'react-router-dom'
import { Users, Activity, CalendarClock } from 'lucide-react'

// CS staff workspace shell — RTL tab bar shared by agent + admin.
// Inner surfaces: pipeline (B3), follow-ups (B4), schedule (C2).
const TABS = [
  { to: '/team/pipeline',  label: 'العملاء المحتملون', icon: Users },
  { to: '/team/followups', label: 'متابعات اليوم',     icon: Activity },
  { to: '/team/schedule',  label: 'الجدولة',           icon: CalendarClock },
]

export default function TeamWorkspace() {
  return (
    <div dir="rtl" className="w-full">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }}
        >
          مساحة فريق العملاء
        </h1>
        <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
          إدارة العملاء المحتملين، المتابعات، والجدولة
        </p>
      </div>

      <nav
        className="flex items-center gap-1 mb-7 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--ds-border-subtle)' }}
      >
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors"
            style={({ isActive }) => ({
              color: isActive ? 'var(--ds-text-primary)' : 'var(--ds-text-tertiary)',
              borderBottom: `2px solid ${isActive ? 'var(--ds-accent-primary)' : 'transparent'}`,
              marginBottom: '-1px',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
