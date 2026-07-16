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
  Bug, Sparkles, Handshake, Layers, Eye, Star, Cpu,
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
        { id: 'speaking-track', label: 'مسار التحدث', icon: Mic, to: '/student/speaking-track', requiresSpeakingTrack: true },
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
        { id: 'custom-exercises', label: 'تمارين مخصّصة', icon: Target, to: '/student/exercises', visibleWhen: 'targeted-exercises-count' },
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
        { id: 'speaking-track', label: 'مسار التحدث', icon: Mic, to: '/student/speaking-track', requiresSpeakingTrack: true },
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
        { id: 'custom-exercises', label: 'تمارين مخصّصة', icon: Target, to: '/student/exercises', visibleWhen: 'targeted-exercises-count' },
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

// CEFR label per curriculum level_number (== students.academic_level).
const LEVEL_CEFR = { 0: 'Pre-A1', 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1' }

/** For a student granted extra_curriculum_levels, build one sidebar item per level
    she can reach — her current level first («منهج B1»), then each granted revisit
    level («مراجعة A2»). Returns null for everyone else (nav unchanged). */
function buildLevelNavItems(studentData) {
  const cur = studentData?.academic_level
  const extras = Array.isArray(studentData?.extra_curriculum_levels) ? studentData.extra_curriculum_levels : []
  if (cur == null || extras.length === 0) return null
  const uniqExtras = [...new Set(extras.filter((n) => n !== cur))].sort((a, b) => b - a)
  return [cur, ...uniqExtras].map((n) => {
    const isCurrent = n === cur
    const cefr = LEVEL_CEFR[n] || `مستوى ${n}`
    return {
      id: `curriculum-level-${n}`,
      label: isCurrent ? `منهج ${cefr}` : `مراجعة ${cefr}`,
      icon: isCurrent ? BookOpen : BookOpenCheck,
      to: `/student/curriculum/level/${n}`,
    }
  })
}

// Replace the single «المنهج» item with the per-level items in the desktop sidebar
// + the mobile "More" drawer. The mobile bottom bar keeps «المنهج» → the grid (which
// itself shows both levels), so the bar never overflows.
function injectLevelNav(nav, items) {
  const swap = (list) => {
    if (!Array.isArray(list)) return list
    const out = []
    for (const it of list) {
      if (it && it.id === 'curriculum') out.push(...items)
      else out.push(it)
    }
    return out
  }
  return {
    ...nav,
    sections: Array.isArray(nav.sections) ? nav.sections.map((s) => ({ ...s, items: swap(s.items) })) : nav.sections,
    drawerSections: Array.isArray(nav.drawerSections) ? nav.drawerSections.map((s) => ({ ...s, items: swap(s.items) })) : nav.drawerSections,
  }
}

// A student granted the Tech Track (students.uses_tech_track) gets «مسار التقنية»
// injected right after «الرئيسية» in the رحلة التعلّم section — a dedicated major-track
// surface ALONGSIDE her normal curriculum (nothing is replaced).
const TECH_TRACK_ITEM = { id: 'tech-track', label: 'مسار التقنية', icon: Cpu, to: '/tech' }
function injectTechTrack(nav) {
  const addTo = (list) => {
    if (!Array.isArray(list)) return list
    return list.map((sec) => {
      if (sec.id !== 'journey' || !Array.isArray(sec.items)) return sec
      const items = []
      let inserted = false
      for (const it of sec.items) {
        items.push(it)
        if (!inserted && it && it.id === 'dashboard') { items.push(TECH_TRACK_ITEM); inserted = true }
      }
      if (!inserted) items.push(TECH_TRACK_ITEM)
      return { ...sec, items }
    })
  }
  return { ...nav, sections: addTo(nav.sections), drawerSections: addTo(nav.drawerSections) }
}

// A student granted the Business Track (students.uses_biz_track) gets «مسار الأعمال»
// injected right after «الرئيسية» — same pattern as the Tech Track (automotive business,
// finance & business-growth English alongside the normal curriculum).
const BIZ_TRACK_ITEM = { id: 'biz-track', label: 'مسار الأعمال', icon: Briefcase, to: '/biz' }
function injectBizTrack(nav) {
  const addTo = (list) => {
    if (!Array.isArray(list)) return list
    return list.map((sec) => {
      if (sec.id !== 'journey' || !Array.isArray(sec.items)) return sec
      const items = []
      let inserted = false
      for (const it of sec.items) {
        items.push(it)
        if (!inserted && it && it.id === 'dashboard') { items.push(BIZ_TRACK_ITEM); inserted = true }
      }
      if (!inserted) items.push(BIZ_TRACK_ITEM)
      return { ...sec, items }
    })
  }
  return { ...nav, sections: addTo(nav.sections), drawerSections: addTo(nav.drawerSections) }
}

/** Account-aware nav: individual (1-on-1) students get INDIVIDUAL_NAV.
    Students with an extra-curriculum-level grant get per-level sidebar items.
    Students with the Tech Track flag get «مسار التقنية» injected (composes with the above).
    Works under impersonation too — studentData is the swapped student row. */
export function getNavForUser(role, studentData) {
  if ((role === 'student' || !role) && studentData?.study_mode === 'individual') return INDIVIDUAL_NAV
  if (role === 'student' || !role) {
    let nav = STUDENT_NAV
    const levelItems = buildLevelNavItems(studentData)
    if (levelItems) nav = injectLevelNav(nav, levelItems)
    if (studentData?.uses_tech_track === true) nav = injectTechTrack(nav)
    if (studentData?.uses_biz_track === true) nav = injectBizTrack(nav)
    if (nav !== STUDENT_NAV) return nav
  }
  return getNavForRole(role)
}
