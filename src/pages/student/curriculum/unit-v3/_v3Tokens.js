// Unit Movements V3 — design tokens
// Per-movement palettes for dark + light themes, motion constants, typography.
// Components consume these constants — never hardcode hex inside JSX.

export const V3_MOVEMENTS = [
  {
    id: 'discover',
    roman: 'I',
    titleAr: 'الاكتشاف',
    titleEn: 'Discover',
    subtitleAr: 'اكتشفي عالم الوحدة',
    activityKeys: ['reading'],
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
    id: 'reflect',
    roman: 'IV',
    titleAr: 'التقييم',
    titleEn: 'Reflect',
    subtitleAr: 'قيّمي رحلتك',
    activityKeys: ['recording'],
    paletteDark: {
      gradientFrom: 'rgba(167, 139, 250, 0.10)',
      gradientTo:   'rgba(167, 139, 250, 0.02)',
      accent:       '#A78BFA',
      accentSoft:   'rgba(167, 139, 250, 0.25)',
      glow:         'rgba(167, 139, 250, 0.22)',
    },
    paletteLight: {
      gradientFrom: 'rgba(124, 58, 237, 0.07)',
      gradientTo:   'rgba(124, 58, 237, 0.01)',
      accent:       '#6D28D9',
      accentSoft:   'rgba(109, 40, 217, 0.18)',
      glow:         'rgba(124, 58, 237, 0.12)',
    },
  },
]

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
