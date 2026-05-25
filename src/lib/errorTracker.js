// Layer 6 (auto-recovery): lightweight client error capture → Supabase.
// Fire-and-forget; never throws, never recurses. Backed by the rate-limited
// log_client_error RPC (migration 20260525010000). app_version comes from the
// existing version marker written by the boot self-heal in main.jsx.

import { supabase } from './supabase'

const SESSION_ID = (() => {
  try {
    const existing = sessionStorage.getItem('_fluentia_session_id')
    if (existing) return existing
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
    sessionStorage.setItem('_fluentia_session_id', id)
    return id
  } catch {
    return 'no-session'
  }
})()

function appVersion() {
  try {
    return (
      localStorage.getItem('fluentia:bundle-version') ||
      localStorage.getItem('app_version') ||
      'unknown'
    )
  } catch {
    return 'unknown'
  }
}

let _recursionGuard = false

/**
 * Log a single client error. Never blocks, never throws.
 * @param {{kind?:string, message?:string, stack?:string, url?:string, context?:object}} p
 */
export function captureError({ kind, message, stack, url, context } = {}) {
  if (_recursionGuard) return
  ;(async () => {
    try {
      _recursionGuard = true
      await supabase.rpc('log_client_error', {
        p_error_kind: kind || 'manual',
        p_message: (message || '').toString().slice(0, 2000),
        p_stack: stack ? String(stack).slice(0, 5000) : null,
        p_url: url || (typeof window !== 'undefined' ? window.location.href : null),
        p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
        p_app_version: appVersion(),
        p_context: context || null,
        p_session_id: SESSION_ID,
      })
    } catch (e) {
      // Never recurse — if logging fails, console only.
      // eslint-disable-next-line no-console
      console.warn('[errorTracker] log failed:', e?.message || e)
    } finally {
      _recursionGuard = false
    }
  })()
}
