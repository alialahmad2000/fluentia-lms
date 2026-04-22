import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import './design-system/trainer-themes.css'
import './design-system/trainer/trainer-primitives.css'
import { queryClient } from './lib/queryClient'
import { AccessibilityProvider } from './contexts/AccessibilityContext'
import { captureRefFromUrl } from './utils/affiliateTracking'

// Capture affiliate ref code from URL on app load
captureRefFromUrl()

// ATELIER: single identity — purge legacy theme classes on boot
if (typeof document !== 'undefined') {
  const html = document.documentElement
  ;['theme-diwan', 'theme-diwan-gold', 'theme-teal', 'theme-deep-teal',
    'theme-daylight', 'theme-daylight-study', 'theme-mission-black']
    .forEach(cls => html.classList.remove(cls))
  html.classList.add('theme-atelier')
  try { localStorage.removeItem('theme') } catch {}
  try { localStorage.removeItem('fluentia-theme') } catch {}
}

// Mobile debug console — activate via ?debug=1 or localStorage
if (new URLSearchParams(window.location.search).get('debug') === '1' ||
    localStorage.getItem('fluentia_debug') === '1') {
  localStorage.setItem('fluentia_debug', '1')
  import('eruda').then(eruda => {
    eruda.default.init()
    console.log('[Fluentia] Eruda debug console activated')
  })
}

// ─── Global error recovery — catch unhandled errors that React can't ───
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)
  event.preventDefault()
})

window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error)
  // If it's a chunk loading error, reload once (with 30s cooldown to prevent loops)
  if (event.message?.includes('Failed to fetch dynamically imported module') ||
      event.message?.includes('Loading chunk') ||
      event.message?.includes('Loading CSS chunk')) {
    const lastReload = parseInt(sessionStorage.getItem('chunk_reload_at') || '0', 10)
    if (Date.now() - lastReload > 30000) {
      sessionStorage.setItem('chunk_reload_at', Date.now().toString())
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
      <AccessibilityProvider>
        <App />
      </AccessibilityProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
