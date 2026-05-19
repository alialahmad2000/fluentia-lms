// PERSONALIZATION-KILL-SWITCH 2026-05-19
//
// Single source of truth for global feature flags. Currently exposes the
// personalization kill-switch. Reads from public.app_config, caches the
// resolved value for the lifetime of the page, and ALWAYS fails closed
// (off) on any read error so a transient outage can't accidentally
// re-enable a disabled feature.
//
// Usage:
//   const enabled = await isPersonalizationEnabled()
//   if (!enabled) return canonicalData
//
// Or the sync helper inside React Query hooks:
//   const { data: ppEnabled = false } = usePersonalizationEnabled()
//
// Future opt-in: flip personalization_enabled in app_config to JSON `true`.

import { supabase } from './supabase'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
let _cache = null
let _cachedAt = 0
let _inflight = null

async function fetchFlag() {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'personalization_enabled')
      .maybeSingle()
    if (error) return false
    return data?.value === true
  } catch {
    return false
  }
}

/**
 * Returns true iff personalization is globally enabled.
 * Fails closed on any error (treats missing/unreachable as disabled).
 */
export async function isPersonalizationEnabled() {
  const now = Date.now()
  if (_cache !== null && now - _cachedAt < CACHE_TTL_MS) return _cache
  if (_inflight) return _inflight
  _inflight = (async () => {
    const v = await fetchFlag()
    _cache = v
    _cachedAt = Date.now()
    _inflight = null
    return v
  })()
  return _inflight
}

/**
 * Resets the cached value. Call this if you ever flip the flag at runtime
 * and want the new value to be picked up immediately.
 */
export function resetFeatureFlagCache() {
  _cache = null
  _cachedAt = 0
  _inflight = null
}
