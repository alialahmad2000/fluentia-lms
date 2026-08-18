/**
 * Shared save primitives for the student_curriculum_progress write paths
 * (reading · listening · grammar).
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * Every tab reimplemented the same shape:
 *
 *     if (currentRowId) { UPDATE ... } else { INSERT ...; currentRowId = new.id }
 *
 * `currentRowId` is only set once the INSERT *resolves*, and nothing stopped a
 * second autosave from starting while the first INSERT was still in flight. On
 * a slow connection every answer therefore INSERTed its OWN row:
 *
 *     answer 1 → POST → row A {q1}
 *     answer 2 → POST → row B {q1,q2}      (currentRowId still null)
 *     answer 3 → POST → row C {q1,q2,q3}
 *     answer 4 → POST → row D {q1..q4}
 *
 * Four rows, all is_latest=true. On reload the loader did
 * `rows.find(r => r.is_latest)` over a list ordered only by attempt_number —
 * every row has the same attempt_number, so Postgres returned them in arbitrary
 * order and the student was restored onto row A. Her four answers rendered as
 * one, and the section never reached «completed», so unit progress never moved.
 * Reproduced on prod 2026-08-11: answered 4, app restored 1.
 *
 * `createSaveQueue` removes the race by serialising writes per activity, so the
 * INSERT has always resolved (and set currentRowId) before the next write runs.
 * `pickLatestAttempt` is the safety net for rows already written this way: it
 * chooses deterministically and MERGES same-attempt duplicates so no answer is
 * ever dropped, even if a duplicate somehow slips through.
 */

/**
 * Serialise async writes. Each task starts only after the previous one settles,
 * so an in-flight INSERT can never be raced by the next autosave.
 * A rejected task never poisons the chain — the queue keeps draining.
 */
export function createSaveQueue() {
  let tail = Promise.resolve()
  return function enqueue(task) {
    const run = tail.then(() => task())
    tail = run.then(() => {}, () => {})
    return run
  }
}

/** How many questions an `answers` payload actually holds (both shapes). */
export function countAnswers(answers) {
  if (!answers || typeof answers !== 'object') return 0
  // listening stores { questions: [ { studentAnswer } ] }
  if (Array.isArray(answers.questions)) {
    return answers.questions.filter(
      (q) => q && q.studentAnswer != null && q.studentAnswer !== 'null' && q.studentAnswer !== ''
    ).length
  }
  // reading / grammar store a flat { [questionId]: answer } map
  return Object.keys(answers).length
}

/**
 * Merge two answer payloads without ever losing an answer.
 * `primary` wins per key; keys only present in `secondary` are carried over.
 */
export function mergeAnswers(primary, secondary) {
  if (!secondary || typeof secondary !== 'object') return primary
  if (!primary || typeof primary !== 'object') return secondary
  // Listening's array shape can't be key-merged safely — keep the fuller payload.
  if (Array.isArray(primary.questions) || Array.isArray(secondary.questions)) {
    return countAnswers(secondary) > countAnswers(primary) ? secondary : primary
  }
  return { ...secondary, ...primary }
}

/**
 * Deterministically choose the row to keep writing to, and salvage anything
 * stranded in duplicate rows of the same attempt.
 *
 * Returns { row, answers, duplicates }:
 *   row        — the row to adopt as currentRowId
 *   answers    — its answers merged with any same-attempt duplicates
 *   duplicates — the losing same-attempt rows (demote / ignore these)
 */
