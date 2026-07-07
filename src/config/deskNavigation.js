// Pro Desk navigation — a COMPLETELY different sidebar from STUDENT_NAV. This is a
// professional's instrument, not a student's course menu. Rendered by the bespoke
// DeskShell (not the shared Sidebar), so it never touches any other student's nav.
// English-primary (نورة prefers English). `soon: true` items are shown, not yet live.
//
// Order puts the CURRICULUM second (right after Today) so the learning path is obviously
// central — Daily is the habit, Reading is its own clear section.

import { Radar, GraduationCap, Compass, Headset, TrendingUp, NotebookPen, PhoneCall, Languages, Flame, BookOpen } from 'lucide-react'

export const DESK_NAV = [
  { id: 'today',      ar: 'اليوم',            en: 'Today',            icon: Radar,         to: '/desk' },
  { id: 'track',      ar: 'المسار',           en: 'Curriculum',       icon: Compass,       to: '/desk/track' },
  { id: 'daily',      ar: 'يومي',             en: 'Daily',            icon: Flame,         to: '/desk/daily' },
  { id: 'reading',    ar: 'القراءة',          en: 'Reading',          icon: BookOpen,      to: '/desk/reading' },
  { id: 'classes',    ar: 'حصصي',             en: 'My Classes',       icon: GraduationCap, to: '/desk/classes' },
  { id: 'scenarios',  ar: 'السيناريوهات',     en: 'Practice',         icon: Headset,       to: '/desk/scenarios' },
  { id: 'growth',     ar: 'تقدّمي',           en: 'Growth',           icon: TrendingUp,    to: '/desk/growth' },
  { id: 'phrasebank', ar: 'دفتري',            en: 'My Phrasebook',    icon: NotebookPen,   to: '/desk/phrasebank' },
  { id: 'rehearse',   ar: 'تدريب مكالمة',     en: 'Rehearse a call',  icon: PhoneCall,     to: '/desk/rehearse',   soon: true },
  { id: 'sayit',      ar: 'قوليها بالإنجليزي', en: 'Say it in English', icon: Languages,    to: '/desk/say-it',     soon: true },
]
