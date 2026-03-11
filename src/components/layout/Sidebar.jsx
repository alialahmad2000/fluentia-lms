import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  House, FileText, Calendar, BarChart3, Mic, BookOpen, User, Trophy, Heart, Activity, Target, Mail,
  Users, Briefcase, CreditCard, Settings, LayoutDashboard,
  LogOut, X, ChevronLeft, ChevronDown, ClipboardCheck, StickyNote, Zap, UserCheck, MessageSquare,
  Bot, Brain, FileBarChart,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

// ─── Grouped Navigation Items ────────────────────────────────
const NAV_GROUPS = {
  student: [
    {
      key: 'main',
      label: 'الرئيسية',
      items: [
        { to: '/student', label: 'الرئيسية', icon: House },
      ],
    },
    {
      key: 'learning',
      label: 'التعلم',
      items: [
        { to: '/student/assignments', label: 'الواجبات', icon: FileText },
        { to: '/student/schedule', label: 'الجدول', icon: Calendar },
        { to: '/student/speaking', label: 'المحادثة', icon: Mic },
        { to: '/student/library', label: 'المكتبة', icon: BookOpen },
      ],
    },
    {
      key: 'progress',
      label: 'التقدم',
      items: [
        { to: '/student/grades', label: 'الدرجات', icon: BarChart3 },
        { to: '/student/profile', label: 'الملف الشخصي', icon: User },
        { to: '/student/leaderboard', label: 'المتصدرين', icon: Trophy },
      ],
    },
    {
      key: 'social',
      label: 'المجتمع',
      items: [
        { to: '/student/recognition', label: 'تقدير الزملاء', icon: Heart },
        { to: '/student/activity', label: 'نشاط المجموعة', icon: Activity },
        { to: '/student/challenges', label: 'التحديات', icon: Target },
      ],
    },
    {
      key: 'communication',
      label: 'التواصل',
      items: [
        { to: '/student/chat', label: 'محادثة المجموعة', icon: MessageSquare },
        { to: '/student/messages', label: 'الرسائل', icon: Mail },
      ],
    },
    {
      key: 'ai',
      label: 'الذكاء الاصطناعي',
      items: [
        { to: '/student/ai-chat', label: 'المساعد الذكي', icon: Bot },
        { to: '/student/vocabulary', label: 'بنك المفردات', icon: Brain },
      ],
    },
  ],
  trainer: [
    {
      key: 'main',
      label: 'الرئيسية',
      items: [
        { to: '/trainer', label: 'الرئيسية', icon: House },
      ],
    },
    {
      key: 'teaching',
      label: 'التدريس',
      items: [
        { to: '/trainer/assignments', label: 'الواجبات', icon: FileText },
        { to: '/trainer/writing', label: 'التقييم', icon: ClipboardCheck },
        { to: '/trainer/schedule', label: 'الجدول', icon: Calendar },
        { to: '/trainer/notes', label: 'ملاحظات الحصص', icon: StickyNote },
        { to: '/trainer/library', label: 'المكتبة', icon: BookOpen },
      ],
    },
    {
      key: 'live',
      label: 'الحصة المباشرة',
      items: [
        { to: '/trainer/points', label: 'النقاط السريعة', icon: Zap },
        { to: '/trainer/attendance', label: 'الحضور', icon: UserCheck },
      ],
    },
    {
      key: 'students',
      label: 'الطلاب',
      items: [
        { to: '/trainer/students', label: 'ملفات الطلاب', icon: User },
        { to: '/trainer/student-notes', label: 'ملاحظات الطلاب', icon: MessageSquare },
        { to: '/trainer/teams', label: 'الفرق', icon: Users },
      ],
    },
    {
      key: 'communication',
      label: 'التواصل',
      items: [
        { to: '/trainer/chat', label: 'محادثة المجموعة', icon: MessageSquare },
        { to: '/trainer/messages', label: 'الرسائل', icon: Mail },
        { to: '/trainer/challenges', label: 'التحديات', icon: Target },
      ],
    },
    {
      key: 'ai',
      label: 'الذكاء الاصطناعي',
      items: [
        { to: '/trainer/ai-assistant', label: 'المساعد الذكي', icon: Bot },
        { to: '/trainer/reports', label: 'تقارير التقدم', icon: FileBarChart },
      ],
    },
  ],
  admin: [
    {
      key: 'main',
      label: 'الرئيسية',
      items: [
        { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
      ],
    },
    {
      key: 'teaching',
      label: 'التدريس',
      items: [
        { to: '/trainer/assignments', label: 'الواجبات', icon: FileText },
        { to: '/trainer/writing', label: 'التقييم', icon: ClipboardCheck },
        { to: '/trainer/schedule', label: 'الجدول', icon: Calendar },
        { to: '/trainer/notes', label: 'ملاحظات الحصص', icon: StickyNote },
        { to: '/trainer/library', label: 'المكتبة', icon: BookOpen },
      ],
    },
    {
      key: 'live',
      label: 'الحصة المباشرة',
      items: [
        { to: '/trainer/points', label: 'النقاط السريعة', icon: Zap },
        { to: '/trainer/attendance', label: 'الحضور', icon: UserCheck },
      ],
    },
    {
      key: 'management',
      label: 'الإدارة',
      items: [
        { to: '/admin/users', label: 'الطلاب', icon: Users },
        { to: '/admin/groups', label: 'المجموعات', icon: Users },
        { to: '/admin/trainers', label: 'المدربين', icon: Briefcase },
        { to: '/trainer/students', label: 'ملفات الطلاب', icon: User },
        { to: '/trainer/student-notes', label: 'ملاحظات الطلاب', icon: MessageSquare },
        { to: '/trainer/teams', label: 'الفرق', icon: Users },
      ],
    },
    {
      key: 'finance',
      label: 'المالية',
      items: [
        { to: '/admin/packages', label: 'المدفوعات', icon: CreditCard },
      ],
    },
    {
      key: 'communication',
      label: 'التواصل',
      items: [
        { to: '/trainer/chat', label: 'محادثة المجموعة', icon: MessageSquare },
        { to: '/trainer/messages', label: 'الرسائل', icon: Mail },
        { to: '/trainer/challenges', label: 'التحديات', icon: Target },
      ],
    },
    {
      key: 'ai',
      label: 'الذكاء الاصطناعي',
      items: [
        { to: '/trainer/ai-assistant', label: 'المساعد الذكي', icon: Bot },
        { to: '/trainer/reports', label: 'تقارير التقدم', icon: FileBarChart },
      ],
    },
    {
      key: 'analytics',
      label: 'التحليلات',
      items: [
        { to: '/admin/reports', label: 'التقارير', icon: BarChart3 },
      ],
    },
    {
      key: 'system',
      label: 'النظام',
      items: [
        { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
      ],
    },
  ],
}

const COLLAPSED_STORAGE_KEY = 'fluentia_sidebar_groups'

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const role = profile?.role || 'student'
  const groups = NAV_GROUPS[role] || NAV_GROUPS.student

  // Load collapsed state from localStorage
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try {
      const stored = localStorage.getItem(`${COLLAPSED_STORAGE_KEY}_${role}`)
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  })

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem(`${COLLAPSED_STORAGE_KEY}_${role}`, JSON.stringify(collapsedGroups))
  }, [collapsedGroups, role])

  function toggleGroup(key) {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

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
        <button onClick={onClose} className="lg:hidden text-muted hover:text-white transition-colors">
          <X size={20} />
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden lg:block text-muted hover:text-white transition-colors"
        >
          <ChevronLeft size={18} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-2 px-3 overflow-y-auto">
        {groups.map((group, gi) => {
          const isGroupCollapsed = collapsedGroups[group.key]
          const isSingleItem = group.items.length === 1

          return (
            <div key={group.key} className={gi > 0 ? 'mt-1' : ''}>
              {/* Group header — skip for single-item groups */}
              {!isSingleItem && !collapsed && (
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-medium text-muted/60 uppercase tracking-wide hover:text-muted transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${isGroupCollapsed ? 'rotate-180' : ''}`}
                  />
                </button>
              )}

              {/* Collapsed sidebar: show divider between groups */}
              {collapsed && gi > 0 && (
                <div className="border-t border-border-subtle/30 my-1 mx-2" />
              )}

              {/* Group items */}
              {(!isGroupCollapsed || isSingleItem || collapsed) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === `/${role}` || item.to === '/admin' || item.to === '/trainer' || item.to === '/student'}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'text-muted hover:text-white hover:bg-white/5'
                        } ${collapsed ? 'justify-center' : ''}`
                      }
                    >
                      <item.icon size={18} className="shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-border-subtle pt-3">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={18} className="shrink-0" />
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
