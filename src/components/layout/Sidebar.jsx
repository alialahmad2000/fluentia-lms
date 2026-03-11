import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  House, FileText, Calendar, BarChart3, Mic, BookOpen, User, Trophy, Heart,
  Users, Briefcase, CreditCard, Settings, LayoutDashboard,
  LogOut, X, ChevronLeft, ClipboardCheck, StickyNote, Zap, UserCheck, MessageSquare,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const NAV_ITEMS = {
  student: [
    { to: '/student',             label: 'الرئيسية',       icon: House },
    { to: '/student/assignments', label: 'الواجبات',       icon: FileText },
    { to: '/student/schedule',    label: 'الجدول',         icon: Calendar },
    { to: '/student/grades',      label: 'الدرجات',        icon: BarChart3 },
    { to: '/student/speaking',    label: 'المحادثة',       icon: Mic },
    { to: '/student/library',     label: 'المكتبة',        icon: BookOpen },
    { to: '/student/leaderboard', label: 'المتصدرين',      icon: Trophy },
    { to: '/student/recognition', label: 'تقدير الزملاء',  icon: Heart },
    { to: '/student/profile',     label: 'الملف الشخصي',   icon: User },
  ],
  trainer: [
    { to: '/trainer',              label: 'الرئيسية',       icon: House },
    { to: '/trainer/assignments',  label: 'الواجبات',       icon: FileText },
    { to: '/trainer/writing',      label: 'التقييم',        icon: ClipboardCheck },
    { to: '/trainer/points',       label: 'النقاط السريعة', icon: Zap },
    { to: '/trainer/attendance',   label: 'الحضور',         icon: UserCheck },
    { to: '/trainer/student-notes',label: 'ملاحظات الطلاب', icon: MessageSquare },
    { to: '/trainer/students',     label: 'ملفات الطلاب',   icon: User },
    { to: '/trainer/schedule',     label: 'الجدول',         icon: Calendar },
    { to: '/trainer/notes',        label: 'ملاحظات الحصص',  icon: StickyNote },
    { to: '/trainer/library',      label: 'المكتبة',        icon: BookOpen },
  ],
  admin: [
    { to: '/admin',               label: 'لوحة التحكم',    icon: LayoutDashboard },
    { to: '/trainer/assignments', label: 'الواجبات',       icon: FileText, section: 'trainer' },
    { to: '/trainer/writing',     label: 'التقييم',        icon: ClipboardCheck, section: 'trainer' },
    { to: '/trainer/points',     label: 'النقاط السريعة', icon: Zap, section: 'trainer' },
    { to: '/trainer/attendance', label: 'الحضور',         icon: UserCheck, section: 'trainer' },
    { to: '/trainer/student-notes', label: 'ملاحظات الطلاب', icon: MessageSquare, section: 'trainer' },
    { to: '/trainer/students',   label: 'ملفات الطلاب',   icon: User, section: 'trainer' },
    { to: '/trainer/schedule',    label: 'الجدول',         icon: Calendar, section: 'trainer' },
    { to: '/trainer/notes',       label: 'ملاحظات الحصص',  icon: StickyNote, section: 'trainer' },
    { to: '/trainer/library',     label: 'المكتبة',        icon: BookOpen, section: 'trainer' },
    { to: '/admin/users',         label: 'المستخدمين',     icon: Users },
    { to: '/admin/groups',        label: 'المجموعات',      icon: Users },
    { to: '/admin/trainers',      label: 'المدربين',       icon: Briefcase },
    { to: '/admin/packages',      label: 'المدفوعات',      icon: CreditCard },
    { to: '/admin/reports',       label: 'التقارير',       icon: BarChart3 },
    { to: '/admin/settings',      label: 'الإعدادات',      icon: Settings },
  ],
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const role = profile?.role || 'student'
  const items = NAV_ITEMS[role] || NAV_ITEMS.student

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-border-subtle">
        {!collapsed && (
          <h1 className="text-xl font-playfair font-bold text-gradient">Fluentia</h1>
        )}
        {collapsed && (
          <span className="text-xl font-playfair font-bold text-gradient mx-auto">F</span>
        )}
        {/* Mobile close button */}
        <button onClick={onClose} className="lg:hidden text-muted hover:text-white transition-colors">
          <X size={20} />
        </button>
        {/* Desktop collapse button */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:block text-muted hover:text-white transition-colors"
        >
          <ChevronLeft size={18} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === `/${role}` || item.to === '/admin'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-muted hover:text-white hover:bg-white/5'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon size={20} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-border-subtle pt-4">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full ${collapsed ? 'justify-center' : ''}`}
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
        className={`hidden lg:flex flex-col bg-navy-950/80 backdrop-blur-xl border-l border-border-subtle transition-all duration-300 fixed top-0 right-0 h-screen z-30 ${
          collapsed ? 'w-[72px]' : 'w-64'
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
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-screen w-72 bg-navy-950 border-l border-border-subtle z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
