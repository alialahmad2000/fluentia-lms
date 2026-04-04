import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import { queryClient } from './lib/queryClient'

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

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('[main] Could not find #root element. Check index.html.')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
