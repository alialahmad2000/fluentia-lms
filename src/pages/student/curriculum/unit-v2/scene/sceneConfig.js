// sceneConfig.js — the narrative arc of a custom-curriculum unit.
// A unit stops being a 6-card checklist and becomes ONE scene lived front-to-back:
// read the situation → the words → the grammar move → hear the other side →
// PERFORM (the capstone climax) → follow up in writing.
//
// The beats map onto the existing ACTIVITY_MAP keys; the underlying skill tabs are
// reused unchanged. This file only defines display order, role labels, and fallbacks.

// The eyebrow label above each scene — profession-adaptive by the student's theme_key,
// so an IT student never sees "Marketing scene". Falls back to the generic «المشهد».
export const SCENE_LABEL = {
  studio: 'مشهد التسويق',   // Malak — marketing
  control: 'مشهد العمل',    // Sara — IT / infrastructure
}
export const sceneLabelFor = (themeKey) => SCENE_LABEL[themeKey] || 'المشهد'

export const SCENE_BEATS = [
  { key: 'reading',    role: 'اقرئي الموقف',       icon: 'BookOpen'  },
  { key: 'vocabulary', role: 'عُدّتكِ',             icon: 'Languages' },
  { key: 'grammar',    role: 'الحركة اللغوية',      icon: 'PenLine'   },
  { key: 'listening',  role: 'اسمعي الطرف الآخر',   icon: 'Headphones'},
  { key: 'speaking',   role: 'أدّي المشهد',         icon: 'Mic', capstone: true },
  { key: 'writing',    role: 'المتابعة',            icon: 'Send'      },
]

// Beats whose completion visually "ignites" the capstone (dormant → glowing).
export const CAPSTONE_PREREQS = ['reading', 'vocabulary', 'grammar', 'listening']

// Per-beat "why" copy used only when the unit has no activity_ribbons entry for that
// skill (listening + writing were added after ribbons were generated). Feminine.
export const BEAT_WHY_FALLBACK = {
  reading:    'اقرئي الموقف الذي ستعيشينه في هذا المشهد.',
  vocabulary: 'أتقني الكلمات التي تحتاجينها في هذا الموقف.',
  grammar:    'أتقني الأداة اللغوية التي يقوم عليها هذا الموقف.',
  listening:  'استمعي للطرف الآخر في هذا الموقف — وركّزي على ما بين السطور.',
  speaking:   'أدّي المشهد بصوتك — هذه ذروة الوحدة.',
  writing:    'اكتبي المتابعة التي يرسلها محترف بعد هذا الموقف.',
}
