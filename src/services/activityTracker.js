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

    // Track login event
    await this.track('login', { method: 'email' })

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

  // Track any event
  async track(event, properties = {}) {
    if (!this.userId) return

    this.lastActivity = Date.now()

    const { error } = await supabase.from('analytics_events').insert({
      user_id: this.userId,
      event,
      properties,
      session_id: this.sessionId,
      page_path: window.location.pathname,
      device: this._getDevice(),
      browser: this._getBrowser(),
    })

    if (error) console.warn('[Tracker] Event error:', error.message)
  }

  // Track page view
  async pageView(pagePath, pageTitle) {
    this.pagesVisited++
    await this.track('page_view', {
      page: pagePath,
      title: pageTitle,
      page_number: this.pagesVisited,
    })
  }

  // Heartbeat — updates session last_seen_at every 30s
  _startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)

    this.heartbeatInterval = setInterval(async () => {
      if (!this.sessionDbId || !this.userId) return

      // Only heartbeat if user was active in last 5 minutes
      const inactiveMs = Date.now() - this.lastActivity
      if (inactiveMs > 5 * 60 * 1000) {
        await this._endSession()
        return
      }

      const now = new Date().toISOString()
      const { error } = await supabase.from('user_sessions')
        .update({
          last_seen_at: now,
          pages_visited: this.pagesVisited,
          is_active: true,
        })
        .eq('id', this.sessionDbId)

      if (error) console.warn('[Tracker] Heartbeat error:', error.message)

      // Also update profile last_active_at
      await supabase.from('profiles')
        .update({ last_active_at: now })
        .eq('id', this.userId)

    }, 30000)
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

  // Handle tab visibility
  _handleVisibility = () => {
    if (document.hidden) {
      this.track('tab_hidden')
    } else {
      this.lastActivity = Date.now()
      this.track('tab_visible')
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
    await this.track('logout')
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
