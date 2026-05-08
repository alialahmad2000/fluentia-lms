import {
  LayoutDashboard, Bell, Clapperboard, Zap, FileCheck,
  Users, BookOpen, Trophy, TrendingUp, Sparkles, Settings,
} from 'lucide-react'

export const TRAINER_NAV_V3 = [
  {
    section: 'main',
    label: null,
    items: [
      { id: 'cockpit',    href: '/trainer',             labelKey: 'nav.trainer.cockpit',    icon: LayoutDashboard, primary: true },
      { id: 'grading',    href: '/trainer/grading',     labelKey: 'nav.trainer.grading',    icon: FileCheck,       badgeKey: 'pending_grading' },
      { id: 'students',   href: '/trainer/students',    labelKey: 'nav.trainer.students',   icon: Users },
      { id: 'curriculum', href: '/trainer/interactive-curriculum',  labelKey: 'nav.trainer.curriculum', icon: BookOpen },
      { id: 'help',       href: '/trainer/help',        labelKey: 'nav.trainer.help',       icon: Sparkles },
      { id: 'settings',   href: '/trainer/settings',    labelKey: 'nav.trainer.settings',   icon: Settings },
    ],
  },
]

export const TRAINER_NAV_V2 = [
  {
    section: 'command',
    label: 'القيادة',
    items: [
      { id: 'cockpit',       href: '/trainer',               labelKey: 'nav.trainer.cockpit',  icon: LayoutDashboard, primary: true },
      { id: 'interventions', href: '/trainer/interventions',  label: 'قائمة المتابعة',          icon: Bell,            badgeKey: 'pending_interventions' },
      { id: 'class-prep',    href: '/trainer/prep',           label: 'تحضير الكلاس',            icon: Clapperboard },
      { id: 'live-class',    href: '/trainer/live',           label: 'الكلاس المباشر',           icon: Zap },
      { id: 'grading',       href: '/trainer/grading',        labelKey: 'nav.trainer.grading',  icon: FileCheck,       badgeKey: 'pending_grading' },
    ],
  },
  {
    section: 'students',
    label: 'الطلاب',
    items: [
      { id: 'students',   href: '/trainer/students',   labelKey: 'nav.trainer.students',   icon: Users },
      { id: 'curriculum', href: '/trainer/curriculum', labelKey: 'nav.trainer.curriculum', icon: BookOpen },
      { id: 'competition',href: '/trainer/competition',label: 'المسابقة',                  icon: Trophy, badgeKey: 'pending_recognitions' },
    ],
  },
  {
    section: 'growth',
    label: 'نموّي',
    items: [
      { id: 'my-growth', href: '/trainer/my-growth', label: 'نموّي', icon: TrendingUp },
      { id: 'nabih',     href: '/trainer/nabih',     label: 'نبيه',  icon: Sparkles, special: 'gold' },
    ],
  },
]

export const TRAINER_MOBILE_BAR = [
  { id: 'cockpit',    href: '/trainer',            labelKey: 'nav.trainer.cockpit',    icon: LayoutDashboard },
  { id: 'grading',   href: '/trainer/grading',    labelKey: 'nav.trainer.grading',    icon: FileCheck, badgeKey: 'pending_grading' },
  { id: 'students',  href: '/trainer/students',   labelKey: 'nav.trainer.students',   icon: Users },
  { id: 'curriculum',href: '/trainer/curriculum', labelKey: 'nav.trainer.curriculum', icon: BookOpen },
  { id: 'help',      href: '/trainer/help',       labelKey: 'nav.trainer.help',       icon: Sparkles },
]
