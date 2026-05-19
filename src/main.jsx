import './i18n'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import App from './App'
import './index.css'
import './design-system/trainer-themes.css'
import './design-system/trainer/trainer-primitives.css'
import { queryClient } from './lib/queryClient'
import { AccessibilityProvider } from './contexts/AccessibilityContext'
import { captureRefFromUrl } from './utils/affiliateTracking'

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
    const alreadyTried = sessionStorage.getItem('fluentia:self-heal-attempted')
    const res = await fetch('/version.json?_=' + Date.now(), { cache: 'no-store' })
    if (!res.ok) return
    const remote = await res.json()
    if (!remote?.version) return

    const local = localStorage.getItem('fluentia:bundle-version')

    if (alreadyTried === '1') {
      // Reload already attempted this session; persistent mismatch means
      // something is wrong upstream (CDN, SW, manual cache). Log to console
      // and stop — we will not loop the device.
      if (local && local !== remote.version) {
        // eslint-disable-next-line no-console
        console.warn('[self-heal] version mismatch persists after reload — giving up', {
          local,
          remote: remote.version,
        })
      } else if (local !== remote.version) {
        // First boot of a healing session — record current version.
        localStorage.setItem('fluentia:bundle-version', remote.version)
      }
      return
    }

    if (!local) {
      // Fresh device — no marker yet. Just record it; no reload.
      localStorage.setItem('fluentia:bundle-version', remote.version)
      return
    }
    if (local === remote.version) {
      // Up-to-date — done.
      return
    }

    // Mismatch — try to self-heal exactly once.
    sessionStorage.setItem('fluentia:self-heal-attempted', '1')
    localStorage.setItem('fluentia:bundle-version', remote.version)

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
  }
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
