/**
 * Performs a true hard refresh on a PWA:
 * 1. Reloads the page INSTANTLY (no waiting)
 * 2. Clears caches + unregisters SW in parallel (non-blocking)
 *
 * Preserves: localStorage (auth tokens), IndexedDB, sessionStorage, cookies.
 */
export function hardRefresh() {
  // Fire-and-forget: clear caches and unregister SW in background
  // These don't need to finish before the reload — the browser will
  // re-fetch everything fresh because we're doing a hard reload
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => regs.forEach(r => r.unregister()))
        .catch(() => {})
    }
    if ('caches' in window) {
      caches.keys()
        .then(names => names.forEach(n => caches.delete(n)))
        .catch(() => {})
    }
  } catch {}

  // Reload immediately — don't wait for anything
  window.location.reload()
}
