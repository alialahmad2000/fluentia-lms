import { supabase } from './supabase'

const sessionId = (() => {
  try {
    const key = 'fluentia:session_id'
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
    return id
  } catch { return 'unknown' }
})()

function getDevice() {
  const w = window.innerWidth
  return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop'
}

function getBrowser() {
  const ua = navigator.userAgent
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'safari'
  if (/chrome/i.test(ua)) return 'chrome'
  if (/firefox/i.test(ua)) return 'firefox'
  return 'other'
}

export async function trackEvent(event, properties = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('analytics_events').insert({
      user_id: user?.id ?? null,
      event,
      properties,
      session_id: sessionId,
      device: getDevice(),
      browser: getBrowser(),
      page_path: window.location.pathname,
    })
  } catch (err) {
    // Never let analytics break the app
    console.warn('[analytics] failed to track event:', event, err?.message)
  }
}
