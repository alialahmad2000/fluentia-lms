// Pro Desk navigation — a COMPLETELY different sidebar from STUDENT_NAV. This is a
// professional's instrument, not a student's course menu. Rendered by the bespoke
// DeskShell (not the shared Sidebar), so it never touches any other student's nav.
// `soon: true` items are part of the vision (later stages) — shown, but not yet live.

import { Radar, Headset, PhoneCall, Languages, NotebookPen, TrendingUp } from 'lucide-react'

export const DESK_NAV = [
  { id: 'today',      ar: 'اليوم',            en: 'Today',            icon: Radar,      to: '/desk' },
  { id: 'scenarios',  ar: 'السيناريوهات',     en: 'Scenarios',        icon: Headset,    to: '/desk/scenarios' },
  { id: 'rehearse',   ar: 'تدريب مكالمة',     en: 'Rehearse a call',  icon: PhoneCall,  to: '/desk/rehearse',   soon: true },
  { id: 'sayit',      ar: 'قوليها بالإنجليزي', en: 'Say it in English', icon: Languages,  to: '/desk/say-it',     soon: true },
  { id: 'phrasebank', ar: 'دفتري',            en: 'My Phrasebook',    icon: NotebookPen, to: '/desk/phrasebank', soon: true },
  { id: 'growth',     ar: 'تقدّمي',           en: 'Growth',           icon: TrendingUp, to: '/desk/growth',     soon: true },
]
