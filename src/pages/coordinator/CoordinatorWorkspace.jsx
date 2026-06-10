import { NavLink, Outlet } from 'react-router-dom'
import { CalendarClock, Repeat } from 'lucide-react'

// Coordinator workspace shell — RTL tab bar shared by coordinator + admin.
// Tabs: week view (sessions) + fixed weekly templates.
const TABS = [
  { to: '/coordinator',           label: 'جدول الحصص',      icon: CalendarClock, end: true },
  { to: '/coordinator/schedules', label: 'المواعيد الثابتة', icon: Repeat },
]

export default function CoordinatorWorkspace() {
  return (
    <div dir="rtl" className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1"
          style={{ color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }}>
          تنسيق الحصص
        </h1>
        <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
          جدولة الحصص الفردية والجماعية بين الطلاب والمدربين — يظهر الموعد والرابط للطرفين فور الحفظ
        </p>
      </div>

      <nav className="flex items-center gap-1 mb-7 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--ds-border-subtle)' }}>
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors"
            style={({ isActive }) => ({
              color: isActive ? 'var(--ds-text-primary)' : 'var(--ds-text-tertiary)',
              borderBottom: `2px solid ${isActive ? 'var(--ds-accent-primary)' : 'transparent'}`,
              marginBottom: '-1px',
            })}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  )
}
