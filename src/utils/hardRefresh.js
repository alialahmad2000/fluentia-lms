/**
 * Performs a true hard refresh on a PWA:
 * 1. Unregisters all Service Workers
 * 2. Clears all Cache Storage (network response caches)
 * 3. Reloads the page
 *
 * Preserves: localStorage (auth tokens), IndexedDB, sessionStorage, cookies.
 */
export async function hardRefresh({ onProgress } = {}) {
  // Step 1: Unregister all service workers
  if ('serviceWorker' in navigator) {
    onProgress?.('جاري إلغاء تسجيل خدمة التحديث...')
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((r) => r.unregister()))
    } catch (err) {
      console.error('[hardRefresh] SW unregister failed:', err)
      throw new Error('فشل إلغاء تسجيل خدمة التحديث')
    }
  }

  // Step 2: Clear all caches
  if ('caches' in window) {
    onProgress?.('جاري حذف الذاكرة المؤقتة...')
    try {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((name) => caches.delete(name)))
    } catch (err) {
      console.error('[hardRefresh] Cache clear failed:', err)
      throw new Error('فشل حذف الذاكرة المؤقتة')
    }
  }

  // Step 3: Force reload from network
  onProgress?.('جاري إعادة التحميل...')
  await new Promise((resolve) => setTimeout(resolve, 300))
  window.location.reload()
}
