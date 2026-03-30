import { useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

// ─── Device / Browser detection ─────────────────────────────
function getDevice() {
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

function getBrowser() {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari'
  if (ua.includes('chrome')) return 'chrome'
  if (ua.includes('firefox')) return 'firefox'
  return 'other'
}

// ─── Page title map (Arabic) ────────────────────────────────
const PAGE_TITLES = {
  '/student': 'الرئيسية',
  '/student/curriculum': 'المنهج',
  '/student/assignments': 'الواجبات',
  '/student/weekly-tasks': 'المهام الأسبوعية',
  '/student/schedule': 'الجدول',
  '/student/study-plan': 'خطة الدراسة',
  '/student/recordings': 'التسجيلات',
  '/student/flashcards': 'المفردات',
  '/student/grades': 'الدرجات',
  '/student/conversation': 'المحادثة',
  '/student/ai-chat': 'المساعد الذكي',
  '/student/profile': 'حسابي',
  '/student/group-activity': 'نشاط المجموعة',
  '/student/spelling': 'الإملاء',
  '/student/verbs': 'الأفعال الشاذة',
}

const HEARTBEAT_MS = 60_000  // 1 minute
const FLUSH_MS = 30_000      // 30 seconds

/**
 * Lightweight activity tracker for students.
 * - Creates a session on mount
 * - Heartbeat updates session every 60s
 * - Batches page visits + events, flushes every 30s
 * - Uses sendBeacon on tab close
 */
export default function useActivityTracker() {
  const { profile, impersonation } = useAuthStore()
  const location = useLocation()
  const sessionIdRef = useRef(null)
  const pageVisitBuffer = useRef([])
  const eventBuffer = useRef([])
  const lastPageRef = useRef(null)
  const lastPageTimeRef = useRef(null)
  const heartbeatRef = useRef(null)
  const flushRef = useRef(null)
  const mountedRef = useRef(true)

  const userId = profile?.id
  // Don't track activity during admin impersonation
  const isStudent = profile?.role === 'student' && !impersonation

  // ── Flush buffers to DB — fire-and-forget ────────────────
  const flushBuffers = useCallback(() => {
    if (!sessionIdRef.current) return

    try {
      // Flush page visits
      const visits = pageVisitBuffer.current.splice(0)
      if (visits.length > 0) {
        supabase.from('page_visits').insert(visits).then(() => {}).catch(() => {})
      }

      // Flush events
      const events = eventBuffer.current.splice(0)
      if (events.length > 0) {
        supabase.from('activity_events').insert(events).then(() => {}).catch(() => {})
      }

      // Update session heartbeat + pages count
      supabase
        .from('user_sessions')
        .update({ ended_at: new Date().toISOString(), pages_visited: visits.length })
        .eq('id', sessionIdRef.current)
        .then(() => {}).catch(() => {})
    } catch {
      // analytics must never crash the app
    }
  }, [])

  // ── Create session ────────────────────────────────────────
  useEffect(() => {
    if (!userId || !isStudent) return
    mountedRef.current = true

    async function startSession() {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          device: getDevice(),
          browser: getBrowser(),
        })
        .select('id')
        .single()

      if (error) {
        console.warn('[Tracker] session create error:', error.message)
        return
      }
      if (mountedRef.current && data) {
        sessionIdRef.current = data.id

        // Log login event
        eventBuffer.current.push({
          user_id: userId,
          event_type: 'login',
          event_data: { device: getDevice(), browser: getBrowser() },
        })
      }
    }

    startSession()

    // Heartbeat
    heartbeatRef.current = setInterval(() => {
      if (sessionIdRef.current) {
        supabase
          .from('user_sessions')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', sessionIdRef.current)
          .then(({ error }) => { if (error) console.warn('[Tracker] heartbeat:', error.message) })
      }
    }, HEARTBEAT_MS)

    // Flush timer
    flushRef.current = setInterval(flushBuffers, FLUSH_MS)

    // Tab close — sendBeacon
    function handleBeforeUnload() {
      if (!sessionIdRef.current) return
      const now = new Date().toISOString()

      // Close last page visit
      if (lastPageRef.current && lastPageTimeRef.current) {
        const dur = Math.round((Date.now() - lastPageTimeRef.current) / 1000)
        pageVisitBuffer.current.push({
          session_id: sessionIdRef.current,
          user_id: userId,
          page_path: lastPageRef.current,
          page_title: PAGE_TITLES[lastPageRef.current] || null,
          entered_at: new Date(lastPageTimeRef.current).toISOString(),
          left_at: now,
          duration_seconds: dur,
        })
      }

      // Use sendBeacon for reliable delivery
      const payload = {
        session_update: { id: sessionIdRef.current, ended_at: now },
        page_visits: pageVisitBuffer.current.splice(0),
        events: [
          ...eventBuffer.current.splice(0),
          { user_id: userId, event_type: 'logout', event_data: {} },
        ],
      }

      // Best-effort flush via sendBeacon (POST to RPC endpoint)
      try {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nmjexpuycmqcxuxljier.supabase.co'
        const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        const blob = new Blob([JSON.stringify({
          session_id: sessionIdRef.current,
          ended_at: now,
        })], { type: 'application/json' })
        // sendBeacon is POST-only; the flush function handles the actual DB update
        // This is a best-effort signal — the cleanup useEffect handles the rest
        navigator.sendBeacon?.(`${baseUrl}/rest/v1/rpc/track_session_end?apikey=${apiKey}`, blob)
      } catch {
        // Best effort
      }
    }

    // Visibility change — end session on hidden, resume on visible
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        handleBeforeUnload()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mountedRef.current = false
      clearInterval(heartbeatRef.current)
      clearInterval(flushRef.current)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibility)

      // Final flush
      flushBuffers()

      // End session
      if (sessionIdRef.current) {
        supabase
          .from('user_sessions')
          .update({
            ended_at: new Date().toISOString(),
            duration_minutes: null, // will be computed
          })
          .eq('id', sessionIdRef.current)
          .then(({ error }) => { if (error) console.warn('[Tracker] session end:', error.message) })
      }
    }
  }, [userId, isStudent, flushBuffers])

  // ── Track page changes ────────────────────────────────────
  useEffect(() => {
    if (!userId || !isStudent || !sessionIdRef.current) return
    const path = location.pathname

    // Close previous page visit
    if (lastPageRef.current && lastPageRef.current !== path) {
      const dur = Math.round((Date.now() - (lastPageTimeRef.current || Date.now())) / 1000)
      pageVisitBuffer.current.push({
        session_id: sessionIdRef.current,
        user_id: userId,
        page_path: lastPageRef.current,
        page_title: PAGE_TITLES[lastPageRef.current] || null,
        entered_at: new Date(lastPageTimeRef.current || Date.now()).toISOString(),
        left_at: new Date().toISOString(),
        duration_seconds: dur,
      })
    }

    lastPageRef.current = path
    lastPageTimeRef.current = Date.now()
  }, [location.pathname, userId, isStudent])

  // ── Expose trackEvent ─────────────────────────────────────
  const trackEvent = useCallback((eventType, eventData = {}) => {
    if (!userId || !isStudent) return
    eventBuffer.current.push({
      user_id: userId,
      event_type: eventType,
      event_data: eventData,
    })
  }, [userId, isStudent])

  return { trackEvent }
}
