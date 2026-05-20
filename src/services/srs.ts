/**
 * SRS Service — single FSRS algorithm authority for vocabulary review.
 *
 * Wraps ts-fsrs v5 + curriculum_vocabulary_srs (FSRS-augmented as of
 * migration 20260520140000). Replaces the legacy SM-2 scheduling.
 *
 * Schema notes:
 *   - Table uses `student_id` (matches profiles.id and auth.uid()).
 *   - Legacy SM-2 columns (ease_factor, interval_days, repetitions,
 *     next_review_at, last_quality) are still present but unused by FSRS.
 *     Don't write to them. Leave for read-back if needed.
 *   - srs_review_logs stores every rating event for Hard Words classification
 *     (Prompt 04) and for retention/streak analytics.
 *
 * Callers must pass `profileId` (== `profile.id` == `auth.uid()`).
 * Never use `user.id`.
 */

import {
  FSRS,
  generatorParameters,
  createEmptyCard,
  State,
  type Card,
  type Grade,
} from 'ts-fsrs'
import { supabase } from '../lib/supabase'

// ──────────────────────────────────────────────────────────────────
// FSRS instance — tuned for vocabulary retention
// ──────────────────────────────────────────────────────────────────

const params = generatorParameters({
  enable_fuzz: true,         // small random offset around due dates
  enable_short_term: true,   // honor short-term learning steps
  request_retention: 0.9,    // target 90% retention
})

export const fsrs = new FSRS(params)

// ──────────────────────────────────────────────────────────────────
// Rating constants — UI maps these to Arabic buttons
// ──────────────────────────────────────────────────────────────────

export const RATING = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4,
} as const

export type Rating = 1 | 2 | 3 | 4

export const RATING_AR: Record<Rating, string> = {
  1: 'مرة أخرى',
  2: 'صعبة',
  3: 'جيد',
  4: 'سهلة',
}

// ──────────────────────────────────────────────────────────────────
// State <-> text conversion (FSRS uses numeric enum, DB uses text)
// ──────────────────────────────────────────────────────────────────

const STATE_TO_TEXT = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
} as const

const TEXT_TO_STATE: Record<string, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
}

// ──────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────

export interface SrsRow {
  id?: string
  student_id: string
  vocabulary_id: string
  state: 'new' | 'learning' | 'review' | 'relearning'
  due: string             // ISO timestamp
  last_review: string | null
  stability: number
  difficulty: number
  reps: number
  lapses: number
  elapsed_days: number
  scheduled_days: number
}

export interface SrsRowWithVocab extends SrsRow {
  curriculum_vocabulary: {
    id: string
    word: string
    definition_en: string
    definition_ar: string | null
    example_sentence: string | null
    part_of_speech: string | null
    pronunciation_ipa: string | null
    audio_url: string | null
    cefr_level: string | null
    tier: string | null
    pronunciation_alert: object | null
  }
}

export interface RateResult {
  card: SrsRow                   // updated card fields (for UPDATE)
  preview: Date                  // when the card is next due
  log: {                         // for srs_review_logs insert
    state_before: string
    state_after: string
    stability_after: number
    difficulty_after: number
    elapsed_days: number
    scheduled_days: number
  }
}

// ──────────────────────────────────────────────────────────────────
// Pure helpers
// ──────────────────────────────────────────────────────────────────

/** Convert a DB row to a ts-fsrs Card structure. */
function rowToCard(row: SrsRow): Card {
  return {
    due: new Date(row.due),
    stability: Number(row.stability) || 0,
    difficulty: Number(row.difficulty) || 0,
    elapsed_days: row.elapsed_days || 0,
    scheduled_days: row.scheduled_days || 0,
    learning_steps: 0,
    reps: row.reps || 0,
    lapses: row.lapses || 0,
    state: TEXT_TO_STATE[row.state] ?? State.New,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  }
}

