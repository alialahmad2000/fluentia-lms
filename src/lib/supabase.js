import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// ─── Global fetch timeout ─────────────────────────────────────────────────────
// Prevents hanging TCP connections on degraded mobile networks from leaving
// TanStack Query in `isPending: true` forever. See root cause #1 in:
// docs/ARCHITECTURE-AUDIT-UNIVERSAL-STUCK.md
//
// Storage endpoints get 120s (voice uploads, writing submissions, avatars).
// Everything else (DB REST, auth, RPC, edge functions) gets 20s.
// Realtime is WebSocket — not affected by the fetch option.
const DEFAULT_TIMEOUT_MS = 20_000
const STORAGE_TIMEOUT_MS = 120_000

function fetchWithTimeout(input, init = {}) {
  const url = typeof input === 'string'
    ? input
    : (input && typeof input === 'object' && 'url' in input ? input.url : '')

  const isStorage = url.includes('/storage/v1/')
  const timeoutMs = isStorage ? STORAGE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    // eslint-disable-next-line no-console
    console.warn('[supabase] fetch timeout:', { url, timeoutMs })
    controller.abort(new DOMException(
      `Supabase fetch timeout after ${timeoutMs}ms: ${url}`,
      'TimeoutError'
    ))
  }, timeoutMs)

  // Chain external abort signal so TanStack Query component-unmount cancellation
  // still propagates correctly through our wrapper.
  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort(init.signal.reason)
    } else {
      init.signal.addEventListener(
        'abort',
        () => controller.abort(init.signal.reason),
        { once: true }
      )
    }
  }

  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId))
}
// ─────────────────────────────────────────────────────────────────────────────

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    fetch: fetchWithTimeout,
  },
})
