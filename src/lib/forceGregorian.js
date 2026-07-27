/**
 * Force the GREGORIAN calendar for every date rendered on the platform.
 *
 * The `ar-SA` locale (and a Saudi-set device's default locale) resolves to the
 * Islamic / Hijri calendar in Intl — so `date.toLocaleDateString('ar-SA', …)`
 * prints e.g. «١٤ صفر ١٤٤٨ هـ». Ali's rule (2026-07-27): the WHOLE platform shows
 * Gregorian dates, always. Rather than touch 130+ call sites (and every future
 * one), this patches Intl.DateTimeFormat + Date.prototype.toLocale*String ONCE at
 * boot to inject `calendar: 'gregory'` whenever the caller didn't ask for a
 * specific calendar. Arabic language + Arabic-Indic digits are preserved — only
 * the calendar system changes (صفر ١٤٤٨ هـ → يوليو ٢٠٢٦).
 *
 * Imported first in main.jsx so it runs before any component formats a date.
 */
if (typeof Intl !== 'undefined' && !Intl.__gregorianForced) {
  Intl.__gregorianForced = true

  // Add calendar:'gregory' unless the caller explicitly set a calendar. Non-Gregorian
  // locales become Gregorian; already-Gregorian locales (en-*, ar) are unaffected.
  const forceGregory = (locale, options) => {
    if (options && options.calendar) return [locale, options]
    return [locale, { ...(options || {}), calendar: 'gregory' }]
  }

  const OrigDTF = Intl.DateTimeFormat
  const PatchedDTF = function DateTimeFormat(locale, options) {
    const [l, o] = forceGregory(locale, options)
    return new OrigDTF(l, o) // returns a real OrigDTF instance (works with/without `new`)
  }
  PatchedDTF.prototype = OrigDTF.prototype
  PatchedDTF.supportedLocalesOf = (...args) => OrigDTF.supportedLocalesOf(...args)
  Intl.DateTimeFormat = PatchedDTF

  for (const method of ['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString']) {
    const orig = Date.prototype[method]
    if (typeof orig !== 'function') continue
    Date.prototype[method] = function (locale, options) {
      const [l, o] = forceGregory(locale, options)
      return orig.call(this, l, o)
    }
  }
}
