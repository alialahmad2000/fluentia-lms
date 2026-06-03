// Small shared formatters for the vocabulary surfaces.
export const toArabicNum = (n) => String(n ?? 0).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

// Rough "minutes to clear" estimate for a review queue (≈18s/card).
export const estMinutes = (cardCount) => Math.max(1, Math.ceil((cardCount || 0) * 0.3))
