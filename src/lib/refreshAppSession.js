import { supabase } from './supabase';

/**
 * Full client-side recovery. Equivalent to "delete cookies + reload" but one-tap.
 * Use case: student's app shows stale state (old result, old attempt, missing exam)
 * even after our cache invalidation. This forces a clean slate.
 */
export async function refreshAppSession({ redirectTo = '/login', keepAuth = false } = {}) {
  // keepAuth=true (used by version auto-update): skip signOut so the student
  // gets fresh code without being forced to re-login. The Supabase auth token
  // in IndexedDB survives the cache/SW purge below.
  if (!keepAuth) {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.warn('[refreshAppSession] signOut failed (non-blocking):', e);
    }
  }

  // When keepAuth, preserve the Supabase auth token (stored in localStorage as
  // `sb-<ref>-auth-token`) so a soft version-update doesn't log the student out.
  const isAuthKey = (k) => /^sb-.*-auth-token$/.test(k) || /supabase\.auth/.test(k);
  try {
    if (keepAuth) {
      const preserve = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && isAuthKey(k)) preserve[k] = localStorage.getItem(k);
      }
      localStorage.clear();
      Object.entries(preserve).forEach(([k, v]) => { try { localStorage.setItem(k, v); } catch {} });
    } else {
      localStorage.clear();
    }
  } catch (e) { console.warn('[refreshAppSession] localStorage clear failed', e); }
  try { sessionStorage.clear(); } catch (e) { console.warn('[refreshAppSession] sessionStorage clear failed', e); }

  try {
    // keepAuth: skip IndexedDB wipe entirely — some Supabase configs keep the
    // session there, and PWA persistence isn't worth nuking for a soft update.
    if (!keepAuth && window.indexedDB && indexedDB.databases) {
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

  const sep = redirectTo.includes('?') ? '&' : '?';
  const dest = keepAuth
    ? `${redirectTo}${sep}_v=${Date.now()}`   // soft update — stay where you are
    : `${redirectTo}${sep}_fresh=${Date.now()}`;
  window.location.replace(dest);
}
