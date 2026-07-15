// Pro Desk navigation — a professional's instrument, not a course menu. Rendered by the
// bespoke DeskShell (never touches any other student's nav). English-primary.
//
// Decluttered to FOUR clear destinations so the account reads as ONE guided program,
// not a pile of tabs:
//   Today   — what to do right now (next step + today's session)
//   My Plan — the 4-stage journey (the curriculum, sequenced)
//   Practice— rehearse a real call (apply it live)
//   Review  — the reinforce hub (daily habit · reading · classes · growth · phrasebook)
// The folded surfaces keep their routes (reachable from Review) — nothing was removed.
import { Radar, Compass, Headset, Layers, PhoneCall, Languages } from 'lucide-react'

export const DESK_NAV = [
  { id: 'today',     ar: 'اليوم',            en: 'Today',            icon: Radar,   to: '/desk' },
  { id: 'track',     ar: 'خطتي',             en: 'My Plan',          icon: Compass, to: '/desk/track' },
  { id: 'scenarios', ar: 'التطبيق',          en: 'Practice',         icon: Headset, to: '/desk/scenarios' },
  { id: 'review',    ar: 'المراجعة',         en: 'Review',           icon: Layers,  to: '/desk/review' },
  { id: 'rehearse',  ar: 'تدريب مكالمة',     en: 'Rehearse a call',  icon: PhoneCall, to: '/desk/rehearse', soon: true },
  { id: 'sayit',     ar: 'قوليها بالإنجليزي', en: 'Say it in English', icon: Languages, to: '/desk/say-it',  soon: true },
]
