// Progress for «حصصي» — now per-STATION (chapter). A class is "done" when every
// station is done. Per-student localStorage, tiny external store so the map and
// the station pages stay in sync. Swappable to a server table later.
import { useSyncExternalStore, useCallback, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { DESK_CLASSES, TOTAL_CLASSES } from '@/data/desk/classes'

const keyFor = (id) => `desk_classes_v2_${id || 'anon'}`
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
const ck = (classId, chapterId) => `${classId}:${chapterId}`

export function useClassProgress() {
  const studentId = useAuthStore((s) => s.profile?.id) || 'anon'
  const doneSet = useSyncExternalStore(subscribe, () => load(studentId), () => load(studentId))

  const isChapterDone = useCallback((classId, chapterId) => doneSet.has(ck(classId, chapterId)), [doneSet])
  const markChapterDone = useCallback((classId, chapterId) => {
    const set = new Set(load(studentId))
    const k = ck(classId, chapterId)
    if (!set.has(k)) { set.add(k); persist(studentId, set) }
  }, [studentId])

  const classProgress = useCallback((cls) => {
    if (!cls?.chapters?.length) return { done: 0, total: 0, pct: 0, allDone: false, current: null }
    const total = cls.chapters.length
    const done = cls.chapters.filter((ch) => doneSet.has(ck(cls.id, ch.id))).length
    const current = cls.chapters.find((ch) => !doneSet.has(ck(cls.id, ch.id))) || null
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0, allDone: done === total, current }
  }, [doneSet])

  const isClassDone = useCallback((classId) => {
    const cls = DESK_CLASSES.find((c) => c.id === classId)
    return cls ? classProgress(cls).allDone : false
  }, [classProgress])

  const overall = useMemo(() => ({
    done: DESK_CLASSES.filter((c) => classProgress(c).allDone).length,
    total: TOTAL_CLASSES,
  }), [classProgress])

  return { isChapterDone, markChapterDone, classProgress, isClassDone, ...overall }
}
