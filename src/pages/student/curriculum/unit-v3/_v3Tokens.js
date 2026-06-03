// Unit Movements V3.1 — design tokens
// Per-movement palettes for dark + light themes, motion constants, typography.
// Components consume these constants — never hardcode hex inside JSX.
//
// V3.1 model (replaces V3's Discover/Master/Express/Reflect):
//   I. The Class    (الفصل)     — Recording + Reading
//   II. Master      (الإتقان)   — Vocabulary, Grammar, Listening
//   III. Express    (التعبير)   — Writing, Speaking
//   IV. The Test    (الاختبار) — Unit Mastery Assessment (sourced via
//                                useUnitMasteryState — empty activityKeys
//                                because exam is NOT in activities[])

export const V3_MOVEMENTS = [
  {
    id: 'the_class',
    roman: 'I',
    titleAr: 'الفصل',
    titleEn: 'The Class',
    subtitleAr: 'ما حدث في الصف',
    activityKeys: ['recording', 'reading'],
    paletteDark: {
      gradientFrom: 'rgba(245, 158, 11, 0.10)',
      gradientTo:   'rgba(245, 158, 11, 0.02)',
      accent:       '#F59E0B',
      accentSoft:   'rgba(245, 158, 11, 0.25)',
      glow:         'rgba(245, 158, 11, 0.22)',
    },
    paletteLight: {
      gradientFrom: 'rgba(245, 158, 11, 0.08)',
      gradientTo:   'rgba(245, 158, 11, 0.01)',
      accent:       '#B45309',
      accentSoft:   'rgba(180, 83, 9, 0.18)',
      glow:         'rgba(245, 158, 11, 0.14)',
    },
  },
  {
    id: 'master',
    roman: 'II',
    titleAr: 'الإتقان',
    titleEn: 'Master',
    subtitleAr: 'أتقني الأنماط',
    activityKeys: ['vocabulary', 'grammar', 'listening'],
    paletteDark: {
      gradientFrom: 'rgba(56, 189, 248, 0.10)',
      gradientTo:   'rgba(56, 189, 248, 0.02)',
      accent:       '#38BDF8',
      accentSoft:   'rgba(56, 189, 248, 0.25)',
      glow:         'rgba(56, 189, 248, 0.22)',
    },
    paletteLight: {
      gradientFrom: 'rgba(14, 165, 233, 0.08)',
      gradientTo:   'rgba(14, 165, 233, 0.01)',
      accent:       '#0369A1',
      accentSoft:   'rgba(3, 105, 161, 0.18)',
      glow:         'rgba(14, 165, 233, 0.14)',
    },
  },
  {
    id: 'express',
    roman: 'III',
    titleAr: 'التعبير',
    titleEn: 'Express',
    subtitleAr: 'عبّري عن نفسك',
    activityKeys: ['writing', 'speaking'],
    paletteDark: {
      gradientFrom: 'rgba(244, 114, 182, 0.10)',
      gradientTo:   'rgba(244, 114, 182, 0.02)',
      accent:       '#F472B6',
      accentSoft:   'rgba(244, 114, 182, 0.25)',
      glow:         'rgba(244, 114, 182, 0.22)',
    },
    paletteLight: {
      gradientFrom: 'rgba(219, 39, 119, 0.07)',
      gradientTo:   'rgba(219, 39, 119, 0.01)',
      accent:       '#BE185D',
      accentSoft:   'rgba(190, 24, 93, 0.18)',
      glow:         'rgba(219, 39, 119, 0.12)',
    },
  },
  {
    id: 'the_test',
    roman: 'IV',
    titleAr: 'الاختبار',
    titleEn: 'The Test',
    subtitleAr: 'أثبتي ما تعلّمتِ',
    activityKeys: [],              // exam not in activities[] — sourced via useUnitMasteryState
    isExamGate: true,
    paletteDark: {
      gradientFrom: 'rgba(42, 27, 46, 0.95)',   // deep velvet
      gradientTo:   'rgba(16, 10, 20, 0.98)',
      accent:       '#F5C842',                    // gold (ready state)
      accentLocked: '#7A6A4A',                    // muted gold (locked state)
      glow:         'rgba(245, 200, 66, 0.22)',
      borderGold:   'rgba(245, 200, 66, 0.45)',
    },
    paletteLight: {
      gradientFrom: 'rgba(74, 47, 79, 0.92)',   // deep aubergine
      gradientTo:   'rgba(46, 29, 50, 0.96)',
      accent:       '#D4A017',
      accentLocked: '#8C7A4A',
      glow:         'rgba(212, 160, 23, 0.18)',
      borderGold:   'rgba(212, 160, 23, 0.55)',
    },
  },
]

