import { useEffect, useRef, useState } from 'react'

/**
 * Shared plumbing for the app's fixed bottom player bars (listening + reading).
 *
 * THE BUG THIS EXISTS FOR (2026-08-08, reported on iPhone: "I can't see the
 * listening bar to play the audio"):
 * LayoutShell wraps all page content in `[data-content-shell]` with
 * `position:relative; z-index:1`, which creates a stacking context. The mobile
 * bottom nav is a SIBLING of that wrapper at z-40, so NOTHING rendered inside a
 * page can paint above it — a bar's own z-index is scoped inside the z-1
 * context and loses unconditionally. Raising z-index cannot fix it. The bar has
 * to be OFFSET above the nav instead.
 *
 * We measure the live nav rather than hardcoding 64px so the bar also lands
 * correctly wherever the nav is absent: desktop (`lg:hidden`), class mode,
 * body.modal-open, and the STEP / IELTS / immersive-home surfaces.
 */

function readNavHeight() {
  const nav = document.querySelector('[data-role="mobile-bottom-nav"]')
  // Test computed `display`, NOT offsetParent: offsetParent is null for EVERY
  // position:fixed element, so an offsetParent check reports "no nav" always.
  if (!nav || getComputedStyle(nav).display === 'none') return 0
  return Math.round(nav.getBoundingClientRect().height)
}

/**
 * Height the bar must sit above. The nav pads itself with the iOS safe area, so
 * a non-zero value ALREADY covers the home indicator — a bar using this must not
 * add env(safe-area-inset-bottom) again.
 */
export function useBottomNavOffset() {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const measure = () => setOffset(readNavHeight())
    measure()

    const nav = document.querySelector('[data-role="mobile-bottom-nav"]')
    const ro = new ResizeObserver(measure)
    if (nav) ro.observe(nav)
    // body.modal-open hides the nav. Watch ONLY body's class — a subtree
    // observer would re-measure on every scrubber tick and force a layout.
    const mo = new MutationObserver(measure)
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)

    return () => {
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])

  return offset
}

/**
 * Publish the bar's MEASURED footprint as `--sticky-player-offset` on <html> so
 * page content can pad past it and the floating corner FABs can stay clear of
 * its controls (see src/lib/ui/reservedBottom.js). Measured, not guessed —
 * the bar grows with the speaker pill and the error cards.
 *
 * Returns the ref to attach to the bar's outermost element.
 */
export function useStickyPlayerOffset(deps = []) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const publish = () => {
      const h = Math.round(el.getBoundingClientRect().height)
      document.documentElement.style.setProperty('--sticky-player-offset', `${h + 12}px`)
    }
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.removeProperty('--sticky-player-offset')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return ref
}
