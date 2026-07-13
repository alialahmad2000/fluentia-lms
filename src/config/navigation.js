import {
  NotebookPen,
  ShieldAlert,
  Gift,
  Briefcase,
  Home, BookOpen, BookOpenCheck, PenLine, Mic, Users, Trophy,
  BookMarked, User, Settings, BarChart3, ClipboardList,
  Megaphone, CreditCard, GraduationCap, UserCog, Bot, FileText,
  StickyNote, TrendingUp, Zap, CalendarClock, Swords, Target, Map, Award,
  MessageCircle, MessageSquare, Volume2, Dumbbell, FileCheck, Activity, PencilLine,
  Bug, Sparkles, Handshake, Layers, Eye, Star,
} from 'lucide-react'


export const STUDENT_NAV = {
  sections: [
    /* Reorganized 2026-07-06 ("one journey" IA): the old 11-item التعلّم wall is
       now 3 purposeful groups — رحلة التعلّم (the path) / التدريب اليومي (daily
       practice rituals) / عالم طلاقة (the immersive world + community). */
    {
      id: 'journey',
      label: 'رحلة التعلّم',
      items: [
        { id: 'dashboard',   label: 'الرئيسية',    icon: Home,       to: '/student' },
        { id: 'curriculum',  label: 'المنهج',       icon: BookOpen,   to: '/student/curriculum' },
        { id: 'everyday-english', label: 'إنجليزي يومي', icon: Sparkles, to: '/student/everyday-english' },
        { id: 'sentence-builder', label: 'بناء الجُمل', icon: Layers, to: '/student/sentence-builder' },
        { id: 'ielts-atelier', label: 'IELTS', icon: Target, to: '/student/ielts-atelier', requiresPackage: 'ielts' },
        // OWNER-HIDDEN from EVERY nav surface — routes kept in App.jsx (direct-URL reachable):
        //   progress(تقدّمي), reports(التقارير), how-to-earn(كيف تكسب XP),
        //   level-journey(خريطة رحلتك), competition(المسابقة), competition-rules, leaderboard, duels.
        // RULE: if you add/remove an item here, mirror it in drawerSections
        // below — the mobile "More" drawer reads that SEPARATE list, or the item shows on phones.
      ],
    },
    {
      id: 'daily-practice',
      label: 'التدريب اليومي',
      items: [
        { id: 'srs',         label: 'المراجعة اليومية', icon: BookOpenCheck, to: '/student/srs', showBadge: true, badgeSource: 'srs-due' },
        { id: 'hard-words',  label: 'تدريب الكلمات الصعبة', icon: Dumbbell, to: '/student/hard-words', showBadge: true, badgeSource: 'hard-words-count', visibleWhen: 'hard-words-count' },
        { id: 'flashcards',  label: 'المفردات',     icon: FileText,   to: '/student/flashcards' },
        { id: 'course-vocab', label: 'مفردات مقرّراتي', icon: GraduationCap, to: '/student/course-vocab', visibleWhen: 'course-vocab-count' },
        { id: 'spelling-lab', label: 'مختبر الإملاء', icon: PencilLine, to: '/student/spelling-lab' },
        { id: 'phrasebook', label: 'دفتر عباراتي', icon: NotebookPen, to: '/student/phrasebook' },
      ],
    },
    {
      id: 'world',
      label: 'عالم طلاقة',
      items: [
        { id: 'library',     label: 'المكتبة',      icon: BookMarked, to: '/library' },
        { id: 'speaking-hub', label: 'نادي التحدث', icon: MessageCircle, to: '/student/speaking-hub' },
        { id: 'chat',              label: 'المحادثة',            icon: MessageSquare, to: '/chat', showBadge: true, badgeSource: 'chat-unread' },
        // OWNER-HIDDEN (routes kept): leaderboard(لوحة الشرف), duels(المبارزات), competition, competition-rules.
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
      id: 'account',
      label: 'حسابي',
      items: [
        { id: 'profile',     label: 'رحلتي وملفي',   icon: User,       to: '/student/profile' },
      ],
    },
  ],
  /* drawerSections — used by the "More" drawer (MobileDrawer) on phones/tablets.
     MUST stay in sync with `sections` above: an item hidden from the sidebar has
     to be hidden here too, otherwise it still shows on mobile. Routes stay
     registered in App.jsx so the hidden pages remain direct-URL reachable.
     HIDDEN here (matching the sidebar, 2026-06-09): progress(تقدّمي),
     reports(التقارير), how-to-earn(كيف تكسب XP), level-journey(خريطة رحلتك),
     competition(المسابقة), competition-rules(قواعد المسابقة). */
  drawerSections: [
    {
      id: 'journey',
      label: 'رحلة التعلّم',
      items: [
        { id: 'dashboard',    label: 'الرئيسية',    icon: Home,          to: '/student' },
        { id: 'curriculum',   label: 'المنهج',       icon: BookOpen,     to: '/student/curriculum' },
        { id: 'everyday-english', label: 'إنجليزي يومي', icon: Sparkles,  to: '/student/everyday-english' },
        { id: 'sentence-builder', label: 'بناء الجُمل', icon: Layers, to: '/student/sentence-builder' },
        { id: 'ielts-atelier', label: 'IELTS', icon: Target, to: '/student/ielts-atelier', requiresPackage: 'ielts' },
      ],
    },
    {
      id: 'daily-practice',
      label: 'التدريب اليومي',
      items: [
        { id: 'srs',          label: 'المراجعة اليومية', icon: BookOpenCheck, to: '/student/srs', showBadge: true, badgeSource: 'srs-due' },
        { id: 'hard-words',   label: 'تدريب الكلمات الصعبة', icon: Dumbbell, to: '/student/hard-words', showBadge: true, badgeSource: 'hard-words-count', visibleWhen: 'hard-words-count' },
        { id: 'flashcards',   label: 'المفردات',     icon: FileText,     to: '/student/flashcards' },
        { id: 'course-vocab', label: 'مفردات مقرّراتي', icon: GraduationCap, to: '/student/course-vocab', visibleWhen: 'course-vocab-count' },
        { id: 'spelling-lab', label: 'مختبر الإملاء', icon: PencilLine,   to: '/student/spelling-lab' },
        { id: 'phrasebook', label: 'دفتر عباراتي', icon: NotebookPen, to: '/student/phrasebook' },
      ],
    },
    {
      id: 'world',
      label: 'عالم طلاقة',
      items: [
        { id: 'library',      label: 'المكتبة',      icon: BookMarked,   to: '/library' },
        { id: 'speaking-hub', label: 'نادي التحدث', icon: MessageCircle, to: '/student/speaking-hub' },
        { id: 'chat',              label: 'المحادثة',            icon: MessageSquare, to: '/chat', showBadge: true, badgeSource: 'chat-unread' },
      ],
    },
    {
      id: 'account',
      label: 'حسابي',
      items: [
        { id: 'profile',     label: 'رحلتي وملفي',   icon: User,       to: '/student/profile' },
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
    // 2026-06-02 (prompt 09): 'progress' was hidden from the sidebar, so it's replaced here by the
    // new Spelling Lab to keep the 5-slot bar consistent on mobile (primary device). 'progress'
    // stays reachable via the "More" drawer + direct URL.
    { id: 'spelling-lab', label: 'الإملاء',   icon: PencilLine, to: '/student/spelling-lab' },
    { id: 'phrasebook', label: 'دفتر عباراتي', icon: NotebookPen, to: '/student/phrasebook' },
    { id: 'more',        label: 'المزيد',     icon: 'more',     to: null },
  ],
}

/* INDIVIDUAL (1-on-1) students — students.study_mode === 'individual'.
   A deliberately minimal, profession-first nav: their professional track replaces the
   group curriculum, and every group-dependent surface (leaderboards, group widgets,
   curriculum units, SRS tied to curriculum vocab) is absent BY DESIGN, not hidden CSS.
   sections === drawerSections by construction (ONE shared list — no mirror-sync hazard;
   STUDENT_NAV's lists genuinely diverge, these don't). Keep mobileBar in sync manually. */
const INDIVIDUAL_SECTIONS = [
  {
    id: 'learning',
    label: 'التعلّم',
    items: [
      { id: 'dashboard', label: 'الرئيسية', icon: Home, to: '/student' },
      { id: 'track', label: 'مساري المهني', icon: Briefcase, to: '/student/track' },
      { id: 'library', label: 'المكتبة', icon: BookMarked, to: '/library' },
    ],
  },
  {
    id: 'community',
    label: 'المجتمع',
    items: [
      { id: 'chat', label: 'المحادثة', icon: MessageSquare, to: '/chat', showBadge: true, badgeSource: 'chat-unread' },
    ],
  },
  {
    id: 'account',
    label: 'حسابي',
    items: [
      { id: 'profile', label: 'ملفي', icon: User, to: '/student/profile' },
    ],
  },
]

export const INDIVIDUAL_NAV = {
  sections: INDIVIDUAL_SECTIONS,
  drawerSections: INDIVIDUAL_SECTIONS,
  mobileBar: [
    { id: 'dashboard', label: 'الرئيسية', icon: Home, to: '/student' },
    { id: 'track', label: 'مساري', icon: Briefcase, to: '/student/track' },
    { id: 'library', label: 'المكتبة', icon: BookMarked, to: '/library' },
    { id: 'chat', label: 'المحادثة', icon: MessageSquare, to: '/chat', showBadge: true, badgeSource: 'chat-unread' },
    { id: 'more', label: 'المزيد', icon: 'more', to: null },
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

/* ADMIN_NAV — "Operations Bridge" order (2026-07-05): sections mirror how the owner
   actually runs the academy, most-used first. ALL destinations are preserved — this
   is a regroup, never a removal (hide-don't-delete rule). The mobile "More" drawer
   reads `sections` directly (no drawerSections here), so this order IS the drawer. */
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
      label: 'الطلاب والفريق',
      items: [
        { id: 'students',    label: 'الطلاب',       icon: GraduationCap, to: '/admin/users' },
        { id: 'groups',      label: 'المجموعات',    icon: Users,         to: '/admin/groups' },
        { id: 'trainers',    label: 'المدربون',     icon: UserCog,       to: '/admin/trainers' },
        // HR hub (was reachable only by direct URL — Ali couldn't find it, 2026-06-11)
        { id: 'team',        label: 'الموظفون',     icon: Briefcase,     to: '/admin/team' },
        { id: 'coordination', label: 'تنسيق الحصص', icon: CalendarClock, to: '/coordinator' },
      ],
    },
    {
      id: 'finance',
      label: 'المالية والنمو',
      items: [
        { id: 'payments',    label: 'المالية',      icon: CreditCard,    to: '/admin/packages' },
        { id: 'marketing',   label: 'التسويق',      icon: Megaphone,     to: '/admin/announcements' },
        { id: 'affiliates',  label: 'الشركاء',      icon: Handshake,     to: '/admin/affiliates' },
        { id: 'monthly-rewards', label: 'مكافآت الشهر', icon: Gift,      to: '/admin/monthly-rewards' },
      ],
    },
    {
      id: 'curriculum',
      label: 'المنهج والمحتوى',
      items: [
        { id: 'curriculum',  label: 'المنهج',       icon: FileText,      to: '/admin/curriculum' },
        { id: 'content',     label: 'المحتوى',      icon: BookOpen,      to: '/admin/content' },
        { id: 'student-curriculum', label: 'معاينة كطالب', icon: Eye, to: '/admin/student-curriculum' },
        { id: 'interactive-curriculum', label: 'المنهج التفاعلي', icon: Layers, to: '/admin/interactive-curriculum' },
        { id: 'ielts',       label: 'IELTS',         icon: Target,        to: '/admin/curriculum/ielts' },
        { id: 'ielts-atelier-preview',   label: 'معاينة IELTS',  icon: Award,   to: '/admin/ielts-atelier-preview' },
        { id: 'library',     label: 'المكتبة',      icon: BookMarked,    to: '/library' },
      ],
    },
    {
      id: 'community',
      label: 'التواصل والمجتمع',
      items: [
        { id: 'chat',          label: 'المحادثة',      icon: MessageSquare, to: '/chat', showBadge: true, badgeSource: 'chat-unread' },
        { id: 'speaking-hubs', label: 'نادي المحادثة', icon: MessageCircle, to: '/admin/speaking-hubs' },
        { id: 'competition', label: 'المسابقة',  icon: Swords,        to: '/admin/competition' },
      ],
    },
    {
      id: 'system',
      label: 'الجودة والنظام',
      items: [
        { id: 'bug-reports', label: 'بلاغات المشاكل', icon: Bug,           to: '/admin/bug-reports' },
        { id: 'curriculum-quality', label: 'جودة المنهج', icon: ShieldAlert,   to: '/admin/curriculum-quality' },
        { id: 'library-feedback', label: 'آراء المكتبة', icon: Star,        to: '/admin/library-feedback' },
        { id: 'audio-telemetry', label: 'فشل الصوت',    icon: Volume2,       to: '/admin/audio-telemetry' },
        { id: 'system-diagnostics', label: 'تشخيص النظام', icon: Activity,   to: '/admin/system' },
        { id: 'settings',    label: 'الإعدادات',    icon: Settings,      to: '/admin/settings' },
      ],
    },
  ],
  mobileBar: [
    { id: 'dashboard', label: 'الرئيسية', icon: Home,          to: '/admin' },
    { id: 'students',  label: 'الطلاب',   icon: GraduationCap, to: '/admin/users' },
    { id: 'payments',  label: 'المالية',   icon: CreditCard,    to: '/admin/packages' },
    { id: 'reports',   label: 'التقارير',  icon: BarChart3,     to: '/admin/reports' },
    { id: 'more',      label: 'المزيد',    icon: 'more',        to: null },
  ],
}

export const COORDINATOR_NAV = {
  sections: [
    {
      id: 'coordination',
      label: 'التنسيق',
      items: [
        { id: 'week',      label: 'جدول الحصص',      icon: CalendarClock, to: '/coordinator' },
        { id: 'schedules', label: 'المواعيد الثابتة', icon: ClipboardList, to: '/coordinator/schedules' },
      ],
    },
  ],
  drawerSections: [
    {
      id: 'coordination',
      label: 'التنسيق',
      items: [
        { id: 'week',      label: 'جدول الحصص',      icon: CalendarClock, to: '/coordinator' },
        { id: 'schedules', label: 'المواعيد الثابتة', icon: ClipboardList, to: '/coordinator/schedules' },
      ],
    },
  ],
  mobileBar: [
    { id: 'week',      label: 'الجدول',   icon: CalendarClock, to: '/coordinator' },
    { id: 'schedules', label: 'المواعيد', icon: ClipboardList, to: '/coordinator/schedules' },
    { id: 'more',      label: 'المزيد',   icon: 'more',        to: null },
  ],
}

export function getNavForRole(role) {
  if (role === 'trainer') return TRAINER_NAV
  if (role === 'admin') return ADMIN_NAV
  if (role === 'coordinator') return COORDINATOR_NAV
  return STUDENT_NAV
}

/** Account-aware nav: individual (1-on-1) students get INDIVIDUAL_NAV.
    Works under impersonation too — studentData is the swapped student row. */
export function getNavForUser(role, studentData) {
  if ((role === 'student' || !role) && studentData?.study_mode === 'individual') return INDIVIDUAL_NAV
  return getNavForRole(role)
}
