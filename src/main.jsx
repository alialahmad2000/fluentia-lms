import './i18n'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import App from './App'
import './index.css'
import './styles/z-index.css'
import './design-system/trainer-themes.css'
import './design-system/trainer/trainer-primitives.css'
import { queryClient } from './lib/queryClient'
import { AccessibilityProvider } from './contexts/AccessibilityContext'
import { captureRefFromUrl } from './utils/affiliateTracking'
import { captureError } from './lib/errorTracker'

const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'fluentia-query-cache-v1',
  throttleTime: 1000,
})

const persistOptions = {
  persister,
  maxAge: 1000 * 60 * 60 * 24,  // 24h max age in localStorage
  buster: 'v1',                  // bump to invalidate all cached data on breaking deploys
  dehydrateOptions: {
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' &&
      !query.queryKey.includes('no-persist'),
  },
}

// Capture affiliate ref code from URL on app load
captureRefFromUrl()

// ─── PERSONALIZATION-KILL-SWITCH 2026-05-19 ───────────────────────────────
// Purge any stale client-side personalization state from sessions that
// predated the canonical-only revert. Idempotent; runs once per page load.
// The app_config.personalization_enabled flag is the canonical source of
// truth; this purge is belt-and-suspenders so a cached value can't override
// the flag for a returning student.
try {
  const STALE_KEY_PATTERNS = [
    /^fluentia[:_.]?variant/i,
    /^fluentia[:_.]?personali/i,
    /^fluentia[:_.]?interest/i,
    /^fluentia[:_.]?selectedVariant/i,
    /^selectedVariantId$/i,
    /^personalizationEnabled$/i,
  ]
  const wipe = (storage) => {
    if (!storage) return
    const keysToRemove = []
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i)
      if (k && STALE_KEY_PATTERNS.some(re => re.test(k))) keysToRemove.push(k)
    }
    keysToRemove.forEach(k => storage.removeItem(k))
  }
  wipe(window.localStorage)
  wipe(window.sessionStorage)
} catch (e) {
  console.warn('[personalization-purge] cleanup error', e)
}

// Discard any cached React Query results from personalization hooks so a
// returning student doesn't briefly see a stale variant from the persisted
// query cache before the kill-switch resolves.
try {
  queryClient.removeQueries({ queryKey: ['personalized-reading'] })
  queryClient.removeQueries({ queryKey: ['user-interests'] })
} catch {
  // queryClient may not be fully initialized yet — non-fatal
}


// ─── SELF-HEAL 2026-05-20 ─────────────────────────────────────────────────
// Some student devices have a stuck service-worker cache that keeps serving
// an old bundle long after a new deploy is live. On every app boot, compare
// version.json (origin) to a localStorage marker. On mismatch: clear caches,
// unregister SWs, hard reload — but ONLY once per session (sessionStorage
// guard) so a deploy that still mismatches after reload cannot loop the
// device. No visibilitychange listener (loop risk). Boot-only is sufficient.
;(async function selfHealStaleClient() {
  try {
    // The version THIS bundle was built as (embedded at build time). Compared to
    // the deployed /version.json. If they differ, the device is running stale
    // code (a stubborn SW/CDN cache) → clear caches, unregister SWs, hard reload.
    // This is reliable because it knows the running version directly — no fragile
    // localStorage baseline that could mark a stale device as "up to date".
    const running = (typeof __BUILD_VERSION__ !== 'undefined') ? __BUILD_VERSION__ : null
    if (!running) return // bundle predates version embedding — nothing to compare
    const res = await fetch('/version.json?_=' + Date.now(), { cache: 'no-store' })
    if (!res.ok) return
    const remote = await res.json()
    if (!remote?.version) return
    if (running === remote.version) return // running the latest build — done

    // Stale. Heal exactly once per session (sessionStorage guard) so a stubborn
    // upstream cache that survives the purge can never loop the device.
    if (sessionStorage.getItem('fluentia:self-heal-attempted') === '1') {
      // eslint-disable-next-line no-console
      console.warn('[self-heal] still stale after reload — giving up', { running, remote: remote.version })
      return
    }
    sessionStorage.setItem('fluentia:self-heal-attempted', '1')
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    location.reload()
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[self-heal] failed', e?.message || e)
  }
})()

// ─── FORCE-REFRESH SWITCH 2026-06-09 ──────────────────────────────────────
// A server-controlled lever (app_config.force_refresh_at, read via the public
// get_app_force_refresh RPC) lets an admin make EVERY device wipe its cache +
// re-download the latest build on next app-open — even when version.json matches
// (covers the "we fixed it but their phone still runs the old code" reports).
// Independent of the version-mismatch self-heal above. Applies a given epoch at
// most once (durable localStorage marker, set BEFORE reload) so it cannot loop.
;(async function applyForcedRefresh() {
  try {
    const base = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!base || !key) return
    const res = await fetch(base + '/rest/v1/rpc/get_app_force_refresh', {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: '{}',
    })
    if (!res.ok) return
    const want = Number(await res.json()) || 0
    if (!want) return // switch never triggered
    const applied = Number(localStorage.getItem('fluentia_force_refresh_applied') || 0)
    if (want <= applied) return // already wiped for this epoch
    if (sessionStorage.getItem('fluentia:force-refresh-attempted') === '1') return
    sessionStorage.setItem('fluentia:force-refresh-attempted', '1')
    localStorage.setItem('fluentia_force_refresh_applied', String(want)) // mark FIRST → no loop
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
    location.reload()
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[force-refresh] failed', e?.message || e)
  }
})()

// Mobile debug console — activate via ?debug=1 or localStorage
if (new URLSearchParams(window.location.search).get('debug') === '1' ||
    localStorage.getItem('fluentia_debug') === '1') {
  localStorage.setItem('fluentia_debug', '1')
  import('eruda').then(eruda => {
    eruda.default.init()
    console.log('[Fluentia] Eruda debug console activated')
  })
}

// ─── Global error recovery — catch unhandled errors that React can't ───
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)
  captureError({
    kind: 'unhandled_rejection',
    message: String(event.reason?.message || event.reason || 'unknown'),
    stack: event.reason?.stack,
  })
  event.preventDefault()
})

window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error)
  // If it's a chunk loading error, reload once (with 30s cooldown to prevent loops)
  if (event.message?.includes('Failed to fetch dynamically imported module') ||
      event.message?.includes('Loading chunk') ||
      event.message?.includes('Loading CSS chunk')) {
    const lastReload = parseInt(sessionStorage.getItem('chunk_reload_at') || '0', 10)
    if (Date.now() - lastReload > 30000) {
      sessionStorage.setItem('chunk_reload_at', Date.now().toString())
      window.location.reload()
    }
    return
  }
  captureError({
    kind: 'error',
    message: event.message || String(event.error || 'unknown'),
    stack: event.error?.stack,
    url: event.filename,
  })
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('[main] Could not find #root element. Check index.html.')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <AccessibilityProvider>
        <App />
      </AccessibilityProvider>
    </PersistQueryClientProvider>
  </React.StrictMode>,
)
