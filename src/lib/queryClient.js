import { QueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

// Track whether we're currently refreshing to avoid duplicate refreshes
let _refreshingSession = false

async function refreshSessionOnce() {
  if (_refreshingSession) return
  _refreshingSession = true
  try {
    await supabase.auth.refreshSession()
  } catch (e) {
    console.warn('[QueryClient] Session refresh failed:', e)
  } finally {
    _refreshingSession = false
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes
      gcTime: 1000 * 60 * 30,    // 30 minutes — keep data in cache longer
      retry: (failureCount, error) => {
        const msg = error?.message || ''
        const isAuthError = msg.includes('JWT') || error?.status === 401 || error?.code === 'PGRST301'
        if (isAuthError) {
          if (failureCount === 0) {
            refreshSessionOnce()
            return true
          }
          return false
        }
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 15000),
      // CRITICAL: Disable automatic refetch on window focus — this causes the blank page bug.
      // When user returns to tab, queries fire with expired JWT BEFORE refreshSession completes,
      // causing 401 errors and data loss. Instead, we rely on TOKEN_REFRESHED event in authStore
      // to refetch queries AFTER the token is successfully refreshed.
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      // CRITICAL: Always keep previous data during refetch — prevents blank flash.
      // Even if a refetch fails, the user sees stale data instead of a blank page.
      placeholderData: (previousData) => previousData,
    },
    mutations: {
      onError: (error) => {
        console.error('[Mutation Error]', error)
        const msg = error?.message || ''
        if (msg.includes('JWT expired') || msg.includes('not authenticated') || error?.status === 401) {
          refreshSessionOnce()
        }
      },
    },
  },
})
