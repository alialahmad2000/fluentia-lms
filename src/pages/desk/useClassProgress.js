// Progress for «حصصي» (class debriefs). Per-student localStorage, tiny external
// store so the list and the reader stay in sync. Swappable to a server table
// later without touching UI. Mirrors useCurriculumProgress.
import { useSyncExternalStore, useCallback, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { DESK_CLASSES, TOTAL_CLASSES } from '@/data/desk/classes'

const keyFor = (id) => `desk_classes_v1_${id || 'anon'}`
const cache = new Map()
const listeners = new Set()

function load(studentId) {
  if (cache.has(studentId)) return cache.get(studentId)
  let set = new Set()
  try {
    const raw = localStorage.getItem(keyFor(studentId))
    if (raw) { const arr = JSON.parse(raw); if (Array.isArray(arr)) set = new Set(arr) }
  } catch { /* start empty */ }
  cache.set(studentId, set)
  return set
}
function persist(studentId, set) {
  cache.set(studentId, set)
  try { localStorage.setItem(keyFor(studentId), JSON.stringify([...set])) } catch { /* in-memory holds */ }
  listeners.forEach((fn) => fn())
}
const subscribe = (cb) => { listeners.add(cb); return () => listeners.delete(cb) }

export function useClassProgress() {
  const studentId = useAuthStore((s) => s.profile?.id) || 'anon'
  const doneSet = useSyncExternalStore(subscribe, () => load(studentId), () => load(studentId))

  const isDone = useCallback((classId) => doneSet.has(classId), [doneSet])
  const markDone = useCallback((classId) => {
    const set = new Set(load(studentId))
    if (!set.has(classId)) { set.add(classId); persist(studentId, set) }
  }, [studentId])

  const derived = useMemo(() => {
    const done = DESK_CLASSES.filter((c) => doneSet.has(c.id)).length
    return { done, total: TOTAL_CLASSES }
  }, [doneSet])

  return { isDone, markDone, ...derived }
}
