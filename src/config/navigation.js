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
        // 2026-06-08: chat promoted to the top of the sidebar (Telegram-replacement) — most prominent after home.
        { id: 'chat',        label: 'المحادثة',    icon: MessageSquare, to: '/chat', showBadge: true, badgeSource: 'chat-unread' },
        { id: 'srs',         label: 'مراجعة المفردات اليومية', icon: BookOpenCheck, to: '/student/srs', showBadge: true, badgeSource: 'srs-due' },
        { id: 'hard-words',  label: 'تدريب الكلمات الصعبة', icon: Dumbbell, to: '/student/hard-words', showBadge: true, badgeSource: 'hard-words-count', visibleWhen: 'hard-words-count' },
        { id: 'curriculum',  label: 'المنهج',       icon: BookOpen,   to: '/student/curriculum' },
        { id: 'flashcards',  label: 'المفردات',     icon: FileText,   to: '/student/vocab-journey' },
        { id: 'spelling-lab', label: 'مختبر الإملاء', icon: PencilLine, to: '/student/spelling-lab' },
        { id: 'speaking-hub', label: 'نادي المحادثة', icon: MessageCircle, to: '/student/speaking-hub' },
        // SIDEBAR-HIDDEN 2026-06-08 (owner): fully hidden from EVERY sidebar surface (desktop +
        // mobile "More" drawer + mobile bar) — routes stay registered in App.jsx (direct-URL
        // reachable), they're just not shown anywhere in the nav. Removed from here AND drawerSections:
        //   ielts-atelier(IELTS Atelier), progress(تقدّمي), reports(التقارير),
        //   how-to-earn(كيف تكسب XP), level-journey(خريطة رحلتك).
      ],
    },
    {
      id: 'exams',
      label: 'الاختبارات',
      items: [
        { id: 'mock-exam', label: 'الاختبار التجريبي', icon: FileCheck, to: '/student/mock-exam', requiresMockExamAccess: true },
      ],
    },
    // 2026-06-08: 'community' section removed — its only visible item (chat) was promoted to the
    // top of the 'learning' section. The hidden community items (leaderboard/duels/competition)
    // stay route-reachable; they were already absent from every nav surface.
    {
      id: 'account',
      label: 'حسابي',
      items: [
        { id: 'profile',     label: 'ملفي',         icon: User,       to: '/student/profile' },
        { id: 'my-reports',  label: 'بلاغاتي',       icon: Bug,        to: '/student/my-reports' },
      ],
    },
  ],
  /* drawerSections — the "More" drawer (MobileDrawer) on phones. Mirrors the desktop
     sidebar exactly: the owner-hidden items (IELTS Atelier, تقدّمي, التقارير, كيف تكسب XP,
     خريطة رحلتك, المسابقة, قواعد المسابقة, لوحة الشرف, المبارزات) are intentionally ABSENT
     here too, so they never reappear on iPhone or during impersonation. Routes still exist. */
  drawerSections: [
    {
      id: 'learning',
      label: 'التعلّم',
      items: [
        { id: 'dashboard',    label: 'الرئيسية',    icon: Home,          to: '/student' },
        { id: 'srs',          label: 'مراجعة المفردات اليومية', icon: BookOpenCheck, to: '/student/srs', showBadge: true, badgeSource: 'srs-due' },
        { id: 'hard-words',   label: 'تدريب الكلمات الصعبة', icon: Dumbbell, to: '/student/hard-words', showBadge: true, badgeSource: 'hard-words-count', visibleWhen: 'hard-words-count' },
        { id: 'curriculum',   label: 'المنهج',       icon: BookOpen,     to: '/student/curriculum' },
        { id: 'flashcards',   label: 'المفردات',     icon: FileText,     to: '/student/vocab-journey' },
        { id: 'spelling-lab', label: 'مختبر الإملاء', icon: PencilLine,   to: '/student/spelling-lab' },
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
    // 2026-06-08: chat promoted to the bottom bar (Telegram-replacement) — center, most-reachable slot.
    // It takes spelling-lab's slot here; spelling-lab stays in the sidebar + "More" drawer + direct URL.
    { id: 'chat',        label: 'المحادثة',   icon: MessageSquare, to: '/chat', showBadge: true, badgeSource: 'chat-unread' },
    { id: 'flashcards',  label: 'المفردات',   icon: FileText,   to: '/student/vocab-journey' },
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
      // الموارد البشرية — one home for staff + CRM so it's easy to follow (owner request 2026-06-06).
      id: 'hr',
      label: 'الموارد البشرية',
      items: [
        { id: 'team',           label: 'الموظفون',          icon: UserCog,       to: '/admin/team' },
        { id: 'cs-team',        label: 'مساحة فريق العملاء', icon: Users,         to: '/team/pipeline' },
        { id: 'cs-performance', label: 'أداء فريق العملاء',  icon: TrendingUp,    to: '/admin/cs-performance' },
        { id: 'integrations',   label: 'التكاملات',          icon: CalendarClock, to: '/admin/integrations' },
      ],
    },
    {
      id: 'operations',
      label: 'العمليات',
      items: [
        // SIDEBAR-HIDDEN 2026-06-06: content / curriculum / ielts-atelier-preview / competition
        // hidden from the admin sidebar per owner — curriculum setup is done, he no longer uses
        // these tools and doesn't want to see them. Routes stay registered in App.jsx (still
        // reachable by direct URL); NO data deleted. cs-team moved to the 'cs' section above.
        { id: 'library',     label: 'المكتبة',      icon: BookMarked,    to: '/library' },
        { id: 'student-curriculum', label: 'معاينة منهج الطالب', icon: BookOpen, to: '/admin/student-curriculum' },
        { id: 'interactive-curriculum', label: 'المنهج التفاعلي', icon: BookOpen, to: '/admin/interactive-curriculum' },
        { id: 'payments',    label: 'المالية',      icon: CreditCard,    to: '/admin/packages' },
        { id: 'marketing',   label: 'التسويق',      icon: Megaphone,     to: '/admin/announcements' },
        { id: 'affiliates',  label: 'الشركاء',      icon: Users,         to: '/admin/affiliates' },
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
        { id: 'subscriptions', label: 'اشتراكات الطلاب', icon: CreditCard,   to: '/admin/subscriptions' },
        { id: 'audio-telemetry', label: 'فشل الصوت',    icon: Volume2,       to: '/admin/audio-telemetry' },
        { id: 'system-diagnostics', label: 'تشخيص النظام', icon: Activity,   to: '/admin/system' },
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
