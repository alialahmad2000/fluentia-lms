/**
 * A bounded vocabulary study session.
 *
 * The study band's CTA promises «جلسة · N كلمات», so the queue has to actually
 * end after N. Before this, starting a session opened the first unmastered word
 * and then chained through EVERY remaining word in the unit — the button's own
 * copy was untrue and the session had no finish line.
 *
 * Kept as plain functions, not inline component logic, so the bound is testable
 * without driving three exercises per word through the UI.
 */

/** Picks the next `size` words the student has not mastered, in unit order. */
export function buildSession(words, isMastered, size, startMastered = 0) {
  const queue = (words || []).filter((w) => !isMastered(w)).slice(0, Math.max(size, 0))
  if (!queue.length) return null
  return { ids: queue.map((w) => w.id), i: 0, startMastered, finished: false }
}

/**
 * Advances the session by one. Returns the session to store and the word to
 * open; `word === null` together with `finished` means the queue is spent.
 */
export function advanceSession(session, words) {
  if (!session || session.finished) return { session, word: null }
  const nextIndex = session.i + 1
  if (nextIndex >= session.ids.length) {
    return { session: { ...session, finished: true }, word: null }
  }
  const id = session.ids[nextIndex]
  return {
    session: { ...session, i: nextIndex },
    word: (words || []).find((w) => w.id === id) || null,
  }
}

/** True while the session still has a word after the current one. */
export function sessionHasNext(session) {
  return !!session && !session.finished && session.i + 1 < session.ids.length
}

/** How many words the session actually covered (for the end-of-session line). */
export function sessionCovered(session) {
  if (!session) return 0
  return Math.min(session.i + 1, session.ids.length)
}