/** Convert a ts-fsrs Card back to a DB row patch. */
function cardToRow(card: Card, studentId: string, vocabularyId: string): SrsRow {
  return {
    student_id: studentId,
    vocabulary_id: vocabularyId,
    state: STATE_TO_TEXT[card.state] as SrsRow['state'],
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    due: card.due.toISOString(),
    last_review: card.last_review ? card.last_review.toISOString() : null,
  }
}

/**
 * Pure FSRS calculation. No DB. Use this to preview "next due in X" for
 * each rating button in the UI before the student commits.
 */
export function rateCard(row: SrsRow, rating: Rating, now: Date = new Date()): RateResult {
  const inputCard = rowToCard(row)
  const scheduled = fsrs.repeat(inputCard, now)
  const item = scheduled[rating as Grade]
  if (!item) throw new Error(`Invalid rating: ${rating}`)

  const nextCard = cardToRow(item.card, row.student_id, row.vocabulary_id)

  return {
    card: nextCard,
    preview: item.card.due,
    log: {
      state_before: STATE_TO_TEXT[inputCard.state],
      state_after: nextCard.state,
      stability_after: item.card.stability,
      difficulty_after: item.card.difficulty,
      elapsed_days: item.card.elapsed_days,
      scheduled_days: item.card.scheduled_days,
    },
  }
}

/**
 * Preview all 4 rating outcomes for a card (without committing).
 * UI uses this to show "بعد ١٠ ث / بعد يوم / بعد ٤ أيام / بعد ٩ أيام"
 * underneath each button.
 */
export function previewAllRatings(row: SrsRow, now: Date = new Date()) {
  return {
    again: rateCard(row, RATING.AGAIN, now),
    hard: rateCard(row, RATING.HARD, now),
    good: rateCard(row, RATING.GOOD, now),
    easy: rateCard(row, RATING.EASY, now),
  }
}

// ──────────────────────────────────────────────────────────────────
// DB operations
// ──────────────────────────────────────────────────────────────────

/**
 * Apply a rating: compute FSRS update, write to DB, log the event.
 * Returns the updated row.
 *
 * If no SRS row exists yet for this (student, vocab) pair, this function
 * creates one in state='new' first, then applies the rating.
 */
export async function applyRating(
  vocabularyId: string,
  rating: Rating,
  profileId: string
): Promise<SrsRow> {
  // 1) Load existing row, or build a fresh empty card
  const { data: existing, error: fetchErr } = await supabase
    .from('curriculum_vocabulary_srs')
    .select('*')
    .eq('student_id', profileId)
    .eq('vocabulary_id', vocabularyId)
    .maybeSingle()

  if (fetchErr) throw fetchErr

  let row: SrsRow
  if (existing) {
    row = existing as SrsRow
  } else {
    const empty = createEmptyCard(new Date())
    row = cardToRow(empty, profileId, vocabularyId)
  }

  // 2) Compute FSRS update
  const result = rateCard(row, rating)

  // 3) Upsert the updated card
  const { data: updated, error: upErr } = await supabase
    .from('curriculum_vocabulary_srs')
    .upsert(
      {
        student_id: profileId,
        vocabulary_id: vocabularyId,
        state: result.card.state,
        due: result.card.due,
        last_review: result.card.last_review,
        stability: result.card.stability,
        difficulty: result.card.difficulty,
        reps: result.card.reps,
        lapses: result.card.lapses,
        elapsed_days: result.card.elapsed_days,
        scheduled_days: result.card.scheduled_days,
      },
      { onConflict: 'student_id,vocabulary_id' }
    )
    .select()
    .maybeSingle()

  if (upErr) throw upErr
  if (!updated) throw new Error('SRS upsert returned no row (RLS?)')

  // 4) Insert log row (best-effort — log failure should not block the review)
  const { error: logErr } = await supabase.from('srs_review_logs').insert({
    student_id: profileId,
    vocabulary_id: vocabularyId,
    rating,
    state_before: result.log.state_before,
    state_after: result.log.state_after,
    stability_after: result.log.stability_after,
    difficulty_after: result.log.difficulty_after,
    elapsed_days: result.log.elapsed_days,
    scheduled_days: result.log.scheduled_days,
  })

  if (logErr) {
    // Don't throw — log it but let the rating commit stand
    console.warn('[srs] Failed to insert review log:', logErr.message)
  }

  return updated as SrsRow
}

