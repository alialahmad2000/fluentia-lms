// Sanitize text input (prevent XSS in text content)
export function sanitizeText(input) {
  if (typeof input !== 'string') return ''
  return input.trim().slice(0, 5000) // Limit length
}

// Sanitize search query
export function sanitizeSearch(input) {
  if (typeof input !== 'string') return ''
  return input.trim().slice(0, 200)
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
