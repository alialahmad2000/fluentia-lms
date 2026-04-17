import { supabase } from '../lib/supabase'

class ActivityTracker {
  constructor() {
    this.sessionId = null
    this.userId = null
    this.heartbeatInterval = null
    this.sessionDbId = null
    this.pagesVisited = 0
    this.lastActivity = Date.now()
    this.isInitialized = false
  }

  // Call once after login
  async init(userId) {
    if (this.isInitialized && this.userId === userId) return

    this.userId = userId
    this.sessionId = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    this.isInitialized = true
    this.pagesVisited = 0
    this.lastActivity = Date.now()

    // Create session record
    const { data, error } = await supabase.from('user_sessions').insert({
      user_id: userId,
      session_id: this.sessionId,
      device: this._getDevice(),
      browser: this._getBrowser(),
      is_active: true,
    }).select('id').single()

    if (data) this.sessionDbId = data.id

    // Immediately stamp profiles.last_active_at so trainer dashboards
    // reflect "this student is online right now" within seconds of login,
    // rather than waiting for the first heartbeat (2 min later).
    try {
      supabase.from('profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', userId)
        .then(() => {}, () => {})
    } catch { /* analytics must never crash */ }

    // Track login event
    this.track('login', { method: 'email' })

    // Start heartbeat (every 30 seconds)
    this._startHeartbeat()

    // Remove any stale listeners before adding (prevents accumulation on re-init)
    document.removeEventListener('visibilitychange', this._handleVisibility)
    window.removeEventListener('beforeunload', this._handleUnload)

    // Track tab visibility changes
    document.addEventListener('visibilitychange', this._handleVisibility)

    // Track before unload
    window.addEventListener('beforeunload', this._handleUnload)
  }

  // Track any event — fire-and-forget, never blocks UI
  track(event, properties = {}) {
    if (!this.userId) return

    this.lastActivity = Date.now()

    try {
      supabase.from('analytics_events').insert({
        user_id: this.userId,
        event,
        properties,
        session_id: this.sessionId,
        page_path: window.location.pathname,
        device: this._getDevice(),
        browser: this._getBrowser(),
      }).then(() => {}).catch(() => {})
    } catch {
      // analytics must never crash the app
    }
  }

  // Track page view — fire-and-forget
  pageView(pagePath, pageTitle) {
    this.pagesVisited++
    this.track('page_view', {
      page: pagePath,
      title: pageTitle,
      page_number: this.pagesVisited,
    })
  }

  // Heartbeat — updates session last_seen_at every 2 minutes (was 30s — too aggressive)
  _startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)

    this.heartbeatInterval = setInterval(() => {
      if (!this.sessionDbId || !this.userId) return
      if (document.hidden) return

      // Only heartbeat if user was active in last 5 minutes
      const inactiveMs = Date.now() - this.lastActivity
      if (inactiveMs > 5 * 60 * 1000) {
        this._endSession().catch(() => {})
        return
      }

      const now = new Date().toISOString()
      try {
        // Update the session record for analytics...
        supabase.from('user_sessions')
          .update({
            last_seen_at: now,
            pages_visited: this.pagesVisited,
            is_active: true,
          })
          .eq('id', this.sessionDbId)
          .then(() => {}).catch(() => {})

        // ...AND update profiles.last_active_at so the trainer dashboard
        // "last active" / "status" widget reflects real activity. This was
        // previously missing — the comment claimed the heartbeat updated it
        // but the code only ever touched user_sessions, so trainer dashboards
        // showed stale/random "last seen X days ago" values.
        if (this.userId) {
          supabase.from('profiles')
            .update({ last_active_at: now })
            .eq('id', this.userId)
            .then(() => {}, () => {})
        }
      } catch {
        // analytics must never crash
      }
    }, 120000)
  }

  // End session
  async _endSession() {
    if (!this.sessionDbId) return

    const { error } = await supabase.from('user_sessions')
      .update({
        ended_at: new Date().toISOString(),
        is_active: false,
        pages_visited: this.pagesVisited,
      })
      .eq('id', this.sessionDbId)

    clearInterval(this.heartbeatInterval)
    this.heartbeatInterval = null
  }

  // Handle tab visibility — only update internal state, no DB writes.
  // Previously tracked tab_hidden/tab_visible events which fired DB writes
  // on every tab switch, causing unnecessary network requests.
  _handleVisibility = () => {
    if (!document.hidden) {
      this.lastActivity = Date.now()
      if (!this.heartbeatInterval) this._startHeartbeat()
    }
  }

  // Handle page unload
  _handleUnload = () => {
    if (this.sessionDbId) {
      // Use sendBeacon for reliability — update session as ended
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL || 'https://nmjexpuycmqcxuxljier.supabase.co'}/rest/v1/user_sessions?id=eq.${this.sessionDbId}`
        const headers = {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          'Prefer': 'return=minimal',
        }
        const body = JSON.stringify({
          ended_at: new Date().toISOString(),
          is_active: false,
          pages_visited: this.pagesVisited,
        })
        // sendBeacon doesn't support PATCH, so fall through to sync
        navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }))
      } catch {
        // Best effort
      }
    }
    this._endSession()
  }

  // Cleanup on logout
  async destroy() {
    this.track('logout')
    await this._endSession()
    document.removeEventListener('visibilitychange', this._handleVisibility)
    window.removeEventListener('beforeunload', this._handleUnload)
    clearInterval(this.heartbeatInterval)
    this.isInitialized = false
    this.userId = null
    this.sessionId = null
    this.sessionDbId = null
  }

  // Utility: detect device
  _getDevice() {
    const ua = navigator.userAgent
    if (/tablet|ipad/i.test(ua)) return 'tablet'
    if (/mobile|iphone|android/i.test(ua)) return 'mobile'
    return 'desktop'
  }

  // Utility: detect browser
  _getBrowser() {
    const ua = navigator.userAgent
    if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'safari'
    if (/chrome/i.test(ua)) return 'chrome'
    if (/firefox/i.test(ua)) return 'firefox'
    if (/edge/i.test(ua)) return 'edge'
    return 'other'
  }

  // Reset activity timer (call on any user interaction)
  touch() {
    this.lastActivity = Date.now()
  }
}

// Singleton export
export const tracker = new ActivityTracker()