/**
 * Get cards due now, joined with vocabulary content for display.
 * Ordered by due ascending (most overdue first).
 */
export async function getDueCards(
  profileId: string,
  limit = 200
): Promise<SrsRowWithVocab[]> {
  const { data, error } = await supabase
    .from('curriculum_vocabulary_srs')
    .select(`
      *,
      curriculum_vocabulary!inner (
        id, word, definition_en, definition_ar, example_sentence,
        part_of_speech, pronunciation_ipa, audio_url, cefr_level, tier,
        pronunciation_alert
      )
    `)
    .eq('student_id', profileId)
    .in('state', ['review', 'learning', 'relearning'])
    .lte('due', new Date().toISOString())
    .order('due', { ascending: true })
    .limit(limit)

  if (error) throw error
  return (data || []) as SrsRowWithVocab[]
}

/** Count of cards due right now. Cheap header check. */
export async function getDueCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('curriculum_vocabulary_srs')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', profileId)
    .in('state', ['review', 'learning', 'relearning'])
    .lte('due', new Date().toISOString())

  if (error) throw error
  return count ?? 0
}

/**
 * How many "new" cards the student can pull today, respecting their
 * daily limit and what they've already pulled.
 *
 * Implementation: count today's review logs where state_before='new'
 * (i.e., new cards introduced today). Daily budget = limit - introduced.
 */
export async function getNewCardsAvailable(
  profileId: string,
  dailyLimit: number
): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { count, error } = await supabase
    .from('srs_review_logs')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', profileId)
    .eq('state_before', 'new')
    .gte('reviewed_at', startOfDay.toISOString())

  if (error) throw error
  const introduced = count ?? 0
  return Math.max(0, dailyLimit - introduced)
}

/**
 * Get available new cards (state='new'), joined with vocabulary.
 * Respects the daily limit. Order is determined by srs_review_order
 * preference on profiles (level | random | unit) — for now uses level.
 */
export async function getNewCards(
  profileId: string,
  limit = 20
): Promise<SrsRowWithVocab[]> {
  const { data, error } = await supabase
    .from('curriculum_vocabulary_srs')
    .select(`
      *,
      curriculum_vocabulary!inner (
        id, word, definition_en, definition_ar, example_sentence,
        part_of_speech, pronunciation_ipa, audio_url, cefr_level, tier,
        pronunciation_alert
      )
    `)
    .eq('student_id', profileId)
    .eq('state', 'new')
    .order('due', { ascending: true })
    .limit(limit)

  if (error) throw error
  return (data || []) as SrsRowWithVocab[]
}

/**
 * Consecutive days the student has reviewed at least one card.
 * Counts back from today. Stops at the first day with no activity.
 */
