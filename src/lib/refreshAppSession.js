import { supabase } from './supabase';

/**
 * Full client-side recovery. Equivalent to "delete cookies + reload" but one-tap.
 * Use case: student's app shows stale state (old result, old attempt, missing exam)
 * even after our cache invalidation. This forces a clean slate.
 */
export async function refreshAppSession({ redirectTo = '/login' } = {}) {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (e) {
    console.warn('[refreshAppSession] signOut failed (non-blocking):', e);
  }

  try { localStorage.clear(); } catch (e) { console.warn('[refreshAppSession] localStorage clear failed', e); }
  try { sessionStorage.clear(); } catch (e) { console.warn('[refreshAppSession] sessionStorage clear failed', e); }

  try {
    if (window.indexedDB && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(
        (dbs || []).map(db => new Promise(resolve => {
          if (!db?.name) return resolve();
          const req = indexedDB.deleteDatabase(db.name);
          req.onsuccess = req.onerror = req.onblocked = () => resolve();
        }))
      );
    }
  } catch (e) {
    console.warn('[refreshAppSession] IndexedDB clear failed:', e);
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister().catch(() => {})));
    }
  } catch (e) {
    console.warn('[refreshAppSession] SW unregister failed:', e);
  }

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k).catch(() => {})));
    }
  } catch (e) {
    console.warn('[refreshAppSession] caches clear failed:', e);
  }

  const dest = `${redirectTo}?_fresh=${Date.now()}`;
  window.location.replace(dest);
}
