import { supabase } from './supabase'

// Holds the in-flight refresh promise — all concurrent callers share it
let _inflightRefresh = null

/**
 * Returns the current access token. If no session exists, triggers a shared refresh.
 * Use this instead of calling supabase.auth.getSession() + refreshSession() manually.
 */
export async function getToken() {
  try {
    const { data } = await supabase.auth.getSession()
    if (data?.session?.access_token) return data.session.access_token
  } catch {}
  return refreshOnce()
}

/**
 * Refreshes the session at most once at any given time.
 * If a refresh is already in-flight, returns the SAME promise — no duplicate network call.
 * After the refresh settles, the singleton is cleared so the next call can start a new one.
 */
export function refreshOnce() {
  if (_inflightRefresh) return _inflightRefresh
  _inflightRefresh = supabase.auth.refreshSession()
    .then(({ data }) => data?.session?.access_token ?? null)
    .catch(() => null)
    .finally(() => { _inflightRefresh = null })
  return _inflightRefresh
}
