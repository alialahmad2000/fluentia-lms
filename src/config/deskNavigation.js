// Pro Desk navigation — a COMPLETELY different sidebar from STUDENT_NAV. This is a
// professional's instrument, not a student's course menu. Rendered by the bespoke
// DeskShell (not the shared Sidebar), so it never touches any other student's nav.
// `soon: true` items are part of the vision (later stages) — shown, but not yet live.

import { Radar, Headset, PhoneCall, Languages, NotebookPen, TrendingUp, Compass, GraduationCap } from 'lucide-react'

export const DESK_NAV = [
  { id: 'today',      ar: 'اليوم',            en: 'Today',            icon: Radar,       to: '/desk' },
  { id: 'classes',    ar: 'حصصي',             en: 'My Classes',       icon: GraduationCap, to: '/desk/classes' },
  { id: 'track',      ar: 'المسار',           en: 'Track',            icon: Compass,     to: '/desk/track' },
  { id: 'scenarios',  ar: 'السيناريوهات',     en: 'Scenarios',        icon: Headset,     to: '/desk/scenarios' },
  { id: 'growth',     ar: 'تقدّمي',           en: 'Growth',           icon: TrendingUp,  to: '/desk/growth' },
  { id: 'phrasebank', ar: 'دفتري',            en: 'My Phrasebook',    icon: NotebookPen, to: '/desk/phrasebank' },
  { id: 'rehearse',   ar: 'تدريب مكالمة',     en: 'Rehearse a call',  icon: PhoneCall,   to: '/desk/rehearse',   soon: true },
  { id: 'sayit',      ar: 'قوليها بالإنجليزي', en: 'Say it in English', icon: Languages,   to: '/desk/say-it',     soon: true },
]
