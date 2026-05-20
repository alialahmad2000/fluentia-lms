// Unit Movements V3 — feature flag resolver
//
// Resolution order:
//   1. URL param ?layout=v3 or ?layout=v2  (admins only)
//   2. profiles.unit_layout_preference     (per-user override)
//   3. app_config[unit_layout]              (global default)
//   4. 'v2' fallback
//
// app_config has the V3-prompt-spec'd shape: key + value (JSONB). The flag
// value is stored as a JSON string ('"v2"' or '"v3"').
// RLS on app_config permits authenticated SELECT, so any signed-in user can
// fetch this without a service role.

import { useEffect, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

let _cachedGlobalValue = null  // session-level cache; cleared on refresh
let _inflight = null

async function fetchGlobalValue() {
  if (_cachedGlobalValue !== null) return _cachedGlobalValue
  if (_inflight) return _inflight
  _inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'unit_layout')
        .maybeSingle()
      if (error || !data) {
        _cachedGlobalValue = 'v2'
        return 'v2'
      }
      // value comes back as the parsed JSON (e.g. "v2" string)
      const v = typeof data.value === 'string' ? data.value : 'v2'
      _cachedGlobalValue = v === 'v3' ? 'v3' : 'v2'
      return _cachedGlobalValue
    } catch {
      _cachedGlobalValue = 'v2'
      return 'v2'
    } finally {
      _inflight = null
    }
  })()
  return _inflight
}

// Exported so tests / dev tools can force a re-fetch
export function resetUnitLayoutCache() {
  _cachedGlobalValue = null
  _inflight = null
}

/**
 * Returns { version: 'v2' | 'v3', loading: boolean }.
 *
 * Stable across re-renders. Reads profile from auth store and URL params.
 */
export function useUnitLayoutVersion() {
  const profile = useAuthStore((s) => s.profile)
  const [globalValue, setGlobalValue] = useState(_cachedGlobalValue)
  const [loading, setLoading] = useState(_cachedGlobalValue === null)

  useEffect(() => {
    if (_cachedGlobalValue !== null) {
      setGlobalValue(_cachedGlobalValue)
      setLoading(false)
      return
    }
    let cancelled = false
    fetchGlobalValue().then((v) => {
      if (!cancelled) {
        setGlobalValue(v)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  // URL param override (admins only)
  let urlOverride = null
  if (typeof window !== 'undefined' && profile?.role === 'admin') {
    try {
      const params = new URLSearchParams(window.location.search)
      const raw = params.get('layout')
      if (raw === 'v2' || raw === 'v3') urlOverride = raw
    } catch {}
  }

  // Per-user override (from profile row — already loaded by auth store)
  const userPref = profile?.unit_layout_preference
  const userOverride = userPref === 'v3' ? 'v3' : userPref === 'v2' ? 'v2' : null

  const version = urlOverride ?? userOverride ?? globalValue ?? 'v2'
  return { version, loading }
}
