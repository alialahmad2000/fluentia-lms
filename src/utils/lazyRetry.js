import { lazy } from 'react'

export default function lazyRetry(importFn) {
  return lazy(() =>
    importFn().catch((error) => {
      // If chunk load fails (stale deployment), reload the page once
      const hasReloaded = sessionStorage.getItem('chunk_reload')
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload', 'true')
        window.location.reload()
        // Return a never-resolving promise to prevent render during reload
        return new Promise(() => {})
      }
      // If already reloaded once and still failing, clear flag and throw
      sessionStorage.removeItem('chunk_reload')
      throw error
    })
  )
}