export function pickLatestAttempt(rows) {
  if (!rows?.length) return null

  const sorted = [...rows].sort(
    (a, b) =>
      (b.attempt_number || 1) - (a.attempt_number || 1) ||
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
  )

  // A completed row for the newest attempt always wins — it is authoritative.
  const newestAttempt = sorted[0].attempt_number || 1
  const sameAttempt = sorted.filter((r) => (r.attempt_number || 1) === newestAttempt)
  const completed = sameAttempt.find((r) => r.status === 'completed')

  if (completed) {
    return { row: completed, answers: completed.answers, duplicates: sameAttempt.filter((r) => r.id !== completed.id) }
  }

  // Otherwise prefer the row holding the MOST answers (the race leaves the
  // richest payload in the newest row, but ordering is not guaranteed), then
  // the newest. This is what stops "my answers were removed".
  const best = [...sameAttempt].sort(
    (a, b) => countAnswers(b.answers) - countAnswers(a.answers) || new Date(b.created_at || 0) - new Date(a.created_at || 0)
  )[0]

  const duplicates = sameAttempt.filter((r) => r.id !== best.id)
  const answers = duplicates.reduce((acc, r) => mergeAnswers(acc, r.answers), best.answers)

  return { row: best, answers, duplicates }
}

import { captureError } from './errorTracker'

/**
 * Report a save failure so it is DIAGNOSABLE.
 *
 * Until now every save path ended in `console.error`, which production strips —
 * so a student losing answers produced no signal for her AND no signal for us.
 * That is why the same complaint survived three rounds of fixes. These land in
 * `client_error_log`, which the daily academy digest already surfaces.
 */
export function reportSaveFailure({ section, phase, activityId, unitId, rowId, error, extra }) {
  try {
    const msg = error?.message || error?.error_description || String(error || 'unknown')
    captureError({
      kind: 'save_failed',
      message: `[${section}] ${phase}: ${msg}`.slice(0, 500),
      context: {
        section, phase, activity_id: activityId, unit_id: unitId, row_id: rowId,
        code: error?.code ?? null, details: error?.details ?? null, hint: error?.hint ?? null,
        ...(extra || {}),
      },
    })
  } catch { /* telemetry must never break a save */ }
}

/**
 * UPDATE a progress row and PROVE it hit something.
 *
 * PostgREST answers 200 for an update that matches ZERO rows, so
 * `.update(...).eq('id', rowId)` looks identical whether it wrote or wrote
 * nothing. If the row referenced by rowId has since disappeared — deleted,
 * attempt reset, is_latest flipped, RLS no longer matching — every autosave
 * after that silently goes nowhere while the student keeps answering. On reload
 * her answers are simply gone, with no error anywhere. That is the shape of
 * "إجاباتي تختفي".
 *
 * Returns { ok, missing, error }. `missing: true` means the row is gone and the
 * caller must INSERT a fresh one rather than keep writing into the void.
 */
export async function updateRowVerified(supabase, rowId, patch) {
  const { data, error } = await supabase
    .from('student_curriculum_progress')
    .update(patch)
    .eq('id', rowId)
    .select('id')
  if (error) return { ok: false, missing: false, error }
  if (!data || data.length === 0) return { ok: false, missing: true, error: null }
  return { ok: true, missing: false, error: null }
}

// ═══════════════════════════════════════════════════════════════════════════
// THE SINGLE WRITE PATH (2026-08-18)
//
// Everything above this line exists to make SEVEN hand-rolled save paths
// survivable: a queue to stop them racing, a picker to salvage the duplicate
// rows they left, a verifier to catch the updates that wrote nothing. Each was
// a correct fix to a real bug, and each had to be applied seven times.
//
// `saveAttempt` replaces all of it with one call to `save_activity_attempt`,
// which holds the contract in the database instead: idempotent, never shrinks a
// payload, never reopens a submitted attempt, recomputes is_best/is_latest in
// the same transaction, and RETURNS the persisted row so the caller verifies
// against reality rather than trusting HTTP 200.
// ═══════════════════════════════════════════════════════════════════════════

import { outboxKey, putEntry, removeEntry, drainOutbox, installOutboxDrain } from './saveOutbox'

