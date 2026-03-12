import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

// ─── Global error recovery — catch unhandled errors that React can't ───
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)
  event.preventDefault()
})

window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error)
  // If it's a chunk loading error, reload once
  if (event.message?.includes('Failed to fetch dynamically imported module') ||
      event.message?.includes('Loading chunk') ||
      event.message?.includes('Loading CSS chunk')) {
    const hasReloaded = sessionStorage.getItem('chunk_reload')
    if (!hasReloaded) {
      sessionStorage.setItem('chunk_reload', 'true')
      window.location.reload()
    }
  }
})

// ─── React Query — global config ──────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry auth errors
        if (error?.message?.includes('JWT') || error?.status === 401) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        console.error('[Mutation Error]', error)
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
