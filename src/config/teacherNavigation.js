// Teacher app navigation — clean 5-item information architecture.
// Replaces the old trainerNavigation.js (TRAINER_NAV_V3 etc.). Arabic-first labels
// rendered directly (no i18n key dependency). Keeps the same /trainer/* URL prefix.
import { LayoutDashboard, Users, ClipboardCheck, BookOpen, Settings, GraduationCap, CalendarClock, Target } from 'lucide-react'

export const TEACHER_NAV = [
  { id: 'home',       href: '/trainer',            label: 'الرئيسية',        icon: LayoutDashboard, primary: true },
  { id: 'schedule',   href: '/trainer/schedule',   label: 'جدولي',           icon: CalendarClock },
  { id: 'class',      href: '/trainer/class',      label: 'الكلاس',          icon: GraduationCap },
  { id: 'students',   href: '/trainer/students',   label: 'طلابي',           icon: Users },
  { id: 'ielts',      href: '/trainer/ielts',      label: 'IELTS',           icon: Target, visibleWhen: 'ielts-students' },
  { id: 'work',       href: '/trainer/work',       label: 'الأعمال والتقييم', icon: ClipboardCheck, badgeKey: 'pending_grading' },
  { id: 'curriculum', href: '/trainer/curriculum', label: 'المنهج',          icon: BookOpen },
  { id: 'settings',   href: '/trainer/settings',   label: 'الإعدادات',       icon: Settings },
]

// Mobile bottom bar: 6 items (drop only Settings on phones — Curriculum must
// stay reachable for teachers following lessons from a phone/tablet).
// IELTS is desktop-sidebar-only (grading/review happens on desktop/tablet) — keep the phone bar uncrowded.
export const TEACHER_MOBILE_BAR = TEACHER_NAV.filter((i) => i.id !== 'settings' && i.id !== 'ielts')
