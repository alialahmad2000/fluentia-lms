import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { applyRating, cardToRow, previewSchedule, rowToCard, Rating } from '../lib/fsrs'

/**
 * Daily Anki review session controller.
 *
 * Handles:
 *  - Auto-enrolment of vocabulary at the student's current level.
 *  - Fetching today's queue (new + due).
 *  - Applying FSRS ratings, updating `anki_cards`, logging to `anki_review_logs`.
 *  - Streak updates on session completion.
 *  - XP rewards: +1 per review, +5 on completion, +10 bonus for 7-day streak.
 *
 * @param {string} studentId
 * @param {object} settings — `{ daily_new_cards, daily_max_reviews, review_order }`
 */
export function useAnkiSession(studentId, settings) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [queue, setQueue] = useState([]) // [{ card, vocab }]
  const [currentIdx, setCurrentIdx] = useState(0)
  const [reviewedCount, setReviewedCount] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [startedAt] = useState(() => Date.now())
  const [completed, setCompleted] = useState(false)
  const [dueCountTomorrow, setDueCountTomorrow] = useState(0)
  const cardStartRef = useRef(Date.now())

  const current = queue[currentIdx] || null

  // ── 1. Enroll missing vocabulary at student level ───
  const enrollMissing = useCallback(async () => {
    if (!studentId) return
    // Fetch student's academic level
    const { data: stu } = await supabase
      .from('students')
      .select('academic_level')
      .eq('id', studentId)
      .maybeSingle()
    const academicLevel = stu?.academic_level ?? 0

    // Fetch vocabulary for all levels up to and including student's current level
    const { data: eligibleVocab, error: vErr } = await supabase
      .from('curriculum_vocabulary')
      .select(
        'id, reading:curriculum_readings!reading_id(unit:curriculum_units!unit_id(level:curriculum_levels!level_id(level_number)))'
      )
    if (vErr) throw vErr

    const eligible = (eligibleVocab || []).filter((v) => {
      const lvl = v.reading?.unit?.level?.level_number
      return typeof lvl === 'number' && lvl <= academicLevel
    })

    if (eligible.length === 0) return

    // Fetch existing cards (paginate to bypass 1k default limit)
    const existingIds = new Set()
    let from = 0
    for (;;) {
      const { data, error: exErr } = await supabase
        .from('anki_cards')
        .select('vocabulary_id')
        .eq('student_id', studentId)
        .range(from, from + 999)
      if (exErr) throw exErr
      if (!data || data.length === 0) break
      for (const r of data) existingIds.add(r.vocabulary_id)
      if (data.length < 1000) break
      from += 1000
    }

    const missing = eligible.filter((v) => !existingIds.has(v.id))
    if (missing.length === 0) return

    // Bulk insert in chunks of 500
    const now = new Date().toISOString()
    for (let i = 0; i < missing.length; i += 500) {
      const slice = missing.slice(i, i + 500).map((v) => ({
        student_id: studentId,
        vocabulary_id: v.id,
        state: 'new',
        due_at: now,
      }))
      const { error: insErr } = await supabase.from('anki_cards').insert(slice)
      if (insErr && !insErr.message?.includes('duplicate')) throw insErr
    }
  }, [studentId])

  // ── 2. Fetch today's queue ──────────────────────────
  const fetchQueue = useCallback(async () => {
    if (!studentId || !settings) return
    const nowIso = new Date().toISOString()

    // New cards (limited)
    const { data: newRows, error: nErr } = await supabase
      .from('anki_cards')
      .select(
        'id, state, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, due_at, last_review_at, vocabulary:curriculum_vocabulary!vocabulary_id(id, word, definition_en, definition_ar, example_sentence, part_of_speech, audio_url, synonyms, antonyms)'
      )
      .eq('student_id', studentId)
      .eq('state', 'new')
      .order('created_at', { ascending: true })
      .limit(settings.daily_new_cards || 20)
    if (nErr) throw nErr

    // Due review cards (limited)
    const maxReviews = settings.daily_max_reviews || 200
    let reviewQuery = supabase
      .from('anki_cards')
      .select(
        'id, state, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, due_at, last_review_at, vocabulary:curriculum_vocabulary!vocabulary_id(id, word, definition_en, definition_ar, example_sentence, part_of_speech, audio_url, synonyms, antonyms)'
      )
      .eq('student_id', studentId)
      .neq('state', 'new')
      .lte('due_at', nowIso)
      .limit(maxReviews)
    if (settings.review_order === 'random') {
      // Supabase has no native random(); ordering by id is pseudo-random enough for now.
      reviewQuery = reviewQuery.order('id', { ascending: false })
    } else {
      reviewQuery = reviewQuery.order('due_at', { ascending: true })
    }
    const { data: dueRows, error: dErr } = await reviewQuery
    if (dErr) throw dErr

    const combined = [...(newRows || []), ...(dueRows || [])]
      .filter((r) => r.vocabulary)
      .map((r) => ({
        card: {
          ...rowToCard(r),
          _id: r.id,
        },
        row: r,
        vocab: r.vocabulary,
      }))

    setQueue(combined)
    setCurrentIdx(0)
    setReviewedCount(0)
    setCorrectCount(0)
    setCompleted(false)
    cardStartRef.current = Date.now()

    // Count cards due tomorrow for the completion screen
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(23, 59, 59, 999)
    const { count: tomCount } = await supabase
      .from('anki_cards')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .neq('state', 'new')
      .lte('due_at', tomorrow.toISOString())
    setDueCountTomorrow(tomCount || 0)
  }, [studentId, settings])

  // ── 3. Initial load ─────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function init() {
      if (!studentId || !settings) return
      setLoading(true)
      setError(null)
      try {
        await enrollMissing()
        if (cancelled) return
        await fetchQueue()
      } catch (e) {
        if (!cancelled) setError(e.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [studentId, settings, enrollMissing, fetchQueue])

  // ── 4. Preview the 4 possible next intervals ────────
  const previews = useMemo(() => {
    if (!current) return null
    const outcomes = previewSchedule(current.card, new Date())
    return {
      [Rating.Again]: outcomes[Rating.Again]?.card?.due,
      [Rating.Hard]: outcomes[Rating.Hard]?.card?.due,
      [Rating.Good]: outcomes[Rating.Good]?.card?.due,
      [Rating.Easy]: outcomes[Rating.Easy]?.card?.due,
    }
  }, [current])

  // ── 5. Rate the current card ────────────────────────
  const rate = useCallback(
    async (rating) => {
      if (!current) return
      const now = new Date()
      const durationMs = Date.now() - cardStartRef.current
      const { card: nextCard } = applyRating(current.card, rating, now)
      const payload = cardToRow(nextCard)

      // Update card row
      const { error: uErr } = await supabase
        .from('anki_cards')
        .update(payload)
        .eq('id', current.card._id)
      if (uErr) {
        setError(uErr.message)
        return
      }

      // Insert review log
      await supabase.from('anki_review_logs').insert({
        card_id: current.card._id,
        student_id: studentId,
        rating,
        state_before: stateText(current.card.state),
        state_after: payload.state,
        elapsed_days: payload.elapsed_days,
        scheduled_days: payload.scheduled_days,
        stability_after: payload.stability,
        difficulty_after: payload.difficulty,
        duration_ms: durationMs,
      })

      // +1 XP per review
      await insertXp(studentId, 1, 'anki_review', `Anki rating ${rating}`)

      // Advance session state
      setReviewedCount((c) => c + 1)
      if (rating !== Rating.Again) setCorrectCount((c) => c + 1)

      // If student said "Again", re-queue the card at the end
      if (rating === Rating.Again) {
        setQueue((prev) => {
          const copy = [...prev]
          const [cur] = copy.splice(currentIdx, 1)
          // Update in-memory card too
          cur.card = { ...nextCard, _id: current.card._id }
          copy.push(cur)
          return copy
        })
      } else {
        setCurrentIdx((i) => i + 1)
      }

      cardStartRef.current = Date.now()
    },
    [current, currentIdx, studentId]
  )

  // ── 6. Detect completion + streak update ────────────
  useEffect(() => {
    if (completed) return
    if (!loading && queue.length > 0 && currentIdx >= queue.length) {
      completeSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, queue.length, loading, completed])

  const completeSession = useCallback(async () => {
    if (!studentId || completed) return
    setCompleted(true)
    try {
      // Read current streak
      const { data: stu } = await supabase
        .from('students')
        .select('anki_streak_current, anki_streak_best, anki_last_session_at')
        .eq('id', studentId)
        .maybeSingle()

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const lastSession = stu?.anki_last_session_at ? new Date(stu.anki_last_session_at) : null
      lastSession?.setHours(0, 0, 0, 0)

      let streak = stu?.anki_streak_current || 0
      if (!lastSession) {
        streak = 1
      } else {
        const diffDays = Math.round((today - lastSession) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) {
          // Already counted for today — do nothing
        } else if (diffDays === 1) {
          streak += 1
        } else {
          streak = 1
        }
      }

      const best = Math.max(stu?.anki_streak_best || 0, streak)

      await supabase
        .from('students')
        .update({
          anki_streak_current: streak,
          anki_streak_best: best,
          anki_last_session_at: new Date().toISOString(),
        })
        .eq('id', studentId)

      // +5 XP for completing a session
      await insertXp(studentId, 5, 'anki_session_complete', 'Completed daily Anki review')

      // +10 XP bonus on 7-day streak milestones
      if (streak > 0 && streak % 7 === 0) {
        await insertXp(
          studentId,
          10,
          'anki_streak_bonus',
          `Anki ${streak}-day streak bonus`
        )
      }
    } catch (e) {
      console.error('[useAnkiSession] completeSession error', e)
    }
  }, [studentId, completed])

  // Stats for display
  const stats = useMemo(
    () => ({
      total: queue.length,
      remaining: Math.max(0, queue.length - currentIdx),
      reviewed: reviewedCount,
      correct: correctCount,
      accuracy: reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 0,
      durationSec: Math.round((Date.now() - startedAt) / 1000),
      completed,
      dueCountTomorrow,
    }),
    [queue.length, currentIdx, reviewedCount, correctCount, startedAt, completed, dueCountTomorrow]
  )

  return {
    loading,
    error,
    current,
    stats,
    previews,
    rate,
    refetch: fetchQueue,
  }
}

// ── Helpers ──────────────────────────────────────────

function stateText(numericState) {
  const m = { 0: 'new', 1: 'learning', 2: 'review', 3: 'relearning' }
  return m[numericState] || 'new'
}

async function insertXp(studentId, amount, reason, description) {
  // DB trigger `on_xp_transaction_insert` auto-increments students.xp_total.
  try {
    await supabase.from('xp_transactions').insert({
      student_id: studentId,
      amount,
      reason,
      description,
    })
  } catch {
    // swallow — XP is non-critical for the review flow
  }
}
