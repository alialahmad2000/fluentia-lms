/**
 * View Transitions helper — shared-element morphing between routes.
 *
 * WHY A HELPER RATHER THAN A PROP:
 * `view-transition-name` must be UNIQUE at capture time. In a list of unit
 * cards every card would otherwise carry the same name, which throws and makes
 * the browser silently skip the transition. So the name is applied to the
 * ONE clicked element immediately before navigating, and removed afterwards.
 *
 * DEGRADATION: if the browser lacks startViewTransition, or the user prefers
 * reduced motion, this runs the navigation callback directly — identical to
 * today's behaviour. It is never load-bearing.
 */

const REDUCED = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export const supportsViewTransitions = () =>
  typeof document !== 'undefined' && typeof document.startViewTransition === 'function'

/** Guard so a fast double-click cannot start two overlapping transitions. */
let inFlight = false

/**
 * Run `navigateFn` inside a view transition, tagging `el` (and optionally a
 * descendant title) so it morphs into the matching element on the next screen.
 *
 * @param {HTMLElement|null} el        element to morph (e.g. the card's cover image)
 * @param {Function}         navigateFn  performs the actual navigation
 * @param {object}           [opts]
 * @param {string}           [opts.name='fl-unit-hero']  view-transition-name to apply
 * @param {string}           [opts.titleSelector]        descendant to tag as the title
 */
export function navigateWithTransition(el, navigateFn, opts = {}) {
  const { name = 'fl-unit-hero', titleSelector } = opts

  if (!supportsViewTransitions() || REDUCED() || !el) {
    navigateFn()
    return
  }
  if (inFlight) return
  inFlight = true

  const titleEl = titleSelector ? el.closest('[data-vt-root]')?.querySelector(titleSelector) : null

  el.style.viewTransitionName = name
  if (titleEl) titleEl.style.viewTransitionName = 'fl-unit-title'

  const cleanup = () => {
    el.style.viewTransitionName = ''
    if (titleEl) titleEl.style.viewTransitionName = ''
    inFlight = false
  }

  try {
    const t = document.startViewTransition(() => { navigateFn() })
    t.finished.finally(cleanup)
    // Safety net: never leave a stale name behind if `finished` never settles.
    setTimeout(() => { if (inFlight) cleanup() }, 1200)
  } catch {
    cleanup()
    navigateFn()
  }
}
