import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  House, FileText, BarChart3, Mic, MessageSquare,
  Bot, Users, CreditCard, Settings, LayoutDashboard,
  LogOut, X, ChevronLeft, Zap, FolderOpen, CalendarDays, Wrench,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'

// ─── Role accent config ──────────────────────────────────────
const ROLE_ACCENTS = {
  student: {
    active: 'sidebar-link-active sidebar-link-active-sky',
    icon: 'text-sky-400',
    activeColor: 'var(--accent-sky)',
    userBadge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  },
  trainer: {
    active: 'sidebar-link-active sidebar-link-active-emerald',
    icon: 'text-emerald-400',
    activeColor: 'var(--accent-emerald)',
    userBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  admin: {
    active: 'sidebar-link-active sidebar-link-active-gold',
    icon: 'text-gold-400',
    activeColor: 'var(--accent-gold)',
    userBadge: 'bg-gold-500/10 text-gold-400 border-gold-500/20',
  },
}

const ROLE_LABELS = {
  student: 'طالب',
  trainer: 'مدرب',
  admin: 'مدير',
}

// ─── Navigation Items with section dividers ───────────
const NAV_ITEMS = {
  student: [
    { to: '/student', label: 'الرئيسية', icon: House },
    { to: '/student/weekly-tasks', label: 'مهامي', icon: CalendarDays },
    { to: '/student/speaking', label: 'معمل التحدث', icon: Mic },
    { to: '/student/grades', label: 'الدرجات', icon: BarChart3 },
    { type: 'divider', label: 'التواصل' },
    { to: '/student/chat', label: 'المحادثة', icon: MessageSquare },
    { to: '/student/ai-chat', label: 'المساعد الذكي', icon: Bot },
  ],
  trainer: [
    { to: '/trainer', label: 'الرئيسية', icon: House },
    { to: '/trainer/assignments', label: 'الواجبات والتقييم', icon: FileText },
    { to: '/trainer/weekly-grading', label: 'المهام الأسبوعية', icon: CalendarDays },
    { type: 'divider', label: 'إدارة' },
    { to: '/trainer/students', label: 'الطلاب', icon: Users },
    { to: '/trainer/points', label: 'الحصة المباشرة', icon: Zap },
    { to: '/trainer/ai-assistant', label: 'المساعد الذكي', icon: Bot },
    { to: '/trainer/schedule', label: 'الأدوات', icon: Wrench },
  ],
  admin: [
    { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
    { to: '/trainer/assignments', label: 'التدريس', icon: FileText },
    { type: 'divider', label: 'إدارة' },
    { to: '/admin/users', label: 'الطلاب', icon: Users },
    { to: '/admin/packages', label: 'المالية', icon: CreditCard },
    { to: '/admin/content', label: 'المحتوى', icon: FolderOpen },
    { type: 'divider', label: 'أدوات' },
    { to: '/admin/reports', label: 'التحليلات', icon: BarChart3 },
    { to: '/trainer/ai-assistant', label: 'المساعد الذكي', icon: Bot },
    { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
  ],
}

function SectionDivider({ label, collapsed }) {
  if (collapsed) return <div className="my-2 mx-3" style={{ height: '1px', background: 'var(--border-subtle)' }} />
  return (
    <div className="flex items-center gap-2 px-3 mt-5 mb-2">
      <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </span>
      <div className="flex-1" style={{ height: '0.5px', background: 'var(--border-subtle)' }} />
    </div>
  )
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const { profile, signOut } = useAuthStore()
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme)
  const navigate = useNavigate()
  const role = profile?.role || 'student'
  const items = NAV_ITEMS[role] || NAV_ITEMS.student
  const accent = ROLE_ACCENTS[role] || ROLE_ACCENTS.student
  const displayName = profile?.display_name || profile?.full_name || ''
  const firstName = displayName.split(' ')[0] || ''

  async function handleLogout() {
    try {
      await signOut()
    } catch (err) {
      console.error('[Sidebar] signOut error:', err)
    }
    navigate('/login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand area */}
      <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <img
              src={effectiveTheme === 'light' ? '/logo-icon-light.png' : '/logo-icon-dark.png'}
              alt="Fluentia"
              className="w-9 h-9 rounded-lg"
            />
            <span className="sidebar-brand-text">Fluentia</span>
          </div>
        ) : (
          <div className="mx-auto">
            <img
              src={effectiveTheme === 'light' ? '/logo-icon-light.png' : '/logo-icon-dark.png'}
              alt="Fluentia"
              className="w-9 h-9 rounded-lg"
            />
          </div>
        )}
        <button onClick={onClose} className="lg:hidden btn-icon w-9 h-9">
          <X size={20} />
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex btn-icon w-8 h-8"
        >
          <ChevronLeft size={16} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Nav items with section dividers */}
      <nav role="navigation" aria-label="القائمة الجانبية" className="flex-1 py-3 px-3 overflow-y-auto">
        <div className="space-y-0.5">
          {items.map((item, i) => {
            if (item.type === 'divider') {
              return <SectionDivider key={`div-${i}`} label={item.label} collapsed={collapsed} />
            }
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === `/${role}` || item.to === '/admin' || item.to === '/trainer' || item.to === '/student'}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 ${
                    isActive
                      ? accent.active
                      : 'hover:bg-[var(--sidebar-hover-bg)]'
                  } ${collapsed ? 'justify-center' : ''}`
                }
                style={({ isActive }) => isActive ? undefined : { color: 'var(--sidebar-text-default)' }}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={20}
                      strokeWidth={1.5}
                      className="shrink-0"
                      style={isActive
                        ? undefined
                        : { color: 'var(--sidebar-icon-default)', opacity: 0.7 }
                      }
                    />
                    {!collapsed && <span>{item.label}</span>}
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* User card + Logout */}
      <div style={{ borderTop: '1px solid var(--border-subtle)' }} className="px-3 py-3">
        {/* User card */}
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl" style={{ background: 'var(--glass-card)' }}>
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold border ${accent.userBadge}`}
            >
              {firstName?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {displayName || 'مستخدم'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                {ROLE_LABELS[role] || role}
              </p>
            </div>
          </div>
        )}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 w-full ${collapsed ? 'justify-center' : ''}`}
          style={{ color: 'var(--accent-rose)', opacity: 0.8 }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--danger-bg)' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={18} strokeWidth={1.5} className="shrink-0" />
          {!collapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col backdrop-blur-2xl transition-all duration-300 ease-apple fixed top-0 right-0 h-screen z-30 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
        style={{
          background: 'var(--sidebar-bg)',
          borderLeft: '1px solid var(--sidebar-border)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 lg:hidden"
              style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed top-0 right-0 h-screen w-[280px] backdrop-blur-2xl z-50 lg:hidden"
              style={{
                background: 'var(--sidebar-bg)',
                borderLeft: '1px solid var(--sidebar-border)',
              }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
