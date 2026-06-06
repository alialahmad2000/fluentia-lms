import {
  Home, BookOpen, BookOpenCheck, PenLine, Mic, Users, Trophy,
  BookMarked, User, Settings, BarChart3, ClipboardList,
  Megaphone, CreditCard, GraduationCap, UserCog, Bot, FileText,
  StickyNote, TrendingUp, Zap, CalendarClock, Swords, Target, Map, Award,
  MessageCircle, MessageSquare, Volume2, Dumbbell, FileCheck, Activity, PencilLine,
  Bug,
} from 'lucide-react'


export const STUDENT_NAV = {
  sections: [
    {
      id: 'learning',
      label: 'التعلّم',
      items: [
        { id: 'dashboard',   label: 'الرئيسية',    icon: Home,       to: '/student' },
        { id: 'srs',         label: 'مراجعة المفردات اليومية', icon: BookOpenCheck, to: '/student/srs', showBadge: true, badgeSource: 'srs-due' },
        { id: 'hard-words',  label: 'تدريب الكلمات الصعبة', icon: Dumbbell, to: '/student/hard-words', showBadge: true, badgeSource: 'hard-words-count', visibleWhen: 'hard-words-count' },
        { id: 'curriculum',  label: 'المنهج',       icon: BookOpen,   to: '/student/curriculum' },
        { id: 'flashcards',  label: 'المفردات',     icon: FileText,   to: '/student/vocab-journey' },
        { id: 'spelling-lab', label: 'مختبر الإملاء', icon: PencilLine, to: '/student/spelling-lab' },
        { id: 'ielts-atelier', label: 'IELTS Atelier', icon: Award,    to: '/student/ielts-atelier', requiresPackage: 'ielts' },
        { id: 'speaking-hub', label: 'نادي المحادثة', icon: MessageCircle, to: '/student/speaking-hub' },
        // SIDEBAR-HIDDEN 2026-06-02 (prompt 09): removed from sidebar nav only — routes still
        // registered in App.jsx (direct-URL reachable) and items kept in drawerSections below:
        //   progress(تقدّمي), reports(التقارير), how-to-earn(كيف تكسب XP), level-journey(خريطة رحلتكِ)
      ],
    },
    {
      id: 'exams',
      label: 'الاختبارات',
      items: [
        { id: 'mock-exam', label: 'الاختبار التجريبي', icon: FileCheck, to: '/student/mock-exam', requiresMockExamAccess: true },
      ],
    },
    {
      id: 'community',
      label: 'المجتمع',
      items: [
        { id: 'chat',              label: 'المحادثة',            icon: MessageSquare, to: '/chat', showBadge: true, badgeSource: 'chat-unread' },
        { id: 'leaderboard',       label: 'لوحة الشرف',         icon: Trophy,   to: '/student/leaderboard' },
        { id: 'duels',             label: 'المبارزات',           icon: Zap,      to: '/student/duels' },
        // SIDEBAR-HIDDEN 2026-06-02 (prompt 09): removed from sidebar nav only — routes still
        // registered + kept in drawerSections below: competition(المسابقة), competition-rules(قواعد المسابقة)
      ],
    },
    {
      id: 'account',
      label: 'حسابي',
      items: [
        { id: 'profile',     label: 'ملفي',         icon: User,       to: '/student/profile' },
        { id: 'my-reports',  label: 'بلاغاتي',       icon: Bug,        to: '/student/my-reports' },
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
        { id: 'srs',          label: 'مراجعة المفردات اليومية', icon: BookOpenCheck, to: '/student/srs', showBadge: true, badgeSource: 'srs-due' },
        { id: 'hard-words',   label: 'تدريب الكلمات الصعبة', icon: Dumbbell, to: '/student/hard-words', showBadge: true, badgeSource: 'hard-words-count', visibleWhen: 'hard-words-count' },
        { id: 'curriculum',   label: 'المنهج',       icon: BookOpen,     to: '/student/curriculum' },
        { id: 'progress',     label: 'تقدّمي',       icon: BarChart3,    to: '/student/progress' },
        { id: 'flashcards',   label: 'المفردات',     icon: FileText,     to: '/student/vocab-journey' },
        { id: 'spelling-lab', label: 'مختبر الإملاء', icon: PencilLine,   to: '/student/spelling-lab' },
        { id: 'ielts-atelier', label: 'IELTS Atelier', icon: Award,       to: '/student/ielts-atelier', requiresPackage: 'ielts' },
        { id: 'reports',      label: 'التقارير',     icon: CalendarClock, to: '/student/progress-reports' },
        { id: 'how-to-earn',  label: 'كيف تكسب XP 🎯', icon: Target,    to: '/student/how-to-earn' },
        { id: 'level-journey', label: 'خريطة رحلتك',   icon: Map,       to: '/student/level-journey' },
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
        { id: 'my-reports',  label: 'بلاغاتي',       icon: Bug,        to: '/student/my-reports' },
      ],
    },
  ],
  // POLICY: Mobile bar is fixed at 5 slots. IELTS is NOT included here by design.
  // IELTS students access the track via the sidebar (desktop) or "More" drawer (mobile).
  // DO NOT add IELTS to this array without explicit product approval.
  mobileBar: [
    { id: 'dashboard',   label: 'الرئيسية',  icon: Home,       to: '/student' },
    { id: 'curriculum',  label: 'المنهج',     icon: BookOpen,   to: '/student/curriculum' },
    { id: 'flashcards',  label: 'المفردات',   icon: FileText,   to: '/student/vocab-journey' },
    // 2026-06-02 (prompt 09): 'progress' was hidden from the sidebar, so it's replaced here by the
    // new Spelling Lab to keep the 5-slot bar consistent on mobile (primary device). 'progress'
    // stays reachable via the "More" drawer + direct URL.
    { id: 'spelling-lab', label: 'الإملاء',   icon: PencilLine, to: '/student/spelling-lab' },
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
        { id: 'chat',        label: 'المحادثة',      icon: MessageSquare, to: '/chat', showBadge: true, badgeSource: 'chat-unread' },
        { id: 'points',      label: 'النقاط السريعة', icon: Zap,          to: '/trainer/points' },
        { id: 'notes',       label: 'ملاحظاتي',     icon: StickyNote,    to: '/trainer/my-notes' },
        { id: 'curriculum',  label: 'المنهج',       icon: BookOpen,      to: '/trainer/curriculum' },
        { id: 'student-curriculum', label: 'معاينة منهج الطالب', icon: FileText, to: '/trainer/student-curriculum' },
        { id: 'interactive-curriculum', label: 'المنهج التفاعلي', icon: FileText, to: '/trainer/interactive-curriculum' },
        { id: 'progress',    label: 'تقدم الطلاب',  icon: TrendingUp,    to: '/trainer/progress-matrix' },
        { id: 'reports',     label: 'تقارير الطلاب', icon: CalendarClock, to: '/trainer/reports' },
        { id: 'mock-exam',   label: 'نتائج الاختبار التجريبي', icon: FileCheck, to: '/trainer/mock-exam-results' },
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
        { id: 'mock-exam',   label: 'نتائج الاختبار التجريبي', icon: FileCheck, to: '/admin/mock-exam-results' },
        { id: 'cs-performance', label: 'أداء فريق العملاء', icon: TrendingUp, to: '/admin/cs-performance' },
      ],
    },
    {
      id: 'people',
      label: 'الأشخاص',
      items: [
        { id: 'students',    label: 'الطلاب',       icon: GraduationCap, to: '/admin/users' },
        { id: 'groups',      label: 'المجموعات',    icon: Users,         to: '/admin/groups' },
        { id: 'trainers',    label: 'المدربون',     icon: UserCog,       to: '/admin/trainers' },
        { id: 'team',        label: 'الموظفون',     icon: UserCog,       to: '/admin/team' },
      ],
    },
    {
      id: 'operations',
      label: 'العمليات',
      items: [
        { id: 'content',     label: 'المحتوى',      icon: BookOpen,      to: '/admin/content' },
        { id: 'library',     label: 'المكتبة',      icon: BookMarked,    to: '/library' },
        { id: 'curriculum',  label: 'المنهج',       icon: FileText,      to: '/admin/curriculum' },
        { id: 'student-curriculum', label: 'معاينة منهج الطالب', icon: BookOpen, to: '/admin/student-curriculum' },
        { id: 'ielts-atelier-preview',   label: 'معاينة منهج IELTS',  icon: Target,   to: '/admin/ielts-atelier-preview' },
        { id: 'interactive-curriculum', label: 'المنهج التفاعلي', icon: BookOpen, to: '/admin/interactive-curriculum' },
        { id: 'payments',    label: 'المالية',      icon: CreditCard,    to: '/admin/packages' },
        { id: 'marketing',   label: 'التسويق',      icon: Megaphone,     to: '/admin/announcements' },
        { id: 'affiliates',  label: 'الشركاء',      icon: Users,         to: '/admin/affiliates' },
        { id: 'cs-team',     label: 'فريق العملاء',  icon: Users,         to: '/team/pipeline' },
        { id: 'competition', label: 'المسابقة ⚔️',  icon: Swords,        to: '/admin/competition' },
        { id: 'ielts',       label: 'IELTS',         icon: Target,        to: '/admin/curriculum/ielts' },
        { id: 'speaking-hubs', label: 'نادي المحادثة', icon: MessageCircle, to: '/admin/speaking-hubs' },
        { id: 'chat',          label: 'المحادثة',      icon: MessageSquare, to: '/chat', showBadge: true, badgeSource: 'chat-unread' },
      ],
    },
    {
      id: 'system',
      label: 'النظام',
      items: [
        { id: 'bug-reports', label: 'بلاغات المشاكل', icon: Bug,           to: '/admin/bug-reports' },
        { id: 'audio-telemetry', label: 'فشل الصوت',    icon: Volume2,       to: '/admin/audio-telemetry' },
        { id: 'system-diagnostics', label: 'تشخيص النظام', icon: Activity,   to: '/admin/system' },
        { id: 'integrations', label: 'التكاملات', icon: CalendarClock, to: '/admin/integrations' },
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

export const AGENT_NAV = {
  sections: [
    {
      id: 'cs',
      label: 'فريق العملاء',
      items: [
        { id: 'team', label: 'مساحة الفريق', icon: Users, to: '/team' },
      ],
    },
  ],
  mobileBar: [
    { id: 'pipeline',  label: 'العملاء',   icon: Users,         to: '/team/pipeline' },
    { id: 'followups', label: 'المتابعات', icon: Activity,      to: '/team/followups' },
    { id: 'schedule',  label: 'الجدولة',   icon: CalendarClock, to: '/team/schedule' },
  ],
}

export function getNavForRole(role) {
  if (role === 'trainer') return TRAINER_NAV
  if (role === 'admin') return ADMIN_NAV
  if (role === 'agent') return AGENT_NAV
  return STUDENT_NAV
}
