// MEGA-FIX V2 Phase D — Keep --sidebar-width and --header-height in sync
// with the actual rendered chrome via ResizeObserver. Mount ONCE at the
// app root; renders nothing.

import { useEffect } from 'react'

const MOBILE_BREAKPOINT_PX = 1024

function readSidebarWidth() {
  if (typeof window === 'undefined') return 0
  // Below the lg breakpoint, the sidebar is `hidden lg:flex` so it's not
  // in the layout at all. Force 0 — the CSS @media also enforces this.
  if (window.innerWidth < MOBILE_BREAKPOINT_PX) return 0
  const el = document.querySelector('[data-sidebar-root]')
  if (!el) return 0
  return Math.round(el.getBoundingClientRect().width || 0)
}

function readHeaderHeight() {
  if (typeof window === 'undefined') return 64
  const el =
    document.querySelector('[data-app-header]') ||
    document.querySelector('header[role="banner"]') ||
    document.querySelector('header')
  if (!el) return 64
  const h = Math.round(el.getBoundingClientRect().height || 0)
  return h > 0 ? h : 64
}

function applyMetrics() {
  const root = document.documentElement
  const sidebar = readSidebarWidth()
  const header = readHeaderHeight()
  root.style.setProperty('--sidebar-width', `${sidebar}px`)
  root.style.setProperty('--header-height', `${header}px`)
}

export default function SidebarMetricsObserver() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    applyMetrics()

    // Observe the sidebar + header for size changes (collapse, theme reflow, etc).
    const observers = []
    const observeIfPresent = (selector) => {
      const el = document.querySelector(selector)
      if (!el) return
      const ro = new ResizeObserver(applyMetrics)
      ro.observe(el)
      observers.push(ro)
    }
    observeIfPresent('[data-sidebar-root]')
    observeIfPresent('[data-app-header]')
    observeIfPresent('header[role="banner"]')

    // Catch first-paint races where the sidebar appears AFTER this effect
    // runs (route change, lazy load): keep a MutationObserver until we've
    // seen a sidebar at least once.
    let seenSidebar = !!document.querySelector('[data-sidebar-root]')
    const mo = new MutationObserver(() => {
      applyMetrics()
      if (!seenSidebar && document.querySelector('[data-sidebar-root]')) {
        seenSidebar = true
        observeIfPresent('[data-sidebar-root]')
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    const onResize = () => applyMetrics()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)

    return () => {
      observers.forEach((o) => o.disconnect())
      mo.disconnect()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  return null
}
