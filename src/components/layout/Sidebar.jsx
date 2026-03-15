import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  House, FileText, BarChart3, Mic, PenLine, MessageSquare,
  Bot, Users, CreditCard, Settings, LayoutDashboard,
  LogOut, X, ChevronLeft, Zap, FolderOpen, CalendarDays,
  Video, ClipboardCheck, UsersRound, GraduationCap, Wrench,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'

// ─── Role accent config ──────────────────────────────────────
const ROLE_ACCENTS = {
  student: {
    active: 'sidebar-link-active sidebar-link-active-sky',
    icon: 'text-sky-400',
    activeColor: 'var(--accent-sky)',
    gradient: 'linear-gradient(135deg, var(--accent-sky), var(--accent-violet))',
  },
  trainer: {
    active: 'sidebar-link-active sidebar-link-active-emerald',
    icon: 'text-emerald-400',
    activeColor: 'var(--accent-emerald)',
    gradient: 'linear-gradient(135deg, var(--accent-emerald), var(--accent-sky))',
  },
  admin: {
    active: 'sidebar-link-active sidebar-link-active-gold',
    icon: 'text-gold-400',
    activeColor: 'var(--accent-gold)',
    gradient: 'linear-gradient(135deg, var(--accent-gold), var(--accent-amber))',
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
    { type: 'divider', label: 'أساسي' },
    { to: '/student', label: 'الرئيسية', icon: House },
    { to: '/student/weekly-tasks', label: 'مهامي', icon: CalendarDays },
    { to: '/student/recordings', label: 'التسجيلات', icon: Video },
    { type: 'divider', label: 'معامل' },
    { to: '/student/speaking', label: 'معمل التحدث', icon: Mic },
    { to: '/student/writing-lab', label: 'معمل الكتابة', icon: PenLine },
    { type: 'divider', label: 'التقييم' },
    { to: '/student/assessments', label: 'الاختبارات', icon: ClipboardCheck },
    { to: '/student/grades', label: 'الدرجات والنتائج', icon: BarChart3 },
    { type: 'divider', label: 'تواصل' },
    { to: '/student/conversation', label: 'المحادثة', icon: MessageSquare },
    { to: '/student/ai-chat', label: 'المساعد الذكي', icon: Bot },
    { to: '/student/group-activity', label: 'نشاط المجموعة', icon: UsersRound },
  ],
  trainer: [
    { type: 'divider', label: 'أساسي' },
    { to: '/trainer', label: 'لوحة التحكم', icon: House },
    { to: '/trainer/assignments', label: 'التدريس', icon: FileText },
    { to: '/trainer/schedule', label: 'الجدول', icon: CalendarDays },
    { to: '/trainer/recordings', label: 'التسجيلات', icon: Video },
    { type: 'divider', label: 'إدارة' },
    { to: '/trainer/students', label: 'الطلاب', icon: GraduationCap },
    { to: '/trainer/points', label: 'الحصة المباشرة', icon: Zap },
    { to: '/trainer/ai-assistant', label: 'المساعد الذكي', icon: Bot },
  ],
  admin: [
    { type: 'divider', label: 'أساسي' },
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
    <div className="flex items-center gap-2 px-5 mt-5 mb-2">
      <span
        className="text-[11px] font-semibold whitespace-nowrap"
        style={{ color: 'var(--text-tertiary)', letterSpacing: '0.03em' }}
      >
        {label}
      </span>
      <div className="flex-1" style={{ height: '0.5px', background: 'var(--border-subtle)' }} />
    </div>
  )
}

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const { profile, studentData, signOut } = useAuthStore()
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme)
  const navigate = useNavigate()
  const role = profile?.role || 'student'
  const items = NAV_ITEMS[role] || NAV_ITEMS.student
  const accent = ROLE_ACCENTS[role] || ROLE_ACCENTS.student
  const displayName = profile?.display_name || profile?.full_name || ''
  const firstName = displayName.split(' ')[0] || ''
  const level = studentData?.level || profile?.level || '—'

  const profilePath = role === 'admin' ? '/admin/settings' : role === 'trainer' ? '/trainer/students' : '/student/profile'

  async function handleLogout() {
    try {
      await signOut()
    } catch (err) {
      console.error('[Sidebar] signOut error:', err)
    }
    navigate('/login')
  }

  function handleUserCardClick() {
    navigate(profilePath)
    onClose?.()
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
      <nav role="navigation" aria-label="القائمة الجانبية" className="flex-1 py-1 px-3 overflow-y-auto scrollbar-none">
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
      <div className="px-3 py-3 mt-auto" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {/* Clickable user card */}
        {!collapsed ? (
          <div
            onClick={handleUserCardClick}
            className="flex items-center gap-3 px-3.5 py-3 mb-2 rounded-xl cursor-pointer transition-all duration-200"
            style={{
              background: 'var(--glass-card)',
              border: '1px solid var(--border-subtle)',
              direction: 'rtl',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--glass-card-hover)'
              e.currentTarget.style.borderColor = 'var(--border-glow)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--glass-card)'
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
              style={{
                background: accent.gradient,
                color: '#fff',
              }}
            >
              {firstName?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                {displayName || 'مستخدم'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                {ROLE_LABELS[role] || role}{role === 'student' && level !== '—' ? ` · Level ${level}` : ''}
              </p>
            </div>
            <span className="text-[12px] shrink-0" style={{ color: 'var(--text-tertiary)' }}>←</span>
          </div>
        ) : (
          <div
            onClick={handleUserCardClick}
            className="flex items-center justify-center mx-auto mb-2 w-10 h-10 rounded-lg cursor-pointer transition-all duration-200"
            style={{ background: accent.gradient, color: '#fff', fontSize: 14, fontWeight: 700 }}
          >
            {firstName?.[0] || '?'}
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
              style={{ background: 'var(--modal-backdrop)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
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
