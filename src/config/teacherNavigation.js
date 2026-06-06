// Teacher app navigation — clean 5-item information architecture.
// Replaces the old trainerNavigation.js (TRAINER_NAV_V3 etc.). Arabic-first labels
// rendered directly (no i18n key dependency). Keeps the same /trainer/* URL prefix.
import { LayoutDashboard, Users, ClipboardCheck, BookOpen, Settings } from 'lucide-react'

export const TEACHER_NAV = [
  { id: 'home',       href: '/trainer',            label: 'الرئيسية',        icon: LayoutDashboard, primary: true },
  { id: 'students',   href: '/trainer/students',   label: 'طلابي',           icon: Users },
  { id: 'work',       href: '/trainer/work',       label: 'الأعمال والتقييم', icon: ClipboardCheck, badgeKey: 'pending_grading' },
  { id: 'curriculum', href: '/trainer/curriculum', label: 'المنهج',          icon: BookOpen },
  { id: 'settings',   href: '/trainer/settings',   label: 'الإعدادات',       icon: Settings },
]

// Mobile bottom bar shows the same five (small set — no overflow drawer needed).
export const TEACHER_MOBILE_BAR = TEACHER_NAV
