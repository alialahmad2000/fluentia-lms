import {
  LayoutDashboard, Bell, Clapperboard, Zap, FileCheck,
  Users, BookOpen, Trophy, TrendingUp, Sparkles,
} from 'lucide-react'

export const TRAINER_NAV_V3 = [
  {
    section: 'main',
    label: null,
    items: [
      { id: 'cockpit',    href: '/trainer',            label: 'غرفة القيادة',   icon: LayoutDashboard, primary: true },
      { id: 'grading',    href: '/trainer/grading',    label: 'محطة التصحيح',  icon: FileCheck,       badgeKey: 'pending_grading' },
      { id: 'students',   href: '/trainer/students',   label: 'ملفات الطلاب',  icon: Users },
      { id: 'curriculum', href: '/trainer/curriculum', label: 'المنهج',         icon: BookOpen },
      { id: 'help',       href: '/trainer/help',       label: 'مساعدة',         icon: Sparkles },
    ],
  },
]

export const TRAINER_NAV_V2 = [
  {
    section: 'command',
    label: 'القيادة',
    items: [
      { id: 'cockpit',       href: '/trainer',               label: 'غرفة القيادة',   icon: LayoutDashboard, primary: true },
      { id: 'interventions', href: '/trainer/interventions',  label: 'قائمة المتابعة', icon: Bell,            badgeKey: 'pending_interventions' },
      { id: 'class-prep',    href: '/trainer/prep',           label: 'تحضير الكلاس',  icon: Clapperboard },
      { id: 'live-class',    href: '/trainer/live',           label: 'الكلاس المباشر', icon: Zap },
      { id: 'grading',       href: '/trainer/grading',        label: 'محطة التصحيح',  icon: FileCheck,       badgeKey: 'pending_grading' },
    ],
  },
  {
    section: 'students',
    label: 'الطلاب',
    items: [
      { id: 'students',   href: '/trainer/students',   label: 'ملفات الطلاب', icon: Users },
      { id: 'curriculum', href: '/trainer/curriculum', label: 'المنهج',       icon: BookOpen },
      { id: 'competition',href: '/trainer/competition',label: 'المسابقة',     icon: Trophy, badgeKey: 'pending_recognitions' },
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
  { id: 'cockpit',    href: '/trainer',            label: 'القيادة',  icon: LayoutDashboard },
  { id: 'grading',   href: '/trainer/grading',    label: 'التصحيح', icon: FileCheck, badgeKey: 'pending_grading' },
  { id: 'students',  href: '/trainer/students',   label: 'الطلاب',  icon: Users },
  { id: 'curriculum',href: '/trainer/curriculum', label: 'المنهج',  icon: BookOpen },
  { id: 'help',      href: '/trainer/help',       label: 'مساعدة',  icon: Sparkles },
]
