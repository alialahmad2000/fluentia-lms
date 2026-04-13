import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { tracker } from '../../services/activityTracker'
import { motion, AnimatePresence } from 'framer-motion'
import {
  House, FileText, BarChart3, Mic, PenLine, MessageSquare,
  Bot, Users, CreditCard, Settings, LayoutDashboard,
  LogOut, X, ChevronLeft, Zap, FolderOpen, CalendarDays, Calendar,
  Video, ClipboardCheck, UsersRound, GraduationCap, Wrench, ListChecks,
  Brain, BookOpen, Sparkles, Database, Languages, Shuffle, Lock, Map, Activity,
  StickyNote, TrendingUp, Megaphone, RefreshCw, Clapperboard, Swords,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import { hasPackageAccess } from '../PackageGate'
import { PACKAGES } from '../../lib/constants'
import UserAvatar from '../common/UserAvatar'
import { hardRefresh } from '../../utils/hardRefresh'

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
    { to: '/student/flashcards', label: 'المفردات', icon: Languages },
    { to: '/student/verbs', label: 'الأفعال الشاذة', icon: Shuffle },
    { to: '/student/progress', label: 'تقدّمي', icon: Activity },
    { type: 'divider', label: 'مسابقات' },
    { to: '/student/duels', label: 'المبارزات', icon: Swords },
    { to: '/student/creator-challenge', label: 'تحدي المبدعين', icon: Clapperboard },
    { type: 'divider', label: 'معامل' },
    { to: '/student/speaking-lab', label: 'معمل التحدث', icon: Mic, requiredPackage: 'tamayuz', comingSoon: true },
    { to: '/student/writing-lab', label: 'معمل الكتابة', icon: PenLine, requiredPackage: 'tamayuz', comingSoon: true },
    { type: 'divider', label: 'التقييم' },
    { to: '/student/adaptive-test', label: 'اختبار المستوى', icon: Brain, requiredPackage: 'talaqa' },
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
    { type: 'divider', label: 'تعليم' },
    { to: '/trainer/curriculum', label: 'المنهج', icon: BookOpen },
    { to: '/trainer/interactive-curriculum', label: 'المنهج التفاعلي', icon: Map },
    { type: 'divider', label: 'طلاب' },
    { to: '/trainer/my-students', label: 'الطلاب', icon: Users },
    { to: '/trainer/progress-matrix', label: 'تقدم الطلاب', icon: BarChart3 },
    { type: 'divider', label: 'مهام' },
    { to: '/trainer/grading', label: 'التقييم', icon: ClipboardCheck },
    { to: '/trainer/my-notes', label: 'ملاحظاتي', icon: StickyNote },
    { to: '/trainer/weekly-report', label: 'تقرير أسبوعي', icon: TrendingUp },
    { type: 'divider', label: 'تواصل' },
    { to: '/trainer/conversation', label: 'المحادثة', icon: MessageSquare },
    { to: '/trainer/ai-assistant', label: 'المساعد الذكي', icon: Bot },
  ],
  admin: [
    { type: 'divider', label: 'أساسي' },
    { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
    { type: 'divider', label: 'إدارة' },
    { to: '/admin/users', label: 'الطلاب', icon: Users },
    { to: '/admin/packages', label: 'المالية', icon: CreditCard },
    { to: '/admin/content', label: 'المحتوى', icon: FolderOpen },
    { to: '/admin/curriculum', label: 'المنهج الدراسي', icon: GraduationCap },
    { to: '/admin/curriculum/map', label: 'خريطة المنهج', icon: Map },
    { to: '/trainer/curriculum', label: 'تصفّح المنهج', icon: BookOpen },
    { to: '/admin/interactive-curriculum', label: 'المنهج التفاعلي', icon: Map },
    { to: '/trainer/progress-matrix', label: 'ماتركس التقدم', icon: BarChart3 },
    { to: '/admin/test-bank', label: 'بنك الأسئلة', icon: Database },
    { to: '/admin/content-bank', label: 'بنك المحتوى', icon: BookOpen },
    { to: '/admin/ai-dashboard', label: 'لوحة الذكاء', icon: Brain },
    { type: 'divider', label: 'أدوات' },
    { to: '/admin/reports', label: 'التقارير', icon: BarChart3 },
    { to: '/admin/analytics', label: 'تحليلات المنصة', icon: Activity },
    { to: '/admin/daily-reports', label: 'التقرير اليومي', icon: CalendarDays },
    { to: '/trainer/ai-assistant', label: 'المساعد الذكي', icon: Bot },
    { to: '/admin/announcements', label: 'الإعلانات', icon: Megaphone },
    { to: '/admin/creator-challenge', label: 'تحدي المبدعين', icon: Clapperboard },
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
  const displayName = profile?.full_name || profile?.display_name || ''
  const level = studentData?.level || profile?.level || '—'
  const studentPackage = studentData?.package || 'asas'
  const [sidebarToast, setSidebarToast] = useState(null)

  const profilePath = role === 'admin' ? '/admin/settings' : role === 'trainer' ? '/trainer/students' : '/student/profile'

  function showSidebarToast(msg) {
    setSidebarToast(msg)
    setTimeout(() => setSidebarToast(null), 2500)
  }

  async function handleLogout() {
    try {
      await signOut()
    } catch (err) {
      console.warn('[Sidebar] signOut API failed, forcing local cleanup:', err)
    } finally {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key)
      })
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-')) sessionStorage.removeItem(key)
      })
      window.location.href = '/login'
    }
  }

  function handleUserCardClick() {
    window.location.href = profilePath
    onClose?.()
  }

  // Click handler that blocks locked/comingSoon items
  function handleNavClick(e, item) {
    const isComingSoon = item.comingSoon
    const isLocked = !isComingSoon && item.requiredPackage && role === 'student' && !hasPackageAccess(studentPackage, item.requiredPackage)

    if (isComingSoon) {
      e.preventDefault()
      showSidebarToast('نشتغل عليها! بتكون جاهزة قريب إن شاء الله')
      return
    }
    if (isLocked) {
      e.preventDefault()
      const pkgName = PACKAGES[item.requiredPackage]?.name_ar || item.requiredPackage
      showSidebarToast(`هالميزة متاحة لباقة ${pkgName} وأعلى`)
      return
    }
    tracker.track('nav_clicked', { item: item.label, to: item.to, source: 'sidebar' })
    onClose?.()
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* ── Fixed top: Brand only ── */}
      <div className="shrink-0">
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
                end={item.to === `/${role}` || item.to === '/admin' || item.to === '/trainer' || item.to === '/student' || item.to === '/admin/curriculum'}
                onClick={(e) => handleNavClick(e, item)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 ${
                    isActive && !isComingSoon && !isLocked
                      ? accent.active
                      : 'hover:bg-[var(--sidebar-hover-bg)]'
                  } ${collapsed ? 'justify-center' : ''}`
                }
                style={({ isActive }) => ({
                  ...(isActive && !isComingSoon && !isLocked ? {} : { color: 'var(--sidebar-text-default)' }),
                  ...(isComingSoon || isLocked ? { opacity: 0.5 } : {}),
                })}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={20}
                      strokeWidth={1.5}
                      className="shrink-0"
                      style={isActive && !isComingSoon && !isLocked
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
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'var(--accent-amber-glow)', color: 'var(--accent-amber)' }}>قريباً</span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* ── Fixed bottom: Profile + Logout ── */}
      <div className="shrink-0 px-3 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        {/* Profile card */}
        <div className="mb-2">
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

        {/* Hard refresh button */}
        <button
          onClick={hardRefresh}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 w-full min-h-[44px] ${collapsed ? 'justify-center' : ''}`}
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--surface-raised)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'transparent' }}
          title="تحديث التطبيق"
        >
          <RefreshCw size={18} strokeWidth={1.5} className="shrink-0" />
          {!collapsed && <span>تحديث التطبيق</span>}
        </button>

        {/* Logout button */}
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

        {/* Safe area spacer for phones with gesture bar / home indicator */}
        <div className="lg:hidden" aria-hidden="true" style={{ minHeight: '56px', height: 'calc(env(safe-area-inset-bottom, 56px) + 24px)' }} />
      </div>

      {/* Sidebar toast */}
      <AnimatePresence>
        {sidebarToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-24 left-3 right-3 z-50 px-4 py-2.5 rounded-xl text-xs font-medium text-center"
            style={{
              background: 'var(--surface-overlay)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {sidebarToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col backdrop-blur-2xl transition-all duration-300 ease-apple fixed top-0 right-0 h-dvh z-30 ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        }`}
        style={{
          background: 'var(--sidebar-bg)',
          borderLeft: '1px solid var(--sidebar-border)',
          paddingTop: 'var(--sat)',
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
              className="fixed top-0 right-0 h-dvh w-[280px] backdrop-blur-2xl z-50 lg:hidden"
              style={{
                background: 'var(--sidebar-bg)',
                borderLeft: '1px solid var(--sidebar-border)',
                paddingTop: 'var(--sat)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
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
