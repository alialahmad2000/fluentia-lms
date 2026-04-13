const REF_COOKIE = 'flu_ref'
const VISITOR_COOKIE = 'flu_vid'
const COOKIE_DAYS = 30
const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co'

export function getVisitorId() {
  let v = localStorage.getItem(VISITOR_COOKIE)
  if (!v) {
    v = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(VISITOR_COOKIE, v)
  }
  return v
}

function setCookie(name, value, days) {
  const d = new Date()
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`
}

function getCookie(name) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? m[2] : null
}

export function getStoredRef() {
  const c = getCookie(REF_COOKIE)
  if (c) return c
  const ls = localStorage.getItem(REF_COOKIE)
  if (!ls) return null
  try {
    const { code, at } = JSON.parse(ls)
    if (Date.now() - at > COOKIE_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(REF_COOKIE)
      return null
    }
    return code
  } catch { return null }
}

export function captureRefFromUrl() {
  const params = new URLSearchParams(window.location.search)
  const ref = params.get('ref')
  if (!ref) return getStoredRef()
  const cleanRef = ref.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)
  if (!cleanRef) return getStoredRef()

  const existing = getStoredRef()
  if (existing) return existing

  setCookie(REF_COOKIE, cleanRef, COOKIE_DAYS)
  localStorage.setItem(REF_COOKIE, JSON.stringify({ code: cleanRef, at: Date.now() }))

  fireClickTracker(cleanRef)
  return cleanRef
}

async function fireClickTracker(refCode) {
  try {
    const p = new URLSearchParams(window.location.search)
    await fetch(`${SUPABASE_URL}/functions/v1/track-click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ref_code: refCode,
        landing_url: window.location.href,
        referrer: document.referrer || null,
        utm_source: p.get('utm_source'),
        utm_medium: p.get('utm_medium'),
        utm_campaign: p.get('utm_campaign'),
        visitor_id: getVisitorId(),
      }),
    })
  } catch (e) { /* silent */ }
}
