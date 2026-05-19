/**
 * Remove leading speaker labels from a line of dialogue.
 *
 * Handles:
 *   English:  "Dr. Ali: Hey Mohammed"       → "Hey Mohammed"
 *             "Mohammed: I am good"          → "I am good"
 *             "Speaker A: ..."               → "..."
 *             "Doctor Mohammed Sharbat: ..." → "..."
 *             "[Mohammed]: ..."              → "..."
 *             "(Dr. Ali) Hey there"          → "Hey there"
 *   Arabic:   "د. علي: مرحبا"               → "مرحبا"
 *             "محمد: أنا بخير"               → "أنا بخير"
 *             "الدكتور علي: ..."             → "..."
 *   Mixed:    "Dr. علي: ..."                → "..."
 *
 * Conservative: only strips an obvious leading label followed by ":" or "]".
 * Does NOT strip mid-sentence colons (e.g., "I have three options:")
 * or times (e.g., "3:45 PM").
 */
function stripSpeakerLabel(text) {
  if (!text || typeof text !== 'string') return text
  let s = text

  // 1. Bracketed/parenthesized leading speaker tag: "[Mohammed]:" or "(Dr. Ali)"
  s = s.replace(/^\s*[\[\(][^\]\)]{1,60}[\]\)]\s*[:\-–]?\s*/, '')

  // 2. English label with optional title + 1-3 capitalized name words + colon
  s = s.replace(
    /^\s*(?:Dr\.?|Doctor|Mr\.?|Mrs\.?|Ms\.?|Prof\.?|Professor|Speaker|Person)?\s*[A-Z][A-Za-z\-']{0,30}(?:\s+[A-Z][A-Za-z\-']{0,30}){0,2}\s*:\s*/,
    ''
  )

  // 3. Arabic label: optional title + Arabic name + colon
  s = s.replace(
    /^\s*(?:د\.?|الدكتور|الأستاذ|أ\.?|السيد|السيدة|الآنسة)?\s*[ء-ي]{2,}(?:\s+[ء-ي]{2,}){0,2}\s*:\s*/,
    ''
  )

  return s.trim()
}

module.exports = { stripSpeakerLabel }
