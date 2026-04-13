// Drive stream URL resolver — calls edge function, caches 50min per fileId

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const cache = new Map() // fileId → { url, expiresAt }
const CACHE_TTL = 50 * 60 * 1000 // 50 minutes

export function resolveStreamUrl(fileId, { forceRefresh = false } = {}) {
  if (!fileId) return null

  if (!forceRefresh) {
    const cached = cache.get(fileId)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.url
    }
  }

  // Build the proxy URL — the edge function streams the video
  // Add cache-buster when forcing refresh to avoid browser/CDN cache
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
