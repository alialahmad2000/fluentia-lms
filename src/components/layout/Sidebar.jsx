import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  House, FileText, BarChart3, Mic, PenLine, MessageSquare,
  Bot, Users, CreditCard, Settings, LayoutDashboard,
  LogOut, X, ChevronLeft, Zap, FolderOpen, CalendarDays, Calendar,
  Video, ClipboardCheck, UsersRound, GraduationCap, Wrench, ListChecks,
  Brain, BookOpen, Sparkles, Database, Languages, Shuffle, Lock, Map,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { hasPackageAccess } from '../PackageGate'
import UserAvatar from '../common/UserAvatar'

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
    { to: '/student/curriculum', label: 'المنهج', icon: BookOpen },
    { to: '/student/assignments', label: 'الواجبات', icon: FileText },
    { to: '/student/weekly-tasks', label: 'المهام الأسبوعية', icon: CalendarDays },
    { to: '/student/schedule', label: 'الجدول', icon: Calendar },
    { to: '/student/study-plan', label: 'خطة الدراسة', icon: Map },
    { to: '/student/recordings', label: 'التسجيلات', icon: Video },
    { to: '/student/flashcards', label: 'المفردات', icon: Languages },
    { to: '/student/verbs', label: 'الأفعال الشاذة', icon: Shuffle },
    { type: 'divider', label: 'معامل' },
    { to: '/student/speaking-lab', label: 'معمل التحدث', icon: Mic, requiredPackage: 'tamayuz', comingSoon: true },
    { to: '/student/writing-lab', label: 'معمل الكتابة', icon: PenLine, requiredPackage: 'tamayuz', comingSoon: true },
    { type: 'divider', label: 'التقييم' },
    { to: '/student/adaptive-test', label: 'اختبار المستوى', icon: Brain },
    { to: '/student/assessments', label: 'التقييمات', icon: ClipboardCheck, requiredPackage: 'talaqa', comingSoon: true },
    { to: '/student/grades', label: 'الدرجات والنتائج', icon: BarChart3, requiredPackage: 'talaqa' },
    { type: 'divider', label: 'تواصل' },
    { to: '/student/conversation', label: 'المحادثة', icon: MessageSquare },
    { to: '/student/ai-chat', label: 'المساعد الذكي', icon: Bot, requiredPackage: 'talaqa' },
    { to: '/student/ai-insights', label: 'رؤى ذكية', icon: Sparkles, requiredPackage: 'talaqa' },
    { to: '/student/group-activity', label: 'نشاط المجموعة', icon: UsersRound, requiredPackage: 'talaqa' },
  ],
  trainer: [
    { type: 'divider', label: 'أساسي' },
    { to: '/trainer', label: 'لوحة التحكم', icon: House },
    { to: '/trainer/assignments', label: 'التدريس', icon: FileText },
    { to: '/trainer/schedule', label: 'الجدول', icon: CalendarDays },
    { to: '/trainer/recordings', label: 'التسجيلات', icon: Video },
    { type: 'divider', label: 'إدارة' },
    { to: '/trainer/students', label: 'الطلاب', icon: GraduationCap },
    { to: '/trainer/quiz', label: 'الاختبارات', icon: ClipboardCheck },
    { to: '/trainer/weekly-grading', label: 'المهام الأسبوعية', icon: ListChecks },
    { type: 'divider', label: 'تواصل' },
    { to: '/trainer/conversation', label: 'المحادثة', icon: MessageSquare },
    { to: '/trainer/ai-assistant', label: 'المساعد الذكي', icon: Bot },
  ],
  admin: [
    { type: 'divider', label: 'أساسي' },
    { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
    { to: '/trainer/assignments', label: 'التدريس', icon: FileText },
    { to: '/trainer/schedule', label: 'الجدول', icon: CalendarDays },
    { to: '/trainer/recordings', label: 'التسجيلات', icon: Video },
    { type: 'divider', label: 'إدارة' },
    { to: '/admin/users', label: 'الطلاب', icon: Users },
    { to: '/admin/packages', label: 'المالية', icon: CreditCard },
    { to: '/admin/content', label: 'المحتوى', icon: FolderOpen },
    { to: '/trainer/quiz', label: 'الاختبارات', icon: ClipboardCheck },
    { to: '/admin/weekly-tasks', label: 'المهام الأسبوعية', icon: ListChecks },
    { to: '/admin/curriculum', label: 'المنهج الدراسي', icon: GraduationCap },
    { to: '/admin/test-bank', label: 'بنك الأسئلة', icon: Database },
    { to: '/admin/content-bank', label: 'بنك المحتوى', icon: BookOpen },
    { to: '/admin/ai-dashboard', label: 'لوحة الذكاء', icon: Brain },
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
  const role = profile?.role || 'student'
  const items = NAV_ITEMS[role] || NAV_ITEMS.student
  const accent = ROLE_ACCENTS[role] || ROLE_ACCENTS.student
  const displayName = profile?.display_name || profile?.full_name || ''
  const level = studentData?.level || profile?.level || '—'
  const studentPackage = studentData?.package || 'asas'

  const profilePath = role === 'admin' ? '/admin/settings' : role === 'trainer' ? '/trainer/students' : '/student/profile'

  async function handleLogout() {
    try {
      await signOut()
    } catch (err) {
      console.warn('[Sidebar] signOut API failed, forcing local cleanup:', err)
    } finally {
      // Always clear Supabase auth storage regardless of API success
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key)
      })
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-')) sessionStorage.removeItem(key)
      })
      // Full page reload to clear all React state
      window.location.href = '/login'
    }
  }

  function handleUserCardClick() {
    window.location.href = profilePath
    onClose?.()
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Fixed top: Brand + Profile ── */}
      <div className="shrink-0">
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

        {/* Profile card — always visible at top */}
        <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {!collapsed ? (
            <div
              onClick={handleUserCardClick}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-all duration-200"
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
              <UserAvatar user={profile} size={36} rounded="lg" gradient={accent.gradient} className="shrink-0" />
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
              className="flex items-center justify-center mx-auto cursor-pointer transition-all duration-200"
            >
              <UserAvatar user={profile} size={40} rounded="lg" gradient={accent.gradient} />
            </div>
          )}
        </div>
      </div>

      {/* ── Scrollable middle: Nav items ── */}
      <nav role="navigation" aria-label="القائمة الجانبية" className="flex-1 min-h-0 py-1 px-3 overflow-y-auto scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="space-y-0.5">
          {items.map((item, i) => {
            if (item.type === 'divider') {
              return <SectionDivider key={`div-${i}`} label={item.label} collapsed={collapsed} />
            }
            const isComingSoon = item.comingSoon
            const isLocked = !isComingSoon && item.requiredPackage && role === 'student' && !hasPackageAccess(studentPackage, item.requiredPackage)

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
                style={({ isActive }) => ({
                  ...(isActive ? {} : { color: 'var(--sidebar-text-default)' }),
                  ...(isComingSoon || isLocked ? { opacity: 0.5 } : {}),
                })}
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
                    {!collapsed && (
                      <span className="flex-1">{item.label}</span>
                    )}
                    {!collapsed && isLocked && (
                      <Lock size={13} className="shrink-0" style={{ color: 'var(--accent-gold)', opacity: 0.8 }} />
                    )}
                    {!collapsed && isComingSoon && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--accent-amber-glow)', color: 'var(--accent-amber)' }}>قريباً</span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* ── Fixed bottom: Logout ── */}
      <div className="shrink-0 px-3 py-3" style={{ borderTop: '1px solid var(--border-subtle)', paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 12px)' }}>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 w-full min-h-[44px] ${collapsed ? 'justify-center' : ''}`}
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
