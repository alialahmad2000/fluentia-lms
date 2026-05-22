// MEGA-FIX V2 Phase D — Sidebar-aware popup placement.
//
// Given an anchor element's bounding rect + the popup's measured size,
// returns { top, left, placement } that NEVER overlaps:
//   - the sidebar (right side in RTL, left side in LTR)
//   - the header
//   - the viewport edges
//
// Reads --sidebar-width and --header-height live from :root CSS variables,
// which are kept in sync with the actual <aside data-sidebar-root> via
// the SidebarMetricsObserver mounted at the app root.

export function computePopupPosition(anchorRect, popupSize, opts = {}) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return { top: 0, left: 0, placement: 'fallback' }
  }

  const css = getComputedStyle(document.documentElement)
  const sidebarWidth = parseInt(css.getPropertyValue('--sidebar-width'), 10) || 0
  const headerHeight = parseInt(css.getPropertyValue('--header-height'), 10) || 0
  const isRtl = document.documentElement.dir === 'rtl' || document.dir === 'rtl'
  const margin = Number.isFinite(opts.margin) ? opts.margin : 12

  // Usable viewport rect after subtracting chrome.
  // Tablet+mobile (<1024) collapse sidebarWidth → 0 via the @media rule.
  const usable = {
    top:    headerHeight + margin,
    bottom: window.innerHeight - margin,
    left:   isRtl ? margin : sidebarWidth + margin,
    right:  isRtl ? window.innerWidth - sidebarWidth - margin : window.innerWidth - margin,
  }

  // Vertical: prefer below the anchor, then above, then clamp.
  let top = anchorRect.bottom + margin
  let placement = 'bottom'
  if (top + popupSize.height > usable.bottom) {
    const above = anchorRect.top - margin - popupSize.height
    if (above >= usable.top) {
      top = above
      placement = 'top'
    } else {
      top = Math.max(usable.top, usable.bottom - popupSize.height)
      placement = 'clamped'
    }
  }

  // Horizontal: center on the anchor, clamp into usable horizontal band.
  const usableWidth = usable.right - usable.left
  let left
  if (popupSize.width >= usableWidth) {
    left = usable.left
  } else {
    const anchorCenter = anchorRect.left + anchorRect.width / 2
    left = anchorCenter - popupSize.width / 2
    left = Math.max(usable.left, Math.min(left, usable.right - popupSize.width))
  }

  return { top, left, placement, usable }
}

// Lightweight variant for callers that already have a tap point (x,y)
// rather than an anchor rect — used by WordLens.
export function computePopupPositionFromTap(tap, popupSize, opts = {}) {
  const tapRectHeight = opts.tapRectHeight ?? 28
  const pseudoRect = {
    top:    tap.y - tapRectHeight / 2,
    bottom: tap.y + tapRectHeight / 2,
    left:   tap.x - 1,
    right:  tap.x + 1,
    width:  2,
    height: tapRectHeight,
  }
  return computePopupPosition(pseudoRect, popupSize, opts)
}
