// Teacher app navigation.
//
// Trimmed to four for the private-teacher account: this teacher takes one-to-one
// classes, so the group class hub and the grading queue have no meaning for him —
// and the account is read-only by design, which makes a grading surface a dead end.
// Those routes still exist and redirect; nothing was deleted.
import { LayoutDashboard, Users, BookOpen, Settings, Target } from 'lucide-react'

export const TEACHER_NAV = [
  { id: 'home',       href: '/trainer',            label: 'الرئيسية', icon: LayoutDashboard, primary: true },
  { id: 'students',   href: '/trainer/students',   label: 'طلابي',    icon: Users },
  { id: 'curriculum', href: '/trainer/curriculum', label: 'المنهج',   icon: BookOpen },
  // Shown only to teachers who actually have IELTS students (gated in TeacherSidebar
  // via useIELTSRoster). Desktop sidebar only — excluded from the mobile bar below.
  { id: 'ielts',      href: '/trainer/ielts',      label: 'الآيلتس',  icon: Target, requiresIELTS: true },
  { id: 'settings',   href: '/trainer/settings',   label: 'الإعدادات', icon: Settings },
]

// Mobile bottom bar: drop Settings + the gated IELTS item on phones to keep targets comfortable.
export const TEACHER_MOBILE_BAR = TEACHER_NAV.filter((i) => i.id !== 'settings' && i.id !== 'ielts')
