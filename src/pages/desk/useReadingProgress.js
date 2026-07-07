// useReadingProgress — per-student localStorage progress for the Reading section
// (which passages are read/done + best comprehension score). Tiny external store,
// swappable to a server table later. Mirrors useDailyProgress / useClassProgress.
import { useSyncExternalStore, useCallback, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { DESK_READING } from '@/data/desk/reading'

const KEY = (id) => `desk_reading_v1_${id || 'anon'}`
const cache = new Map()
const listeners = new Set()
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

function load(id) {
  if (cache.has(id)) return cache.get(id)
  let s = {}
  try { const raw = localStorage.getItem(KEY(id)); if (raw) s = JSON.parse(raw) || {} } catch { /* fresh */ }
  cache.set(id, s); return s
}
function persist(id, s) {
  cache.set(id, { ...s })
  try { localStorage.setItem(KEY(id), JSON.stringify(s)) } catch { /* in-memory */ }
  listeners.forEach((fn) => fn())
}

export function useReadingProgress() {
  const studentId = useAuthStore((s) => s.profile?.id) || 'anon'
  const state = useSyncExternalStore(subscribe, () => load(studentId), () => load(studentId))

  const isDone = useCallback((rid) => !!state[rid]?.done, [state])
  const scoreOf = useCallback((rid) => state[rid]?.bestScore ?? null, [state])
  const markDone = useCallback((rid, score) => {
    const s = { ...load(studentId) }
    const prev = s[rid] || {}
    s[rid] = { done: true, at: Date.now(), bestScore: Math.max(prev.bestScore || 0, score || 0) }
    persist(studentId, s)
  }, [studentId])

  const derived = useMemo(() => {
    const total = DESK_READING.length
    const done = DESK_READING.filter((r) => state[r.id]?.done).length
    // next = first not-done, else null
    const next = DESK_READING.find((r) => !state[r.id]?.done) || null
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0, next }
  }, [state])

  return { isDone, scoreOf, markDone, ...derived }
}
