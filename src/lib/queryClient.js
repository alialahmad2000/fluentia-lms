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
      // Stale-While-Revalidate: show cached data instantly, refetch silently after 1 min
      staleTime: 1000 * 60 * 1,           // 1 minute — when to background-revalidate
      gcTime: 1000 * 60 * 60 * 24,        // 24 hours — how long to keep in memory/storage
      refetchOnMount: true,                // revalidate silently when component mounts
      refetchOnReconnect: 'always',        // refresh after coming back online
      // CRITICAL: Disable automatic refetch on window focus — causes blank page bug.
      // Token may be expired when user returns to tab. Let authStore handle post-refresh refetch.
      refetchOnWindowFocus: false,
      networkMode: 'online',
      // Keep previous data during refetch — prevents blank flash on stale data.
      placeholderData: (previousData) => previousData,
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