/** Is this failure a transport problem (worth replaying) or a real rejection? */
function isTransportError(error) {
  if (!error) return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  const msg = String(error.message || error).toLowerCase()
  return msg.includes('failed to fetch') || msg.includes('networkerror') ||
         msg.includes('load failed') || msg.includes('timeout') ||
         msg.includes('network request failed')
}

function toRpcArgs({
  studentId, unitId, sectionType, activityId = null, answers = {},
  submit = false, score = null, timeSpent = null,
  attemptNumber = null, newAttempt = false, writeScore = false, extra = null,
}) {
  return {
    p_student_id: studentId,
    p_unit_id: unitId,
    p_section_type: sectionType,
    p_activity_id: activityId,
    p_answers: answers ?? {},
    p_submit: !!submit,
    p_score: score,
    p_time_spent: timeSpent,
    p_attempt_number: attemptNumber,
    p_new_attempt: !!newAttempt,
    p_write_score: !!writeScore,
    p_extra: extra ?? {},
  }
}

/**
 * Persist a student's work. Returns { ok, row, queued, error }.
 *
 *   ok:true            — the server confirmed it and `row` is what is stored
 *   queued:true        — the network failed; the work is in the durable outbox
 *                        and will replay. It is NOT lost, but it is NOT saved.
 *   ok:false,!queued   — the server rejected it. Reported to client_error_log.
 */
export async function saveAttempt(supabase, params) {
  const key = outboxKey(params)
  const args = toRpcArgs(params)

  // Durable FIRST, network second. If the tab dies during the request the work
  // is already on disk; a replay is harmless because the write is idempotent.
  await putEntry(key, args)

  try {
    const { data, error } = await supabase.rpc('save_activity_attempt', args)
    if (error) {
      if (isTransportError(error)) return { ok: false, queued: true, row: null, error }
      await removeEntry(key)
      reportSaveFailure({
        section: params.sectionType, phase: params.submit ? 'submit' : 'autosave',
        activityId: params.activityId, unitId: params.unitId, error,
        extra: { answer_count: countAnswers(params.answers) },
      })
      return { ok: false, queued: false, row: null, error }
    }

    // PostgREST returns a composite as an object (or a 1-element array).
    const row = Array.isArray(data) ? data[0] : data
    if (!row?.id) {
      await removeEntry(key)
      const err = { message: 'save_activity_attempt returned no row' }
      reportSaveFailure({
        section: params.sectionType, phase: 'no_row',
        activityId: params.activityId, unitId: params.unitId, error: err,
      })
      return { ok: false, queued: false, row: null, error: err }
    }

    await removeEntry(key)
    return { ok: true, queued: false, row, error: null }
  } catch (err) {
    if (isTransportError(err)) return { ok: false, queued: true, row: null, error: err }
    await removeEntry(key)
    reportSaveFailure({
      section: params.sectionType, phase: 'save_throw',
      activityId: params.activityId, unitId: params.unitId, error: err,
    })
    return { ok: false, queued: false, row: null, error: err }
  }
}

/** Replay queued work. Safe to call often — it self-serialises. */
export function drainSaves(supabase) {
  return drainOutbox(async (args) => {
    const { data, error } = await supabase.rpc('save_activity_attempt', args)
    if (error) {
      // A rejection (RLS, bad payload) is permanent — dropping it beats
      // replaying it forever. A transport error keeps its place in the queue.
      if (isTransportError(error)) return false
      reportSaveFailure({
        section: args.p_section_type, phase: 'outbox_replay',
        activityId: args.p_activity_id, unitId: args.p_unit_id, error,
      })
      return true
    }
    const row = Array.isArray(data) ? data[0] : data
    return !!row?.id
  })
}

/** Install the automatic replay triggers (online / tab-visible). Call once. */
export function installSaveRecovery(supabase) {
  return installOutboxDrain(async (args) => {
    const { data, error } = await supabase.rpc('save_activity_attempt', args)
    if (error) return !isTransportError(error)
    const row = Array.isArray(data) ? data[0] : data
    return !!row?.id
  })
}
