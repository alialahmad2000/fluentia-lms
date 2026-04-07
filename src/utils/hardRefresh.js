/**
 * Performs a true hard refresh on a PWA:
 * 1. Unregisters all Service Workers
 * 2. Clears all Cache Storage (network response caches)
 * 3. Reloads the page
 *
 * Preserves: localStorage (auth tokens), IndexedDB, sessionStorage, cookies.
 */
export async function hardRefresh({ onProgress } = {}) {
  onProgress?.('جاري تحديث التطبيق...')

  // Run SW unregister and cache clear in parallel for speed
  const tasks = []

  if ('serviceWorker' in navigator) {
    tasks.push(
      navigator.serviceWorker.getRegistrations()
        .then(regs => Promise.all(regs.map(r => r.unregister())))
        .catch(err => console.error('[hardRefresh] SW unregister failed:', err))
    )
  }

  if ('caches' in window) {
    tasks.push(
      caches.keys()
        .then(names => Promise.all(names.map(n => caches.delete(n))))
        .catch(err => console.error('[hardRefresh] Cache clear failed:', err))
    )
  }

  await Promise.all(tasks)

  // Reload immediately — no artificial delay
  window.location.reload()
}
