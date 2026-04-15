import {
  Home, BookOpen, PenLine, Mic, PlayCircle, Users, Trophy, Calendar,
  BookMarked, User, Settings, BarChart3, ClipboardList, MessageSquare,
  Megaphone, CreditCard, GraduationCap, UserCog, Bot, FileText,
  StickyNote, TrendingUp, Zap, Flame,
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
        { id: 'challenges',  label: 'التحديات',     icon: Flame,      to: '/student/challenges' },
      ],
    },
    {
      id: 'community',
      label: 'المجتمع',
      items: [
        { id: 'leaderboard', label: 'لوحة الشرف',   icon: Trophy,     to: '/student/leaderboard' },
        { id: 'duels',       label: 'المبارزات',    icon: Zap,        to: '/student/duels' },
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
        { id: 'challenges',   label: 'التحديات',     icon: Flame,        to: '/student/challenges' },
        { id: 'conversation', label: 'المحادثة',     icon: MessageSquare, to: '/student/conversation' },
        { id: 'recordings',   label: 'التسجيلات',    icon: PlayCircle,   to: '/student/recordings' },
      ],
    },
    {
      id: 'community',
      label: 'المجتمع',
      items: [
        { id: 'schedule',    label: 'جدولي',        icon: Calendar,   to: '/student/schedule' },
        { id: 'leaderboard', label: 'لوحة الشرف',   icon: Trophy,     to: '/student/leaderboard' },
        { id: 'duels',       label: 'المبارزات',    icon: Zap,        to: '/student/duels' },
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
  mobileBar: [
    { id: 'dashboard',   label: 'الرئيسية',  icon: Home,       to: '/student' },
    { id: 'curriculum',  label: 'المنهج',     icon: BookOpen,   to: '/student/curriculum' },
    { id: 'challenges',  label: 'التحديات',   icon: Flame,      to: '/student/challenges' },
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
        { id: 'schedule',    label: 'الجدول',       icon: Calendar,      to: '/trainer/schedule' },
      ],
    },
    {
      id: 'tools',
      label: 'الأدوات',
      items: [
        { id: 'points',      label: 'النقاط السريعة', icon: Zap,          to: '/trainer/points' },
        { id: 'notes',       label: 'ملاحظاتي',     icon: StickyNote,    to: '/trainer/my-notes' },
        { id: 'recordings',  label: 'التسجيلات',    icon: PlayCircle,    to: '/trainer/recordings' },
        { id: 'curriculum',  label: 'المنهج',       icon: BookOpen,      to: '/trainer/curriculum' },
        { id: 'student-curriculum', label: 'معاينة منهج الطالب', icon: FileText, to: '/trainer/student-curriculum' },
        { id: 'interactive-curriculum', label: 'المنهج التفاعلي', icon: FileText, to: '/trainer/interactive-curriculum' },
        { id: 'progress',    label: 'تقدم الطلاب',  icon: TrendingUp,    to: '/trainer/progress-matrix' },
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
        { id: 'interactive-curriculum', label: 'المنهج التفاعلي', icon: BookOpen, to: '/admin/interactive-curriculum' },
        { id: 'payments',    label: 'المالية',      icon: CreditCard,    to: '/admin/packages' },
        { id: 'marketing',   label: 'التسويق',      icon: Megaphone,     to: '/admin/announcements' },
        { id: 'affiliates',  label: 'الشركاء',      icon: Users,         to: '/admin/affiliates' },
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
