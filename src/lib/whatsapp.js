// WhatsApp click-to-chat helpers (no existing helper in the repo).
// Numbers are stored as E.164 digits only (no '+').

// Normalize an arbitrary phone input to E.164 digits (KSA-aware), no '+'.
export function normalizeWhatsApp(input) {
  let d = String(input || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('00')) d = d.slice(2)            // intl prefix 00xxx -> xxx
  if (d.startsWith('0') && d.length === 10) d = '966' + d.slice(1) // 05xxxxxxxx -> 9665xxxxxxxx
  else if (d.length === 9 && d.startsWith('5')) d = '966' + d      // 5xxxxxxxx  -> 9665xxxxxxxx
  return d
}

export function isValidWhatsApp(input) {
  const d = normalizeWhatsApp(input)
  return d.length >= 10 && d.length <= 15
}

// wa.me deep link with an optional pre-filled message.
export function buildWhatsAppUrl(whatsapp, text) {
  const d = normalizeWhatsApp(whatsapp)
  const q = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${d}${q}`
}

// Compact display form for cards (last 4 digits masked-ish).
export function maskWhatsApp(whatsapp) {
  const d = normalizeWhatsApp(whatsapp)
  if (d.length <= 4) return d
  return '••••' + d.slice(-4)
}
