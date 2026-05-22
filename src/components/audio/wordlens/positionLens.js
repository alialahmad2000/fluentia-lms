// MEGA-FIX V2 Phase D — Sidebar-aware WordLens positioning.
//
// Old behavior: clamped popup left to `viewportWidth - popupWidth - MARGIN`
// with NO awareness of the sidebar. In Arabic RTL with the sidebar pinned
// to the right (264px), the right-clamp landed the popup INSIDE the sidebar
// zone → student-perceived as "popup is covered by the sidebar".
//
// New behavior: reads --sidebar-width and --header-height from :root (kept
// in sync by SidebarMetricsObserver) and clamps into the usable viewport.
//
// Stays pure (no React) so it remains easy to unit-test.

const MARGIN = 16
const GAP = 12
const TAP_RECT_HEIGHT = 28
const MOBILE_BREAKPOINT = 768

function readMetric(name, fallback) {
  if (typeof document === 'undefined') return fallback
  try {
    const css = getComputedStyle(document.documentElement)
    const v = parseInt(css.getPropertyValue(name), 10)
    return Number.isFinite(v) ? v : fallback
  } catch {
    return fallback
  }
}

export function positionLens({
  tapX,
  tapY,
  viewportWidth,
  viewportHeight,
  popupHeight = 320,
  popupWidth = 360,
}) {
  if (viewportWidth < MOBILE_BREAKPOINT) {
    return { left: MARGIN, top: null, placement: 'bottom-sheet' }
  }

  const sidebarWidth = readMetric('--sidebar-width', 0)
  const headerHeight = readMetric('--header-height', 64)
  const isRtl = typeof document !== 'undefined' && (document.documentElement.dir === 'rtl' || document.dir === 'rtl')

  // Usable horizontal band, excluding sidebar.
  // RTL: sidebar on right → usable.right is reduced.
  // LTR: sidebar on left  → usable.left is increased.
  const usable = {
    top:    headerHeight + GAP,
    bottom: viewportHeight - MARGIN,
    left:   isRtl ? MARGIN : sidebarWidth + MARGIN,
    right:  isRtl ? viewportWidth - sidebarWidth - MARGIN : viewportWidth - MARGIN,
  }

  const safeX = Number.isFinite(tapX) ? tapX : viewportWidth / 2
  const safeY = Number.isFinite(tapY) ? tapY : viewportHeight / 2

  const wordTop = safeY - TAP_RECT_HEIGHT / 2
  const wordBottom = safeY + TAP_RECT_HEIGHT / 2

  const spaceBelow = usable.bottom - (wordBottom + GAP) - popupHeight
  const spaceAbove = wordTop - GAP - popupHeight - usable.top

  let top
  let placement
  if (spaceBelow >= 0) {
    top = wordBottom + GAP
    placement = 'below'
  } else if (spaceAbove >= 0) {
    top = wordTop - GAP - popupHeight
    placement = 'above'
  } else {
    top = usable.top
    placement = 'centered'
  }

  // Horizontal clamp — uses the sidebar-aware usable band.
  const usableWidth = usable.right - usable.left
  let clampedLeft
  if (popupWidth >= usableWidth) {
    clampedLeft = usable.left
  } else {
    clampedLeft = Math.max(
      usable.left,
      Math.min(usable.right - popupWidth, safeX - popupWidth / 2)
    )
  }

  return { left: clampedLeft, top, placement }
}
