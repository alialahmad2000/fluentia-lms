/**
 * Which nav item is the current one.
 *
 * The old rule was `location.pathname.startsWith(item.to)`, which breaks as soon as
 * two items share a path and differ only by a query string. مصعب holds two courses
 * that both live at /student/curriculum/level/2 — «مساري الخاص» and «المنهج العام»
 * (?track=standard). `location.pathname` never contains the query, so the bare item
 * matched ALWAYS and the ?track item matched NEVER: clicking the second one opened
 * the right page while the sidebar kept the first one lit.
 *
 * Rule now: among the items whose PATH matches, the most specific one wins —
 * longest path first, then the most declared query params that actually match the
 * URL. Exactly one item can be active.
 */

/** Dashboard/root entries match exactly; everything else matches its subtree. */
export function isRootNavPath(to, role) {
  return to === `/${role}` || to === '/student' || to === '/trainer' || to === '/admin'
}

function parseTo(to) {
  const qi = to.indexOf('?')
  if (qi === -1) return { path: to, params: [] }
  const path = to.slice(0, qi)
  const params = [...new URLSearchParams(to.slice(qi + 1)).entries()]
  return { path, params }
}

/**
 * Score an item against the current location. Returns -1 when it does not match.
 * Higher wins.
 */
function scoreItem(to, pathname, search, role) {
  const { path, params } = parseTo(to)

  // Path gate. The trailing-slash boundary stops /student/curriculum from also
  // claiming /student/curriculum-old, which is a real, separate route.
  const pathOk = isRootNavPath(path, role)
    ? pathname === path
    : pathname === path || pathname.startsWith(path.endsWith('/') ? path : `${path}/`)
  if (!pathOk) return -1

  // Every param the item declares must match the URL, or it is not this item.
  const cur = new URLSearchParams(search || '')
  for (const [k, v] of params) {
    if (cur.get(k) !== v) return -1
  }

  // Longer path beats shorter; among equal paths, more matched params beats fewer,
  // so ?track=standard outranks the bare item when the param is present.
  return path.length * 1000 + params.length
}

/**
 * The `to` of the single active item, or null. Pass every item the surface renders
 * (before visibility filtering) so the winner is chosen across the whole surface.
 */
export function resolveActiveNavTo(items, pathname, search, role) {
  let bestTo = null
  let bestScore = -1
  for (const item of items || []) {
    if (!item || !item.to) continue
    const score = scoreItem(item.to, pathname, search, role)
    if (score > bestScore) {
      bestScore = score
      bestTo = item.to
    }
  }
  return bestTo
}
