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
      staleTime: 1000 * 60 * 2, // 2 minutes — shorter to avoid stale-token queries
      gcTime: 1000 * 60 * 10,   // 10 minutes garbage collection
      retry: (failureCount, error) => {
        const msg = error?.message || ''
        const isAuthError = msg.includes('JWT') || error?.status === 401 || error?.code === 'PGRST301'
        if (isAuthError) {
          // On first auth failure, try refreshing session so retry #2 may succeed
          if (failureCount === 0) {
            refreshSessionOnce()
            return true
          }
          return false // give up after one retry
        }
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
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