export async function getStreak(profileId: string): Promise<number> {
  // Pull the last 60 days of review_log dates (cap to bound the query).
  const lookback = new Date()
  lookback.setDate(lookback.getDate() - 60)

  const { data, error } = await supabase
    .from('srs_review_logs')
    .select('reviewed_at')
    .eq('student_id', profileId)
    .gte('reviewed_at', lookback.toISOString())
    .order('reviewed_at', { ascending: false })

  if (error) throw error

  // Build a set of YYYY-MM-DD strings the student reviewed on
  const reviewDays = new Set<string>()
  for (const row of data || []) {
    const d = new Date((row as { reviewed_at: string }).reviewed_at)
    reviewDays.add(d.toISOString().slice(0, 10))
  }

  // Walk back from today; allow today to be empty (streak counts up to yesterday)
  let streak = 0
  const cursor = new Date()
  // Check today first — if present, include in streak
  if (reviewDays.has(cursor.toISOString().slice(0, 10))) {
    streak = 1
    cursor.setDate(cursor.getDate() - 1)
    while (reviewDays.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
  } else {
    // Today empty — check yesterday; if yesterday present, streak starts at 1 from yesterday backward
    cursor.setDate(cursor.getDate() - 1)
    while (reviewDays.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
  }

  return streak
}

/** Counts for the dashboard hero block. Cheap one-shot. */
export async function getDashboardCounts(profileId: string, dailyNewLimit: number) {
  const [dueCount, newAvailable, streak] = await Promise.all([
    getDueCount(profileId),
    getNewCardsAvailable(profileId, dailyNewLimit),
    getStreak(profileId),
  ])
  return { dueCount, newAvailable, streak }
}

// ──────────────────────────────────────────────────────────────────
// Per-word helpers (Prompt 07 Word Detail Sheet)
// ──────────────────────────────────────────────────────────────────

export interface WordSrsStats {
  due: Date | null
  lapses: number
  difficulty: number
  state: 'new' | 'learning' | 'review' | 'relearning'
  reps: number
}

/**
 * Read this student's SRS state for one word.
 * Returns null if no SRS row exists yet (word has never been touched
 * through the SRS flow).
 */
export async function getWordSrsStats(
  profileId: string,
  vocabularyId: string
): Promise<WordSrsStats | null> {
  const { data, error } = await supabase
    .from('curriculum_vocabulary_srs')
    .select('due, lapses, difficulty, state, reps')
    .eq('student_id', profileId)
    .eq('vocabulary_id', vocabularyId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    due: data.due ? new Date(data.due) : null,
    lapses: data.lapses ?? 0,
    difficulty: Number(data.difficulty) || 0,
    state: (data.state ?? 'new') as WordSrsStats['state'],
    reps: data.reps ?? 0,
  }
}

/**
 * Make a word reviewable right now. Upserts the SRS row with due=NOW().
 * - If a row exists: UPDATE due=NOW().
 * - If no row exists: INSERT with FSRS defaults (createEmptyCard from
 *   ts-fsrs but we keep it inline here to avoid importing ts-fsrs into
 *   the calling component).
 *
 * Used by Word Detail Sheet's "أضفها للمراجعة الفورية" CTA.
 */
export async function addWordToImmediateReview(
  profileId: string,
  vocabularyId: string
): Promise<SrsRow> {
  const nowIso = new Date().toISOString()

  // First check if a row exists
  const { data: existing, error: readErr } = await supabase
    .from('curriculum_vocabulary_srs')
    .select('id')
    .eq('student_id', profileId)
    .eq('vocabulary_id', vocabularyId)
    .maybeSingle()
  if (readErr) throw readErr

  if (existing) {
    const { data: updated, error: upErr } = await supabase
      .from('curriculum_vocabulary_srs')
      .update({ due: nowIso })
      .eq('student_id', profileId)
      .eq('vocabulary_id', vocabularyId)
      .select()
      .maybeSingle()
    if (upErr) throw upErr
    if (!updated) throw new Error('SRS update returned no row (RLS?)')
    return updated as SrsRow
  }

  // Otherwise insert a fresh card with state='new' due NOW
  const empty = createEmptyCard(new Date())
  const insertRow = {
    student_id: profileId,
    vocabulary_id: vocabularyId,
    state: 'new' as const,
    due: nowIso,
    last_review: null,
    stability: empty.stability,
    difficulty: empty.difficulty,
    reps: empty.reps,
    lapses: empty.lapses,
    elapsed_days: empty.elapsed_days,
    scheduled_days: empty.scheduled_days,
  }
  const { data: inserted, error: insErr } = await supabase
    .from('curriculum_vocabulary_srs')
    .insert(insertRow)
    .select()
    .maybeSingle()
  if (insErr) throw insErr
  if (!inserted) throw new Error('SRS insert returned no row (RLS?)')
  return inserted as SrsRow
}
