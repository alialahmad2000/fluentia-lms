/**
 * Derive 1–2 letter initials from a display name.
 * e.g. "فاطمة الشريف" → "فا"  (first + last initial)
 *      "منار"         → "م"
 *      null/""        → "؟"
 */
export function initialsFromDisplayName(name) {
  if (!name) return '؟'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '؟'
  if (parts.length === 1) return parts[0][0]
  return parts[0][0] + parts[parts.length - 1][0]
}

/**
 * Extract just the first name from a full display name.
 * Used for personal greetings (hero section).
 */
export function firstNameFrom(fullName) {
  if (!fullName) return ''
  return fullName.trim().split(/\s+/)[0] || ''
}
