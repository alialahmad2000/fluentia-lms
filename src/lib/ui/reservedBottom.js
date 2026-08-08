/**
 * Height of the band at the bottom of the viewport that free-floating UI
 * (draggable FABs, toasts) must stay clear of.
 *
 * Two things live there:
 *   1. the mobile bottom nav ([data-role="mobile-bottom-nav"]), and
 *   2. any sticky player bar sitting above it — the listening player publishes
 *      `--sticky-player-offset` on <html> from its MEASURED height.
 *
 * Why this exists: the FABs' default positions (~90-100px from the bottom)
 * landed exactly on the listening player's transport controls, so tapping
 * "play" opened the accessibility panel or the quick-action menu instead.
 *
 * Note on the nav test: use computed `display`, NOT `offsetParent`.
 * offsetParent is null for EVERY position:fixed element, so an offsetParent
 * check silently reports "no nav" 100% of the time.
 */
export function getReservedBottom() {
  if (typeof document === 'undefined') return 0

  const nav = document.querySelector('[data-role="mobile-bottom-nav"]')
  const navH = nav && getComputedStyle(nav).display !== 'none'
    ? nav.getBoundingClientRect().height
    : 0

  const bar = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--sticky-player-offset'),
  )

  return navH + (Number.isFinite(bar) ? bar : 0)
}

/**
 * Re-run `handler` whenever the reserved band can change: viewport resize, and
 * a sticky bar appearing/disappearing mid-session (which rewrites the CSS var
 * on <html>). Returns a cleanup function.
 */
export function onReservedBottomChange(handler) {
  window.addEventListener('resize', handler)
  window.addEventListener('orientationchange', handler)
  // Scoped to <html>'s style attribute — cheap, and the only thing that writes
  // it is a player bar publishing its height.
  const mo = new MutationObserver(handler)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
  return () => {
    window.removeEventListener('resize', handler)
    window.removeEventListener('orientationchange', handler)
    mo.disconnect()
  }
}
