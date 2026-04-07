import { lazy } from 'react'

const RELOAD_KEY = 'chunk_reload_at'
const RELOAD_COOLDOWN = 30_000 // 30 seconds — don't reload again within this window

export default function lazyRetry(importFn) {
  return lazy(() =>
    importFn().catch((error) => {
      // If chunk load fails (stale deployment), reload the page once
      const lastReload = parseInt(sessionStorage.getItem(RELOAD_KEY) || '0', 10)
      const now = Date.now()

      if (now - lastReload > RELOAD_COOLDOWN) {
        sessionStorage.setItem(RELOAD_KEY, now.toString())
        window.location.reload()
        // Return a never-resolving promise to prevent render during reload
        return new Promise(() => {})
      }

      // Already reloaded recently and still failing — don't loop, just throw
      throw error
    })
  )
}
