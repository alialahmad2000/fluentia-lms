// Sanitize text input (prevent XSS in text content)
// Strips HTML tags so the output is safe for use in dangerouslySetInnerHTML
// or direct injection. For plain text rendering React already escapes, but
// this extra layer is important for any server-side or SSR paths.
export function sanitizeText(input) {
  if (typeof input !== 'string') return ''
  return input
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .trim()
    .slice(0, 5000)
}

// Sanitize search query — also strips HTML tags
export function sanitizeSearch(input) {
  if (typeof input !== 'string') return ''
  return input
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .trim()
    .slice(0, 200)
}

// Validate email format
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Sanitize URL input
export function sanitizeUrl(input) {
  if (typeof input !== 'string') return ''
  try {
    const url = new URL(input)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    return url.toString()
  } catch {
    return ''
  }
}
