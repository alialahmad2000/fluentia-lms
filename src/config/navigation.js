import {
  Home, BookOpen, PenLine, Mic, Users, Trophy,
  BookMarked, User, Settings, BarChart3, ClipboardList,
  Megaphone, CreditCard, GraduationCap, UserCog, Bot, FileText,
  StickyNote, TrendingUp, Zap, CalendarClock, Swords, Target, Map, Award,
  MessageCircle,
} from 'lucide-react'


export const STUDENT_NAV = {
  sections: [
    {
      id: 'learning',
      label: 'التعلّم',
      items: [
        { id: 'dashboard',   label: 'الرئيسية',    icon: Home,       to: '/student' },
        { id: 'curriculum',  label: 'المنهج',       icon: BookOpen,   to: '/student/curriculum' },
        { id: 'progress',    label: 'تقدّمي',       icon: BarChart3,  to: '/student/progress' },
        { id: 'flashcards',  label: 'المفردات',     icon: FileText,   to: '/student/flashcards' },
        { id: 'ielts',       label: 'IELTS',         icon: Target,     to: '/student/ielts', requiresPackage: 'ielts' },
        { id: 'reports',     label: 'التقارير',     icon: CalendarClock, to: '/student/progress-reports' },
        { id: 'how-to-earn', label: 'كيف تكسب XP 🎯', icon: Target,   to: '/student/how-to-earn' },
        { id: 'level-journey', label: 'خريطة رحلتكِ',  icon: Map,      to: '/student/level-journey' },
        { id: 'speaking-hub', label: 'نادي المحادثة', icon: MessageCircle, to: '/student/speaking-hub' },
      ],
    },
    {
      id: 'community',
      label: 'المجتمع',
      items: [
        { id: 'competition',       label: 'المسابقة ⚔️',       icon: Swords,   to: '/student/competition' },
        { id: 'competition-rules', label: 'قواعد المسابقة 📜',  icon: BookOpen, to: '/student/competition/rules' },
        { id: 'leaderboard',       label: 'لوحة الشرف',         icon: Trophy,   to: '/student/leaderboard' },
        { id: 'duels',             label: 'المبارزات',           icon: Zap,      to: '/student/duels' },
      ],
    },
    {
      id: 'account',
      label: 'حسابي',
      items: [
        { id: 'profile',     label: 'ملفي',         icon: User,       to: '/student/profile' },
      ],
    },
  ],
  /* drawerSections — used by the "More" drawer (MobileDrawer).
     Includes ALL items so removed sidebar items stay accessible. */
  drawerSections: [
    {
      id: 'learning',
      label: 'التعلّم',
      items: [
        { id: 'dashboard',    label: 'الرئيسية',    icon: Home,          to: '/student' },
        { id: 'curriculum',   label: 'المنهج',       icon: BookOpen,     to: '/student/curriculum' },
        { id: 'progress',     label: 'تقدّمي',       icon: BarChart3,    to: '/student/progress' },
        { id: 'flashcards',   label: 'المفردات',     icon: FileText,     to: '/student/flashcards' },
        { id: 'ielts',        label: 'IELTS',         icon: Target,        to: '/student/ielts', requiresPackage: 'ielts' },
        { id: 'reports',      label: 'التقارير',     icon: CalendarClock, to: '/student/progress-reports' },
        { id: 'how-to-earn',  label: 'كيف تكسب XP 🎯', icon: Target,    to: '/student/how-to-earn' },
        { id: 'level-journey', label: 'خريطة رحلتكِ',   icon: Map,       to: '/student/level-journey' },
      ],
    },
    {
      id: 'community',
      label: 'المجتمع',
      items: [
        { id: 'competition',       label: 'المسابقة ⚔️',       icon: Swords,   to: '/student/competition' },
        { id: 'competition-rules', label: 'قواعد المسابقة 📜',  icon: BookOpen, to: '/student/competition/rules' },
        { id: 'leaderboard',       label: 'لوحة الشرف',         icon: Trophy,   to: '/student/leaderboard' },
        { id: 'duels',             label: 'المبارزات',           icon: Zap,      to: '/student/duels' },
      ],
    },
    {
      id: 'account',
      label: 'حسابي',
      items: [
        { id: 'profile',     label: 'ملفي',         icon: User,       to: '/student/profile' },
      ],
    },
  ],
  // POLICY: Mobile bar is fixed at 5 slots. IELTS is NOT included here by design.
  // IELTS students access the track via the sidebar (desktop) or "More" drawer (mobile).
  // DO NOT add IELTS to this array without explicit product approval.
  mobileBar: [
    { id: 'dashboard',   label: 'الرئيسية',  icon: Home,       to: '/student' },
    { id: 'curriculum',  label: 'المنهج',     icon: BookOpen,   to: '/student/curriculum' },
    { id: 'flashcards',  label: 'المفردات',   icon: FileText,   to: '/student/flashcards' },
    { id: 'progress',    label: 'تقدّمي',     icon: BarChart3,  to: '/student/progress' },
    { id: 'more',        label: 'المزيد',     icon: 'more',     to: null },
  ],
}

