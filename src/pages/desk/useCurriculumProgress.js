// Curriculum progress for the Pro Desk track.
//
// Stored per-student in localStorage (creditless, zero-risk, no DDL). It's a
// tiny external store so DeskTrack (the map) and DeskLesson (the reader) stay in
// sync the moment a lesson is marked complete. The shape is deliberately thin —
// a set of completed lesson ids — so it can be swapped to a server-authoritative
// table + RPC later WITHOUT touching either UI (just re-point read/write here).
import { useSyncExternalStore, useCallback, useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { CURRICULUM_TRACKS, ALL_LESSONS, TOTAL_LESSONS } from '@/data/desk/curriculum'

const keyFor = (studentId) => `desk_curriculum_v1_${studentId || 'anon'}`

// module-level cache of the parsed set, keyed by studentId, + subscriber list
const cache = new Map() // studentId -> Set<lessonId>
const listeners = new Set()

function load(studentId) {
  if (cache.has(studentId)) return cache.get(studentId)
  let set = new Set()
  try {
    const raw = localStorage.getItem(keyFor(studentId))
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) set = new Set(arr)
    }
  } catch { /* corrupt / unavailable — start empty */ }
  cache.set(studentId, set)
  return set
}

function persist(studentId, set) {
  cache.set(studentId, set)
  try { localStorage.setItem(keyFor(studentId), JSON.stringify([...set])) } catch { /* quota / private mode — in-memory still holds */ }
  listeners.forEach((fn) => fn())
}

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useCurriculumProgress() {
  const studentId = useAuthStore((s) => s.profile?.id) || 'anon'

  // useSyncExternalStore keeps every mounted consumer consistent. The snapshot
  // must be referentially stable between changes, so we return the cached Set.
  const completedSet = useSyncExternalStore(
    subscribe,
    () => load(studentId),
    () => load(studentId)
  )

  const isCompleted = useCallback((lessonId) => completedSet.has(lessonId), [completedSet])

  const markComplete = useCallback((lessonId) => {
    const set = new Set(load(studentId))
    if (!set.has(lessonId)) { set.add(lessonId); persist(studentId, set) }
  }, [studentId])

  const toggleComplete = useCallback((lessonId) => {
    const set = new Set(load(studentId))
    if (set.has(lessonId)) set.delete(lessonId); else set.add(lessonId)
    persist(studentId, set)
  }, [studentId])

  // derived views, recomputed only when the set identity changes
  const derived = useMemo(() => {
    const doneCount = ALL_LESSONS.filter((l) => completedSet.has(l.id)).length

    const byTrack = {}
    for (const track of CURRICULUM_TRACKS) {
      const done = track.lessons.filter((l) => completedSet.has(l.id)).length
      byTrack[track.id] = { done, total: track.lessons.length }
    }

    // "current" = first lesson (in track order) not yet completed
    const current = ALL_LESSONS.find((l) => !completedSet.has(l.id)) || null

    return {
      overall: {
        done: doneCount,
        total: TOTAL_LESSONS,
        pct: TOTAL_LESSONS ? Math.round((doneCount / TOTAL_LESSONS) * 100) : 0,
      },
      byTrack,
      currentLessonId: current?.id || null,
      allComplete: doneCount === TOTAL_LESSONS && TOTAL_LESSONS > 0,
    }
  }, [completedSet])

  return { isCompleted, markComplete, toggleComplete, ...derived }
}
