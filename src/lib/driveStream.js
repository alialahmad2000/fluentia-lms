// Drive stream URL resolver — calls edge function, caches 50min per fileId

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const cache = new Map() // fileId → { url, expiresAt }
const CACHE_TTL = 50 * 60 * 1000 // 50 minutes

export function resolveStreamUrl(fileId) {
  if (!fileId) return null

  const cached = cache.get(fileId)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url
  }

  // Build the proxy URL — the edge function streams the video
  const url = `${SUPABASE_URL}/functions/v1/video-proxy?id=${fileId}`

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
