import { useState, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  House, FileText, BarChart3, Mic, User, MessageSquare,
  Bot, Users, Briefcase, CreditCard, Settings, LayoutDashboard,
  LogOut, X, ChevronLeft, Zap, FolderOpen, CalendarDays, Wrench,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'

// ─── Role accent config ──────────────────────────────────────
const ROLE_ACCENTS = {
  student: {
    active: 'bg-sky-500/10 text-sky-400 border border-sky-500/15',
    icon: 'text-sky-400',
  },
  trainer: {
    active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
    icon: 'text-emerald-400',
  },
  admin: {
    active: 'bg-gold-500/10 text-gold-400 border border-gold-500/15',
    icon: 'text-gold-400',
  },
}

// ─── Flat Navigation Items (NO collapsible groups) ───────────
const NAV_ITEMS = {
  student: [
    { to: '/student', label: 'الرئيسية', icon: House },
    { to: '/student/weekly-tasks', label: 'مهامي', icon: CalendarDays },
    { to: '/student/speaking', label: 'معمل التحدث', icon: Mic },
    { to: '/student/grades', label: 'الدرجات', icon: BarChart3 },
    { to: '/student/chat', label: 'المحادثة', icon: MessageSquare },
    { to: '/student/ai-chat', label: 'المساعد الذكي', icon: Bot },
    { to: '/student/profile', label: 'حسابي', icon: User },
  ],
  trainer: [
    { to: '/trainer', label: 'الرئيسية', icon: House },
    { to: '/trainer/assignments', label: 'الواجبات والتقييم', icon: FileText },
    { to: '/trainer/weekly-grading', label: 'المهام الأسبوعية', icon: CalendarDays },
    { to: '/trainer/students', label: 'الطلاب', icon: Users },
    { to: '/trainer/points', label: 'الحصة المباشرة', icon: Zap },
    { to: '/trainer/ai-assistant', label: 'المساعد الذكي', icon: Bot },
    { to: '/trainer/schedule', label: 'الأدوات', icon: Wrench },
  ],
  admin: [
    { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
    { to: '/trainer/assignments', label: 'التدريس', icon: FileText },
    { to: '/admin/users', label: 'الطلاب', icon: Users },
    { to: '/admin/packages', label: 'المالية', icon: CreditCard },
    { to: '/admin/content', label: 'المحتوى', icon: FolderOpen },
    { to: '/admin/reports', label: 'التحليلات', icon: BarChart3 },
    { to: '/trainer/ai-assistant', label: 'المساعد الذكي', icon: Bot },
    { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
  ],
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const { profile, signOut } = useAuthStore()
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme)
  const navigate = useNavigate()
  const role = profile?.role || 'student'
  const items = NAV_ITEMS[role] || NAV_ITEMS.student
  const accent = ROLE_ACCENTS[role] || ROLE_ACCENTS.student

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
      {/* Logo area */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <img
              src={effectiveTheme === 'light' ? '/logo-full-light.png' : '/logo-full-dark.png'}
              alt="Fluentia"
              className="h-8 w-auto"
            />
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
        <button onClick={onClose} className="lg:hidden transition-colors" style={{ color: 'var(--color-text-muted)' }}>
          <X size={20} />
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden lg:block transition-colors" style={{ color: 'var(--color-text-muted)' }}
        >
          <ChevronLeft size={18} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Nav items — flat list, no groups */}
      <nav role="navigation" aria-label="القائمة الجانبية" className="flex-1 py-4 px-3 overflow-y-auto">
        <div className="space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === `/${role}` || item.to === '/admin' || item.to === '/trainer' || item.to === '/student'}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium transition-all duration-200 ${
                  isActive
                    ? accent.active
                    : 'text-muted hover:bg-[var(--color-bg-hover)]'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={`shrink-0 ${isActive ? '' : 'text-muted/70 group-hover:text-white/70'}`} />
                  {!collapsed && <span>{item.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-border-subtle pt-3">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-[14px] font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span>تسجيل الخروج</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{ background: 'var(--color-bg-sidebar)' }}
        className={`hidden lg:flex flex-col backdrop-blur-2xl border-l border-border-subtle transition-all duration-300 ease-apple fixed top-0 right-0 h-screen z-30 ${
          collapsed ? 'w-[72px]' : 'w-[250px]'
        }`}
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{ background: 'var(--color-bg-sidebar)' }}
              className="fixed top-0 right-0 h-screen w-64 backdrop-blur-2xl border-l border-border-subtle z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
