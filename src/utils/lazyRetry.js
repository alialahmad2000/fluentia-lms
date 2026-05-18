import { lazy } from 'react'

const RELOAD_KEY = 'chunk_reload_at'
const RELOAD_COOLDOWN = 60_000 // 60 seconds — covers Vercel edge propagation delay

// Only reload for chunk-loading failures (stale deployment), not app/syntax errors
function isChunkLoadError(error) {
  if (!error) return false
  const msg = error.message || ''
  if (msg.includes('Failed to fetch dynamically imported module')) return true
  if (msg.includes('error loading dynamically imported module')) return true
  if (msg.includes('Importing a module script failed')) return true // Safari
  if (error.name === 'ChunkLoadError') return true // Webpack fallback
  return false
}

export default function lazyRetry(importFn) {
  return lazy(() =>
    importFn().catch((error) => {
      if (!isChunkLoadError(error)) throw error

      const lastReload = parseInt(sessionStorage.getItem(RELOAD_KEY) || '0', 10)
      const now = Date.now()

      if (now - lastReload > RELOAD_COOLDOWN) {
        sessionStorage.setItem(RELOAD_KEY, now.toString())
        window.location.reload()
        return new Promise(() => {}) // suspend render until reload completes
      }

      throw error // reloaded recently and still failing — let ErrorBoundary handle it
    })
  )
}
