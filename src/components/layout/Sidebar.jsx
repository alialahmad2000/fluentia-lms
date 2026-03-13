import { useState, useEffect, useMemo } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  House, FileText, Calendar, BarChart3, Mic, BookOpen, User, Trophy, Heart, Activity, Target, Mail,
  Users, Briefcase, CreditCard, Settings, LayoutDashboard,
  LogOut, X, ChevronLeft, ChevronDown, ClipboardCheck, StickyNote, Zap, UserCheck, MessageSquare,
  Bot, Brain, FileBarChart, AlertTriangle, Crosshair, FolderOpen, Moon, Shield, Award, MessageSquareQuote, Gift,
  Search, Database, CalendarDays, SpellCheck,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

// ─── Role accent config ──────────────────────────────────────
const ROLE_ACCENTS = {
  student: {
    active: 'bg-sky-500/10 text-sky-400 border border-sky-500/15',
    icon: 'text-sky-400',
    logo: 'from-sky-400 to-sky-200',
    dot: 'bg-sky-400',
  },
  trainer: {
    active: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15',
    icon: 'text-emerald-400',
    logo: 'from-emerald-400 to-emerald-200',
    dot: 'bg-emerald-400',
  },
  admin: {
    active: 'bg-gold-500/10 text-gold-400 border border-gold-500/15',
    icon: 'text-gold-400',
    logo: 'from-gold-400 to-gold-200',
    dot: 'bg-gold-400',
  },
}

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
        { to: '/student/weekly-tasks', label: 'مهامي الأسبوعية', icon: CalendarDays },
        { to: '/student/assignments', label: 'الواجبات', icon: FileText },
        { to: '/student/quiz', label: 'الاختبارات', icon: ClipboardCheck },
        { to: '/student/schedule', label: 'الجدول', icon: Calendar },
        { to: '/student/library', label: 'المكتبة', icon: BookOpen },
      ],
    },
    {
      key: 'speaking-lab',
      label: 'معمل التحدث',
      items: [
        { to: '/student/speaking', label: 'المحادثة', icon: Mic },
        { to: '/student/voice-journal', label: 'يوميات صوتية', icon: Mic },
        { to: '/student/pronunciation', label: 'مدرب النطق', icon: Mic },
        { to: '/student/conversation', label: 'محاكي المحادثات', icon: MessageSquare },
        { to: '/student/spelling', label: 'مدرب الإملاء', icon: SpellCheck },
      ],
    },
    {
      key: 'progress',
      label: 'التقدم',
      items: [
        { to: '/student/grades', label: 'الدرجات', icon: BarChart3 },
        { to: '/student/assessments', label: 'التقييمات', icon: BarChart3 },
        { to: '/student/certificates', label: 'شهاداتي', icon: Award },
        { to: '/student/profile', label: 'الملف الشخصي', icon: User },
        { to: '/student/leaderboard', label: 'المتصدرين', icon: Trophy },
        { to: '/student/success', label: 'قصة نجاحي', icon: Trophy },
      ],
    },
    {
      key: 'social',
      label: 'المجتمع',
      items: [
        { to: '/student/recognition', label: 'تقدير الزملاء', icon: Heart },
        { to: '/student/activity', label: 'نشاط المجموعة', icon: Activity },
        { to: '/student/challenges', label: 'التحديات', icon: Target },
        { to: '/student/battles', label: 'المعارك', icon: Trophy },
        { to: '/student/events', label: 'الفعاليات', icon: Calendar },
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
        { to: '/student/exercises', label: 'تمارين مخصصة', icon: Crosshair },
        { to: '/student/my-patterns', label: 'أنماط الأخطاء', icon: AlertTriangle },
      ],
    },
    {
      key: 'account',
      label: 'الحساب',
      items: [
        { to: '/student/referral', label: 'دعوة صديق', icon: Gift },
        { to: '/student/avatar', label: 'تخصيص الأفاتار', icon: User },
        { to: '/student/billing', label: 'الفواتير', icon: CreditCard },
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
        { to: '/trainer/weekly-grading', label: 'المهام الأسبوعية', icon: CalendarDays },
        { to: '/trainer/quiz', label: 'مولّد الاختبارات', icon: Brain },
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
        { to: '/trainer/lesson-planner', label: 'مخطط الدروس', icon: BookOpen },
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
        { to: '/admin/today', label: 'مهام اليوم', icon: Zap },
      ],
    },
    {
      key: 'teaching',
      label: 'التدريس',
      items: [
        { to: '/trainer/assignments', label: 'الواجبات', icon: FileText },
        { to: '/trainer/writing', label: 'التقييم', icon: ClipboardCheck },
        { to: '/trainer/weekly-grading', label: 'المهام الأسبوعية', icon: CalendarDays },
        { to: '/trainer/quiz', label: 'مولّد الاختبارات', icon: Brain },
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
        { to: '/trainer/lesson-planner', label: 'مخطط الدروس', icon: BookOpen },
        { to: '/trainer/reports', label: 'تقارير التقدم', icon: FileBarChart },
      ],
    },
    {
      key: 'content',
      label: 'المحتوى',
      items: [
        { to: '/admin/content', label: 'إدارة المحتوى', icon: FolderOpen },
        { to: '/admin/holidays', label: 'العطل والمناسبات', icon: Moon },
        { to: '/admin/testimonials', label: 'الشهادات', icon: MessageSquareQuote },
      ],
    },
    {
      key: 'analytics',
      label: 'التحليلات',
      items: [
        { to: '/admin/reports', label: 'التقارير', icon: BarChart3 },
        { to: '/admin/churn', label: 'توقع الانسحاب', icon: AlertTriangle },
        { to: '/admin/scheduling', label: 'الجدولة الذكية', icon: Calendar },
      ],
    },
    {
      key: 'system',
      label: 'النظام',
      items: [
        { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
        { to: '/admin/export', label: 'تصدير البيانات', icon: Database },
        { to: '/admin/audit-log', label: 'سجل المراجعة', icon: Shield },
      ],
    },
  ],
}