export const V3_EXAM_GATE = {
  // Default unlock threshold for display. The actual per-assessment threshold
  // comes from unit_mastery_assessments.unlock_threshold_percent via
  // useUnitMasteryState. This constant is a fallback for display only.
  unlockThresholdDefault: 0.70,
  // Strings below are the FEMALE-toned defaults (the academy is mostly women).
  // For gender-aware copy at render time, use getV3ExamGateText(g) instead — it
  // returns the same shape with the gendered fields resolved via g(male, female).
  lockedMessageAr: 'أكملي 70٪ من أنشطة الوحدة ليُفتح الاختبار',
  readyMessageAr: 'الاختبار جاهز — ابدئي حين تشائين',
  readyButtonAr: 'ابدئي اختبار الوحدة',
  passedMessageAr: 'وحدة مُتقَنة',
  cooldownMessageAr: 'انتظري دقائق قليلة قبل المحاولة التالية',
  lockedOutMessageAr: 'بلغتِ الحد الأقصى للمحاولات — حاولي بعد قليل',
  passedCoolingMessageAr: 'نجحتِ — يمكنكِ المراجعة قريبًا',
  retakeAvailableMessageAr: 'إعادة الاختبار متاحة',
  noAssessmentMessageAr: 'لا يوجد اختبار لهذه الوحدة بعد',
}

// Gender-aware exam-gate copy. Pass a g(male, female) picker (from useG).
// Only the fields with an explicit feminine marker differ by gender; the rest
// are returned verbatim from V3_EXAM_GATE.
export function getV3ExamGateText(g) {
  return {
    ...V3_EXAM_GATE,
    lockedMessageAr: g('أكمل 70٪ من أنشطة الوحدة ليُفتح الاختبار', 'أكملي 70٪ من أنشطة الوحدة ليُفتح الاختبار'),
    readyMessageAr: g('الاختبار جاهز — ابدأ حين تشاء', 'الاختبار جاهز — ابدئي حين تشائين'),
    readyButtonAr: g('ابدأ اختبار الوحدة', 'ابدئي اختبار الوحدة'),
    cooldownMessageAr: g('انتظر دقائق قليلة قبل المحاولة التالية', 'انتظري دقائق قليلة قبل المحاولة التالية'),
    lockedOutMessageAr: g('بلغت الحد الأقصى للمحاولات — حاول بعد قليل', 'بلغتِ الحد الأقصى للمحاولات — حاولي بعد قليل'),
    passedCoolingMessageAr: g('نجحت — يمكنك المراجعة قريبًا', 'نجحتِ — يمكنكِ المراجعة قريبًا'),
  }
}

export const V3_MOTION = {
  panelFadeIn:   { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  staggerDelay:  0.08,
  compassDraw:   { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
  pulsePeriodMs: 2400,
  reducedMotionFallback: { duration: 0 },
}

export const V3_TYPOGRAPHY = {
  romanFont:         "'Playfair Display', 'Cormorant Garamond', serif",
  arabicHeadingFont: "'Readex Pro', 'Tajawal', 'Amiri', sans-serif",
  arabicBodyFont:    "'Readex Pro', 'Tajawal', sans-serif",
}

export function resolvePalette(movement, theme) {
  return theme === 'light' ? movement.paletteLight : movement.paletteDark
}

// Gender-aware movement subtitle. The subtitleAr stored on V3_MOVEMENTS is the
// FEMALE form; for movements whose subtitle carries a feminine marker, this
// returns the form matching the student via g(male, female). Pass useG()'s g.
const V3_MOVEMENT_SUBTITLE_MALE = {
  master:   'أتقن الأنماط',
  express:  'عبّر عن نفسك',
  the_test: 'أثبت ما تعلّمت',
}
export function getMovementSubtitle(movement, g) {
  if (!movement) return ''
  const male = V3_MOVEMENT_SUBTITLE_MALE[movement.id]
  return male ? g(male, movement.subtitleAr) : movement.subtitleAr
}
