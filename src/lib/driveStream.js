// Drive stream URL resolver — calls edge function, caches 50min per fileId

import { supabase } from './supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const cache = new Map() // fileId → { url, expiresAt }
const CACHE_TTL = 50 * 60 * 1000 // 50 minutes

const isDebug = () => typeof localStorage !== 'undefined' && localStorage.getItem('fluentia_debug') === '1'

export async function resolveStreamUrl(fileId, { forceRefresh = false } = {}) {
  if (!fileId) return null

  if (!forceRefresh) {
    const cached = cache.get(fileId)
    if (cached && Date.now() < cached.expiresAt) {
      if (isDebug()) console.log('[driveStream] Cache hit for', fileId)
      return cached.url
    }
  }

  if (isDebug()) console.log('[driveStream] Requesting URL for', fileId, forceRefresh ? '(force refresh)' : '')

  // Get current session token for auth (refresh if near expiry)
  let tokenParam = ''
  try {
    let { data: { session } } = await supabase.auth.getSession()

    // Refresh if token expires in less than 5 minutes (mobile sessions expire when backgrounded)
    if (session) {
      const expiresAt = (session.expires_at || 0) * 1000
      if (expiresAt - Date.now() < 5 * 60 * 1000) {
        if (isDebug()) console.log('[driveStream] Session near expiry, refreshing...')
        const { data: refreshed } = await supabase.auth.refreshSession()
        if (refreshed?.session) {
          session = refreshed.session
          if (isDebug()) console.log('[driveStream] Session refreshed successfully')
        }
      }
    }

    if (session?.access_token) {
      tokenParam = `&token=${session.access_token}`
      if (isDebug()) console.log('[driveStream] Session valid, user:', session.user?.id)
    } else {
      if (isDebug()) console.warn('[driveStream] No session found')
    }
  } catch (e) {
    if (isDebug()) console.error('[driveStream] Session error:', e.message)
  }

  // Build the proxy URL — the edge function streams the video
  // Auth token as query param since <video> can't set Authorization header
  const bustParam = forceRefresh ? `&_t=${Date.now()}` : ''
  const url = `${SUPABASE_URL}/functions/v1/video-proxy?id=${fileId}${tokenParam}${bustParam}`

  if (isDebug()) console.log('[driveStream] Returning proxy URL (first 80):', url.substring(0, 80))

  cache.set(fileId, { url, expiresAt: Date.now() + CACHE_TTL })
  return url
}

// Synchronous version for initial render (uses cache only, no auth fetch)
export function resolveStreamUrlSync(fileId, { forceRefresh = false } = {}) {
  if (!fileId) return null

  if (!forceRefresh) {
    const cached = cache.get(fileId)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.url
    }
  }

  const bustParam = forceRefresh ? `&_t=${Date.now()}` : ''
  const url = `${SUPABASE_URL}/functions/v1/video-proxy?id=${fileId}${bustParam}`

  cache.set(fileId, { url, expiresAt: Date.now() + CACHE_TTL })
  return url
}

export function invalidateStreamUrl(fileId) {
  cache.delete(fileId)
}

export function extractFileId(driveUrl) {
  if (!driveUrl) return null
  const m = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)
    || driveUrl.match(/id=([a-zA-Z0-9_-]+)/)
    || driveUrl.match(/([a-zA-Z0-9_-]{25,})/)
  return m?.[1] || null
}

/**
 * Test if a recording's video stream is reachable.
 * Returns { ok, status, contentType, error }
 */
export async function testStreamUrl(fileId) {
  if (!fileId) return { ok: false, error: 'No file ID' }
  try {
    const url = `${SUPABASE_URL}/functions/v1/video-proxy?id=${fileId}`
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) })
    const ct = res.headers.get('Content-Type') || ''
    const ok = res.ok && (ct.startsWith('video/') || ct === 'application/octet-stream')
    return { ok, status: res.status, contentType: ct, error: ok ? null : `HTTP ${res.status} — ${ct}` }
  } catch (e) {
    return { ok: false, error: e.message || 'Network error' }
  }
}
