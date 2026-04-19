import {
  LayoutDashboard, Bell, Clapperboard, Zap, FileCheck,
  Users, BookOpen, Trophy, TrendingUp, Sparkles,
} from 'lucide-react'

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
  { id: 'cockpit',       href: '/trainer',               label: 'القيادة', icon: LayoutDashboard },
  { id: 'interventions', href: '/trainer/interventions',  label: 'متابعة', icon: Bell, badgeKey: 'pending_interventions' },
  { id: 'quick-action',  label: 'سريع',                  icon: Zap, floating: true, action: 'quickXp' },
  { id: 'prep',          href: '/trainer/prep',           label: 'تحضير',  icon: Clapperboard },
  { id: 'more',          label: 'المزيد',                 icon: Sparkles,  action: 'openDrawer' },
]