const COLLAPSED_STORAGE_KEY = 'fluentia_sidebar_groups'

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }) {
  const { profile, signOut } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const role = profile?.role || 'student'
  const groups = NAV_GROUPS[role] || NAV_GROUPS.student
  const accent = ROLE_ACCENTS[role] || ROLE_ACCENTS.student

  const [searchQuery, setSearchQuery] = useState('')

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
    if (!profile?.role) return
    localStorage.setItem(`${COLLAPSED_STORAGE_KEY}_${role}`, JSON.stringify(collapsedGroups))
  }, [collapsedGroups, role, profile?.role])

  // Filtered nav items based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups
    const q = searchQuery.trim().toLowerCase()
    return groups
      .map(group => ({
        ...group,
        items: group.items.filter(item => item.label.toLowerCase().includes(q)),
      }))
      .filter(group => group.items.length > 0)
  }, [groups, searchQuery])

  function toggleGroup(key) {
    setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

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
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accent.logo} flex items-center justify-center`}>
              <span className="text-navy-950 font-bold text-sm">F</span>
            </div>
            <h1 className="text-lg font-playfair font-bold text-gradient">Fluentia</h1>
          </div>
        ) : (
          <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accent.logo} flex items-center justify-center mx-auto`}>
            <span className="text-navy-950 font-bold text-sm">F</span>
          </div>
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

      {/* Search — only when expanded */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في القائمة..."
              className="w-full bg-white/[0.04] border border-border-subtle rounded-lg pr-9 pl-3 py-2 text-xs text-white placeholder-muted/50 focus:outline-none focus:ring-1 focus:ring-sky-500/30 focus:border-sky-500/30 transition-all"
            />
          </div>
        </div>
      )}

      {/* Nav groups */}
      <nav role="navigation" aria-label="القائمة الجانبية" className="flex-1 py-2 px-3 overflow-y-auto">
        {filteredGroups.map((group, gi) => {
          const isGroupCollapsed = collapsedGroups[group.key]
          const isSingleItem = group.items.length === 1
          const isSearching = searchQuery.trim().length > 0

          return (
            <div key={group.key} className={gi > 0 ? 'mt-1' : ''}>
              {/* Group header */}
              {!isSingleItem && !collapsed && (
                <button
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={!isGroupCollapsed}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-muted/50 uppercase tracking-wider hover:text-muted transition-colors"
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
                <div className="border-t border-border-subtle/30 my-1.5 mx-2" />
              )}

              {/* Group items */}
              {(!isGroupCollapsed || isSingleItem || collapsed || isSearching) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === `/${role}` || item.to === '/admin' || item.to === '/trainer' || item.to === '/student'}
                      onClick={() => { onClose(); setSearchQuery('') }}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                          isActive
                            ? accent.active
                            : 'text-muted hover:text-white hover:bg-white/[0.05]'
                        } ${collapsed ? 'justify-center' : ''}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon size={18} className={`shrink-0 ${isActive ? '' : 'text-muted/70 group-hover:text-white/70'}`} />
                          {!collapsed && <span>{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* No search results */}
        {searchQuery.trim() && filteredGroups.length === 0 && (
          <div className="text-center py-6">
            <Search size={20} className="text-muted/30 mx-auto mb-2" />
            <p className="text-xs text-muted/50">لا توجد نتائج</p>
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-border-subtle pt-3">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full ${collapsed ? 'justify-center' : ''}`}
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
        className={`hidden lg:flex flex-col bg-navy-950/90 backdrop-blur-2xl border-l border-white/[0.06] transition-all duration-300 ease-apple fixed top-0 right-0 h-screen z-30 ${
          collapsed ? 'w-[72px]' : 'w-[270px]'
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
