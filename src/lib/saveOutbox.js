/**
 * A durable outbox for student work.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * Answers lived in React state until a network round-trip succeeded. If the
 * request never completed — dead spot in the lift, tab frozen by iOS, phone
 * locked mid-question — the work existed nowhere but in memory, and iOS Safari
 * discards backgrounded tabs aggressively. `pagehide` is a best-effort hint,
 * not a guarantee: it does not fire when the OS kills the tab outright.
 *
 * So every save is written HERE FIRST, survives a process death, and is
 * replayed when the app next runs. Because `save_activity_attempt` is
 * idempotent and never shrinks a payload, replaying an entry is always safe —
 * a stale replay can only ever be ignored by the server, never destructive.
 */

const DB_NAME = 'fluentia-save-outbox'
const STORE = 'pending'
const LS_KEY = 'fluentia_save_outbox_v1'
const MAX_TRIES = 12

let dbPromise = null
const listeners = new Set()

/** Identity of a piece of work — one entry per activity attempt, newest wins. */
export function outboxKey({ studentId, sectionType, activityId, unitId, attemptNumber }) {
  return `${studentId}:${sectionType}:${activityId || unitId}:${attemptNumber ?? 'live'}`
}

function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no-idb'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'key' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }).catch((e) => { dbPromise = null; throw e })
  return dbPromise
}

// localStorage fallback: iOS private browsing and some embedded webviews refuse
// IndexedDB entirely. A smaller net is better than none.
function lsRead() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function lsWrite(map) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)) } catch { /* quota — nothing we can do */ }
}

function notify() {
  countPending().then((n) => listeners.forEach((fn) => { try { fn(n) } catch {} }))
}

/** Subscribe to pending-count changes. Returns an unsubscribe function. */
export function onOutboxChange(fn) {
  listeners.add(fn)
  countPending().then((n) => { try { fn(n) } catch {} })
  return () => listeners.delete(fn)
}

export async function putEntry(key, payload) {
  const entry = { key, payload, queuedAt: Date.now(), tries: 0 }
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(entry)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    const map = lsRead(); map[key] = entry; lsWrite(map)
  }
  notify()
}

export async function removeEntry(key) {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(key)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    const map = lsRead(); delete map[key]; lsWrite(map)
  }
  notify()
}

export async function listEntries() {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).getAll()
      req.onsuccess = () => resolve(req.result || [])
      req.onerror = () => reject(req.error)
    })
  } catch {
    return Object.values(lsRead())
  }
}

export async function countPending() {
  try { return (await listEntries()).length } catch { return 0 }
}

let draining = false

/**
 * Replay everything queued. `send` receives a payload and resolves truthy when
 * the server has confirmed the write.
 */
export async function drainOutbox(send) {
  if (draining) return { drained: 0, failed: 0 }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { drained: 0, failed: 0 }
  draining = true
  let drained = 0, failed = 0
  try {
    const entries = await listEntries()
    for (const entry of entries) {
      try {
        const ok = await send(entry.payload)
        if (ok) { await removeEntry(entry.key); drained++ }
        else throw new Error('send-rejected')
      } catch {
        failed++
        const tries = (entry.tries || 0) + 1
        // Give up eventually rather than replaying a poisoned entry forever.
        if (tries >= MAX_TRIES) await removeEntry(entry.key)
        else await putEntryRaw({ ...entry, tries })
      }
    }
  } finally {
    draining = false
  }
  return { drained, failed }
}

async function putEntryRaw(entry) {
  try {
    const db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(entry)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    const map = lsRead(); map[entry.key] = entry; lsWrite(map)
  }
}

/** Wire the automatic replay triggers exactly once per page. */
export function installOutboxDrain(send) {
  if (typeof window === 'undefined') return () => {}
  if (window.__fluentiaOutboxInstalled) return () => {}
  window.__fluentiaOutboxInstalled = true

  const run = () => { drainOutbox(send) }
  const onVisible = () => { if (document.visibilityState === 'visible') run() }

  window.addEventListener('online', run)
  document.addEventListener('visibilitychange', onVisible)
  run()

  return () => {
    window.removeEventListener('online', run)
    document.removeEventListener('visibilitychange', onVisible)
    window.__fluentiaOutboxInstalled = false
  }
}
