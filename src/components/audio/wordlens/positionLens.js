// READING-LENS P1 — Pure positioning helper for <WordLens />.
//
// Given a tap point + viewport metrics + popup size, returns where the lens
// should anchor: below the tapped word, above it, centered if neither fits,
// or pinned as a bottom sheet on narrow viewports.

const MARGIN = 16
const GAP = 12
const TAP_RECT_HEIGHT = 28 // rough line-height estimate; we don't have the rect.
const MOBILE_BREAKPOINT = 768

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

  const safeX = Number.isFinite(tapX) ? tapX : viewportWidth / 2
  const safeY = Number.isFinite(tapY) ? tapY : viewportHeight / 2

  const wordTop = safeY - TAP_RECT_HEIGHT / 2
  const wordBottom = safeY + TAP_RECT_HEIGHT / 2

  const spaceBelow = viewportHeight - (wordBottom + GAP + popupHeight)
  const spaceAbove = wordTop - GAP - popupHeight

  let top
  let placement
  if (spaceBelow >= MARGIN) {
    top = wordBottom + GAP
    placement = 'below'
  } else if (spaceAbove >= MARGIN) {
    top = wordTop - GAP - popupHeight
    placement = 'above'
  } else {
    top = 24
    placement = 'centered'
  }

  const clampedLeft = Math.max(
    MARGIN,
    Math.min(viewportWidth - popupWidth - MARGIN, safeX - popupWidth / 2)
  )

  return { left: clampedLeft, top, placement }
}
