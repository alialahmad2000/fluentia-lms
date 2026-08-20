/**
 * Reports a failed sign-in so the backend can alert the owner when the account
 * turns out to be blocked.
 *
 * Fired on EVERY failed sign-in rather than only when the error looks like a ban:
 * Supabase does not reliably distinguish "this account is banned" from "wrong
 * password", so matching on the error string would miss the exact case this
 * exists for. The `blocked-login-alert` edge function asks the database whether
 * the account is genuinely blocked and stays completely silent otherwise, so a
 * plain typo costs one no-op request and nothing else. It also rate-limits
 * itself to one alert per account per 10 minutes.
 *
 * Never throws, never blocks the login UI, and never surfaces anything to the
 * person signing in.
 */
export function reportFailedLogin(email) {
  try {
    const addr = (email || '').trim()
    if (!addr.includes('@')) return

    const base = import.meta.env.VITE_SUPABASE_URL
    if (!base) return

    // Deliberately not awaited — the login form must not wait on telemetry.
    // keepalive lets it survive the navigation that follows a later success.
    fetch(`${base}/functions/v1/blocked-login-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: addr, user_agent: navigator.userAgent }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* an alert must never be able to break signing in */
  }
}
