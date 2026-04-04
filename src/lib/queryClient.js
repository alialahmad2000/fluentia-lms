import { QueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry auth errors
        if (error?.message?.includes('JWT') || error?.status === 401 || error?.code === 'PGRST301') return false
        return failureCount < 2
      },
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      onError: (error) => {
        console.error('[Mutation Error]', error)
        // If mutation fails due to expired token, try refreshing session
        if (error?.message?.includes('JWT expired') || error?.message?.includes('not authenticated') || error?.status === 401) {
          supabase.auth.refreshSession()
        }
      },
    },
  },
})
