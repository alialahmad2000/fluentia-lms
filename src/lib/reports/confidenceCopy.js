/**
 * LEGENDARY-F: Confidence band copy for progress reports.
 * Maps XP audit confidence_band to user-friendly text.
 */

const COPY = {
  high: {
    ar: 'نقاط الخبرة دقيقة ومؤكّدة.',
    en: 'XP is verified and reliable.',
  },
  medium: {
    ar: 'بعض النقاط قبل ١٥ أبريل ٢٠٢٦ قد تكون نتيجة خطأ تقني سابق (تم إصلاحه). نقاط اليوم دقيقة.',
    en: 'Some XP before April 15, 2026 may reflect a past technical issue (now fixed). Current XP is accurate.',
  },
  low: {
    ar: 'جزء كبير من النقاط التاريخية متأثر بخطأ تقني سابق تم إصلاحه. النقاط من ١٥ أبريل ٢٠٢٦ فصاعداً دقيقة تماماً.',
    en: 'A significant share of historical XP was affected by a now-fixed technical issue. XP from April 15, 2026 onward is fully accurate.',
  },
}

/**
 * Get confidence copy for a band.
 * @param {'high'|'medium'|'low'} band
 * @param {'ar'|'en'} lang
 * @returns {string|null} Copy text, or null if band is 'high' (no footnote needed)
 */
export function getConfidenceCopy(band, lang = 'ar') {
  if (!band || band === 'high' || band === 'no_xp') return null
  return COPY[band]?.[lang] || null
}

/**
 * Whether a confidence footnote should be shown.
 */
export function shouldShowConfidenceNote(band) {
  return band && band !== 'high' && band !== 'no_xp'
}
