/**
 * The escape hatch for single-world accounts.
 *
 * `HomeSurfaceBounce` keeps a STEP/IELTS/Desk account inside its world. A
 * student with `keep_academy_access` may still visit the ordinary curriculum —
 * but only when they ASK for it, otherwise the bounce cannot tell a deliberate
 * visit from a stray link and would send them straight back.
 *
 * This flag was read by the bounce from the day it was written but nothing ever
 * SET it, so the "منهجي ودروسي" link in the IELTS atelier silently bounced back
 * to IELTS. Call this before navigating to the academy.
 *
 * sessionStorage, not localStorage: the intent should not outlive the tab.
 */
const KEY = 'fluentia_academy_intent'

export function enterAcademy(navigate, to = '/student') {
  try { sessionStorage.setItem(KEY, '1') } catch { /* private mode — bounce will just hold them */ }
  navigate(to)
}

/** Called when a world's shell mounts: re-entering a world clears the intent. */
export function clearAcademyIntent() {
  try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
}