export const TRAINER_NAV = {
  sections: [
    {
      id: 'teaching',
      label: 'التدريس',
      items: [
        { id: 'dashboard',   label: 'الرئيسية',     icon: Home,          to: '/trainer' },
        { id: 'students',    label: 'الطلاب',       icon: GraduationCap, to: '/trainer/my-students' },
        { id: 'grading',     label: 'التقييم',      icon: ClipboardList, to: '/trainer/grading' },
        { id: 'trainer-ielts', label: 'IELTS',      icon: Award,         to: '/trainer/ielts', requiresIELTSStudents: true },
      ],
    },
    {
      id: 'tools',
      label: 'الأدوات',
      items: [
        { id: 'points',      label: 'النقاط السريعة', icon: Zap,          to: '/trainer/points' },
        { id: 'notes',       label: 'ملاحظاتي',     icon: StickyNote,    to: '/trainer/my-notes' },
        { id: 'curriculum',  label: 'المنهج',       icon: BookOpen,      to: '/trainer/curriculum' },
        { id: 'student-curriculum', label: 'معاينة منهج الطالب', icon: FileText, to: '/trainer/student-curriculum' },
        { id: 'interactive-curriculum', label: 'المنهج التفاعلي', icon: FileText, to: '/trainer/interactive-curriculum' },
        { id: 'progress',    label: 'تقدم الطلاب',  icon: TrendingUp,    to: '/trainer/progress-matrix' },
        { id: 'reports',     label: 'تقارير الطلاب', icon: CalendarClock, to: '/trainer/reports' },
        { id: 'ai',          label: 'المساعد الذكي', icon: Bot,           to: '/trainer/ai-assistant' },
      ],
    },
  ],
  mobileBar: [
    { id: 'dashboard',  label: 'الرئيسية', icon: Home,          to: '/trainer' },
    { id: 'students',   label: 'الطلاب',   icon: GraduationCap, to: '/trainer/my-students' },
    { id: 'grading',    label: 'التقييم',   icon: ClipboardList, to: '/trainer/grading' },
    { id: 'points',     label: 'الحصة',     icon: Zap,           to: '/trainer/points' },
    { id: 'more',       label: 'المزيد',    icon: 'more',        to: null },
  ],
}

export const ADMIN_NAV = {
  sections: [
    {
      id: 'overview',
      label: 'نظرة عامة',
      items: [
        { id: 'dashboard',   label: 'الرئيسية',     icon: Home,          to: '/admin' },
        { id: 'reports',     label: 'التقارير',     icon: BarChart3,     to: '/admin/reports' },
      ],
    },
    {
      id: 'people',
      label: 'الأشخاص',
      items: [
        { id: 'students',    label: 'الطلاب',       icon: GraduationCap, to: '/admin/users' },
        { id: 'groups',      label: 'المجموعات',    icon: Users,         to: '/admin/groups' },
        { id: 'trainers',    label: 'المدربون',     icon: UserCog,       to: '/admin/trainers' },
      ],
    },
    {
      id: 'operations',
      label: 'العمليات',
      items: [
        { id: 'content',     label: 'المحتوى',      icon: BookOpen,      to: '/admin/content' },
        { id: 'curriculum',  label: 'المنهج',       icon: FileText,      to: '/admin/curriculum' },
        { id: 'student-curriculum', label: 'معاينة منهج الطالب', icon: BookOpen, to: '/admin/student-curriculum' },
        { id: 'ielts-v2-preview',   label: 'معاينة منهج IELTS',  icon: Target,   to: '/admin/ielts-v2-preview' },
        { id: 'interactive-curriculum', label: 'المنهج التفاعلي', icon: BookOpen, to: '/admin/interactive-curriculum' },
        { id: 'payments',    label: 'المالية',      icon: CreditCard,    to: '/admin/packages' },
        { id: 'marketing',   label: 'التسويق',      icon: Megaphone,     to: '/admin/announcements' },
        { id: 'affiliates',  label: 'الشركاء',      icon: Users,         to: '/admin/affiliates' },
        { id: 'competition', label: 'المسابقة ⚔️',  icon: Swords,        to: '/admin/competition' },
        { id: 'ielts',       label: 'IELTS',         icon: Target,        to: '/admin/curriculum/ielts' },
        { id: 'speaking-hubs', label: 'نادي المحادثة', icon: MessageCircle, to: '/admin/speaking-hubs' },
      ],
    },
    {
      id: 'system',
      label: 'النظام',
      items: [
        { id: 'settings',    label: 'الإعدادات',    icon: Settings,      to: '/admin/settings' },
      ],
    },
  ],
  mobileBar: [
    { id: 'dashboard', label: 'الرئيسية', icon: Home,          to: '/admin' },
    { id: 'students',  label: 'الطلاب',   icon: GraduationCap, to: '/admin/users' },
    { id: 'groups',    label: 'المجموعات', icon: Users,         to: '/admin/groups' },
    { id: 'reports',   label: 'التقارير',  icon: BarChart3,     to: '/admin/reports' },
    { id: 'more',      label: 'المزيد',    icon: 'more',        to: null },
  ],
}

export function getNavForRole(role) {
  if (role === 'trainer') return TRAINER_NAV
  if (role === 'admin') return ADMIN_NAV
  return STUDENT_NAV
}
