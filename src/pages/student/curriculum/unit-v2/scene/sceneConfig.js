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
  maktaba: 'مشهد المكتبة',  // أنوار — school librarian
  insight: 'مشهد التحليل',  // يسرا — business analysis
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
// 2026-08-04: «المشهد» removed — that was the retired Scene design's language, and it
// read wrong on the Spread. Every custom unit now has real ribbons (see
// scripts/generate-custom-unit-ribbons.cjs), so this is a safety net for a
// newly-authored unit whose ribbons haven't been generated yet.
export const BEAT_WHY_FALLBACK = {
  reading:    { m: 'اقرأ الموقف الذي ستعيشه في هذه الوحدة.', f: 'اقرئي الموقف الذي ستعيشينه في هذه الوحدة.' },
  vocabulary: { m: 'أتقن الكلمات التي تحتاجها في هذا الموقف.', f: 'أتقني الكلمات التي تحتاجينها في هذا الموقف.' },
  grammar:    { m: 'أتقن الأداة اللغوية التي يقوم عليها هذا الموقف.', f: 'أتقني الأداة اللغوية التي يقوم عليها هذا الموقف.' },
  listening:  { m: 'استمع للطرف الآخر في هذا الموقف — وركّز على ما بين السطور.', f: 'استمعي للطرف الآخر في هذا الموقف — وركّزي على ما بين السطور.' },
  speaking:   { m: 'تحدّث بصوتك في هذا الموقف — هذه ذروة الوحدة.', f: 'تحدّثي بصوتكِ في هذا الموقف — هذه ذروة الوحدة.' },
  writing:    { m: 'اكتب المتابعة التي يرسلها محترف بعد هذا الموقف.', f: 'اكتبي المتابعة التي يرسلها محترف بعد هذا الموقف.' },
}
