import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { createSaveQueue, saveAttempt } from '../lib/activitySave'
import { useCurriculumPreview } from '../contexts/CurriculumPreviewContext'
import { trackEvent } from '../lib/trackEvent'

/**
 * The one way a student section persists work.
 *
 * Replaces the seven hand-rolled save paths (reading · grammar · listening ·
 * writing · speaking · vocabulary · pronunciation), each of which reimplemented
 * "if (rowId) UPDATE else INSERT" plus its own is_best recompute, and each of
 * which had to be fixed separately every time that shape produced a bug.
 *
 * Everything a caller used to get wrong now lives below or in the database:
 *   · attempt/row bookkeeping — resolved server-side, under a row lock
 *   · races                   — one serialised queue per activity
 *   · durability              — every write hits the outbox before the network
 *   · verification            — state only reaches 'saved' when the server
 *                               returned the persisted row
 *   · impersonation           — `readOnly` is read INSIDE this hook, so it can
 *                               never be the parent-scoped variable whose
 *                               ReferenceError silently killed saving twice
 */
export function useActivitySave({
  studentId, unitId, sectionType, activityId = null, debounceMs = 700,
}) {
  const { readOnly } = useCurriculumPreview()

  const [state, setState] = useState('idle')       // idle | saving | saved | queued | error
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [row, setRow] = useState(null)

  const attemptRef  = useRef(null)
  const pendingRef  = useRef(null)
  const timerRef    = useRef(null)
  const newAttemptRef = useRef(false)
  const submittedRef  = useRef(false)
  const queue = useRef(createSaveQueue()).current
  const alive = useRef(true)

  useEffect(() => () => { alive.current = false }, [])

  // ── intent ──────────────────────────────────────────────────────────────
  // Logged so "she says she did it" stops being unfalsifiable. Absence of a
  // progress row used to have two indistinguishable causes: the app lost the
  // work, or she never opened the section. Now the server knows which.
  const openedRef = useRef(false)
  useEffect(() => {
    if (readOnly || openedRef.current) return
    if (!studentId || !(activityId || unitId)) return
    openedRef.current = true
    trackEvent('activity_opened', {
      section: sectionType, activity_id: activityId, unit_id: unitId,
    })
  }, [readOnly, studentId, sectionType, activityId, unitId])

  const commit = useCallback(async (answers, opts = {}) => {
    if (readOnly) return { ok: false, readOnly: true, row: null }
    if (!studentId || !unitId || !sectionType) return { ok: false, row: null }

    setState('saving')
    const res = await queue(() => saveAttempt(supabase, {
      studentId, unitId, sectionType, activityId,
      answers,
      submit: !!opts.submit,
      score: opts.score ?? null,
      timeSpent: opts.timeSpent ?? null,
      // Explicit once known, so a concurrent attempt can never be targeted by
      // accident. Null on the first write lets the server resolve it.
      attemptNumber: newAttemptRef.current ? null : (opts.attemptNumber ?? attemptRef.current),
      newAttempt: newAttemptRef.current,
      // Opt-in: only sections with a meaningful running total (vocabulary
      // drills) score a row that is still in progress.
      writeScore: !!opts.writeScore,
      extra: opts.extra ?? null,
    }))

    if (!alive.current) return res

    if (res.ok) {
      newAttemptRef.current = false
      attemptRef.current = res.row.attempt_number
      if (res.row.status === 'completed') submittedRef.current = true
      setRow(res.row)
      setLastSavedAt(new Date())
      setState('saved')
    } else if (res.queued) {
      setState('queued')
    } else {
      setState('error')
    }
    return res
  }, [readOnly, studentId, unitId, sectionType, activityId, queue])

  /** Persist immediately. */
  const saveNow = useCallback((answers, opts) => {
    clearTimeout(timerRef.current)
    pendingRef.current = null
    return commit(answers, opts)
  }, [commit])

  /** Debounced autosave — typing costs one write, not one per keystroke. */
  const save = useCallback((answers, opts = {}) => {
    if (readOnly) return
    // An attempt already handed in is closed. This is belt-and-braces: the
    // database refuses to reopen it too.
    if (submittedRef.current && !opts.submit) return
    pendingRef.current = { answers, opts }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const p = pendingRef.current
      pendingRef.current = null
      if (p) commit(p.answers, p.opts)
    }, debounceMs)
  }, [readOnly, commit, debounceMs])

  /** Hand the attempt in. Always awaited by callers — never fire-and-forget. */
  const submit = useCallback((answers, opts = {}) =>
    saveNow(answers, { ...opts, submit: true }), [saveNow])

  /** Begin a fresh attempt; the server allocates the number. */
  const startNewAttempt = useCallback(() => {
    newAttemptRef.current = true
    submittedRef.current = false
    attemptRef.current = null
    setRow(null)
    setState('idle')
  }, [])

  /** Adopt an attempt restored by the section's own loader. */
  const adoptAttempt = useCallback((existing) => {
    if (!existing) return
    attemptRef.current = existing.attempt_number ?? null
    submittedRef.current = existing.status === 'completed'
    setRow(existing)
  }, [])

  const flush = useCallback(() => {
    const p = pendingRef.current
    if (!p) return
    pendingRef.current = null
    clearTimeout(timerRef.current)
    commit(p.answers, p.opts)
  }, [commit])

  // Flush on the ways a phone actually takes the page away. iOS may kill a
  // backgrounded tab without firing pagehide at all — that is what the outbox
  // is for; this just shortens the window.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  return {
    state, lastSavedAt, row, readOnly,
    attemptNumber: attemptRef.current,
    isSubmitted: submittedRef.current,
    save, saveNow, submit, startNewAttempt, adoptAttempt, flush,
  }
}
