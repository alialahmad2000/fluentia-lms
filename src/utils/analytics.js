import { supabase } from '../lib/supabase'

// Detect device type
function getDevice() {
  const ua = navigator.userAgent
  if (/Mobi|Android/i.test(ua)) return 'mobile'
  if (/Tablet|iPad/i.test(ua)) return 'tablet'
  return 'desktop'
}

// Detect browser
function getBrowser() {
  const ua = navigator.userAgent
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'safari'
  if (/Chrome/i.test(ua)) return 'chrome'
  if (/Firefox/i.test(ua)) return 'firefox'
  return 'other'
}

// Get or create session ID
function getSessionId() {
  let sid = sessionStorage.getItem('fluentia_session')
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem('fluentia_session', sid)
  }
  return sid
}

// Track an analytics event — fire and forget, never block UI
export function trackEvent(event, properties = {}) {
  try {
    supabase.from('analytics_events').insert({
      event,
      properties,
      session_id: getSessionId(),
      device: getDevice(),
      browser: getBrowser(),
    }).then(() => {}) // fire and forget
  } catch {
    // Never let analytics break the app
  }
}

// Common event helpers
export const track = {
  pageView: (page) => trackEvent('page_view', { page }),
  login: () => trackEvent('login'),
  assignmentSubmit: (type) => trackEvent('assignment_submit', { assignment_type: type }),
  voiceRecordStart: () => trackEvent('voice_record_start'),
  voiceRecordComplete: (duration) => trackEvent('voice_record_complete', { duration_seconds: duration }),
  shareClick: (platform, type) => trackEvent('share_click', { platform, type }),
  paymentLinkClick: () => trackEvent('payment_link_click'),
}
