/**
 * Unified Vocabulary Service — the ONE source of truth for a student's
 * relationship with a word. Wraps ts-fsrs over the `vocab_cards` table, which
 * merges what used to be four siloed stores (curriculum_vocabulary_srs FSRS,
 * vocabulary_word_mastery exercise mastery, student_saved_words SM-2,
 * vocabulary_bank legacy). Every vocab surface reads/writes through here:
 *   - daily review (SrsHome / review session)
 *   - hard words drills
 *   - reading word-save  (addCard)
 *   - exercise / quiz outcomes (applyRating / markExercise)
 *   - "words known" + streak + due badges
 *
 * Card identity: one row per (student_id, word_normalized). curriculum_vocabulary_id
 * is the optional link to the catalog (for audio/IPA/family/pronunciation_alert).
 *
 * Callers must pass `profileId` (== profile.id == auth.uid()). Never use user.id.
 */

import {
  FSRS,
  generatorParameters,
  State,
  type Card,
  type Grade,
} from 'ts-fsrs'
import { supabase } from '../lib/supabase'

// ── FSRS instance (identical tuning to the legacy srs.ts so behaviour matches) ──
const params = generatorParameters({
  enable_fuzz: true,
  enable_short_term: true,
  request_retention: 0.9,
})
export const fsrs = new FSRS(params)

export const RATING = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 } as const
export type Rating = 1 | 2 | 3 | 4
export const RATING_AR: Record<Rating, string> = {
  1: 'مرة أخرى',
  2: 'صعبة',
  3: 'جيد',
  4: 'سهلة',
}

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

// "mastered" once a card is well-retained in review state (~3 weeks stability).
const MASTERED_STABILITY_DAYS = 21

// ── Types ──
export type CardState = 'new' | 'learning' | 'review' | 'relearning'
export type MasteryLevel = 'new' | 'learning' | 'mastered'

export interface VocabCard {
  id: string
  student_id: string
  curriculum_vocabulary_id: string | null
  word: string
  word_normalized: string
  meaning_ar: string | null
  meaning_en: string | null
  context_sentence: string | null
  source: string
  state: CardState
  stability: number
  difficulty: number
  due: string
  last_review: string | null
  reps: number
  lapses: number
  elapsed_days: number
  scheduled_days: number
  mastery_level: MasteryLevel
  meaning_exercise_passed: boolean
  sentence_exercise_passed: boolean
  listening_exercise_passed: boolean
  hw_correct_streak: number
  hw_drill_modes_seen: string[]
  mastered_at: string | null
  last_practiced_at: string | null
}

// curriculum_vocabulary fields a review card likes to show (audio/IPA/enrichment)
export const VOCAB_CONTENT_SELECT =
  'curriculum_vocabulary ( id, word, definition_en, definition_ar, example_sentence, part_of_speech, pronunciation_ipa, audio_url, cefr_level, tier, synonyms, antonyms, word_family, pronunciation_alert )'

export interface VocabCardWithContent extends VocabCard {
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
    synonyms: unknown
    antonyms: unknown
    word_family: unknown
    pronunciation_alert: unknown
  } | null
}

// ── Pure helpers ──
function rowToFsrsCard(row: VocabCard): Card {
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

/** Derive the display mastery level from FSRS state + exercise completion. */
export function deriveMastery(
  state: CardState,
  stability: number,
  flags: { meaning?: boolean; sentence?: boolean; listening?: boolean }
): MasteryLevel {
  const allExercises = !!flags.meaning && !!flags.sentence && !!flags.listening
  if (allExercises || (state === 'review' && stability >= MASTERED_STABILITY_DAYS)) {
    return 'mastered'
  }
  if (
    state === 'learning' ||
    state === 'relearning' ||
    state === 'review' ||
    flags.meaning ||
    flags.sentence ||
    flags.listening
  ) {
    return 'learning'
  }
  return 'new'
}

/** Pure FSRS preview for one rating (no DB) — used for "next due in X" labels. */
export function previewRating(row: VocabCard, rating: Rating, now: Date = new Date()) {
  const scheduled = fsrs.repeat(rowToFsrsCard(row), now)
  const item = scheduled[rating as Grade]
  if (!item) throw new Error(`Invalid rating: ${rating}`)
  return { card: item.card, due: item.card.due }
}

export function previewAllRatings(row: VocabCard, now: Date = new Date()) {
  return {
    again: previewRating(row, RATING.AGAIN, now),
    hard: previewRating(row, RATING.HARD, now),
    good: previewRating(row, RATING.GOOD, now),
    easy: previewRating(row, RATING.EASY, now),
  }
}

// ── DB operations ──

/**
 * Apply a rating to a card: compute FSRS, persist, recompute mastery, log the
 * event. Returns the updated card. Pass the card's `id`.
 */
export async function applyRating(
  cardId: string,
  rating: Rating,
  profileId: string
): Promise<VocabCard> {
  const { data: existing, error: fetchErr } = await supabase
    .from('vocab_cards')
    .select('*')
    .eq('id', cardId)
    .eq('student_id', profileId)
    .maybeSingle()
  if (fetchErr) throw fetchErr
  if (!existing) throw new Error('vocab card not found (RLS?)')

  const row = existing as VocabCard
  const stateBefore = row.state
  const scheduled = fsrs.repeat(rowToFsrsCard(row), new Date())
  const item = scheduled[rating as Grade]
  if (!item) throw new Error(`Invalid rating: ${rating}`)
  const c = item.card
  const nextState = STATE_TO_TEXT[c.state] as CardState

  const mastery = deriveMastery(nextState, c.stability, {
    meaning: row.meaning_exercise_passed,
    sentence: row.sentence_exercise_passed,
    listening: row.listening_exercise_passed,
  })

  const patch = {
    state: nextState,
    stability: c.stability,
    difficulty: c.difficulty,
    due: c.due.toISOString(),
    last_review: (c.last_review ?? new Date()).toISOString(),
    reps: c.reps,
    lapses: c.lapses,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    mastery_level: mastery,
    mastered_at:
      mastery === 'mastered' ? row.mastered_at ?? new Date().toISOString() : null,
    last_practiced_at: new Date().toISOString(),
  }

  const { data: updated, error: upErr } = await supabase
    .from('vocab_cards')
    .update(patch)
    .eq('id', cardId)
    .eq('student_id', profileId)
    .select('*')
    .maybeSingle()
  if (upErr) throw upErr
  if (!updated) throw new Error('vocab card update returned no row (RLS?)')

  // Log the review (best-effort — never block the rating). Works for curriculum
  // and non-curriculum cards via vocab_card_id.
  const { error: logErr } = await supabase.from('srs_review_logs').insert({
    student_id: profileId,
    vocab_card_id: cardId,
    vocabulary_id: row.curriculum_vocabulary_id, // nullable now
    rating,
    state_before: stateBefore,
    state_after: nextState,
    stability_after: c.stability,
    difficulty_after: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
  })
  if (logErr) console.warn('[vocab] review log insert failed:', logErr.message)

  return updated as VocabCard
}

/** Due cards (state != new, due <= now), with catalog content joined. */
export async function getDueCards(
  profileId: string,
  limit = 200
): Promise<VocabCardWithContent[]> {
  const { data, error } = await supabase
    .from('vocab_cards')
    .select(`*, ${VOCAB_CONTENT_SELECT}`)
    .eq('student_id', profileId)
    .in('state', ['learning', 'review', 'relearning'])
    .lte('due', new Date().toISOString())
    .order('due', { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data || []) as VocabCardWithContent[]
}

/** New cards (state = new), with catalog content joined. */
export async function getNewCards(
  profileId: string,
  limit = 20
): Promise<VocabCardWithContent[]> {
  const { data, error } = await supabase
    .from('vocab_cards')
    .select(`*, ${VOCAB_CONTENT_SELECT}`)
    .eq('student_id', profileId)
    .eq('state', 'new')
    .order('first_seen_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return (data || []) as VocabCardWithContent[]
}

/** Cheap due count for badges / headers. */
export async function getDueCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('vocab_cards')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', profileId)
    .in('state', ['learning', 'review', 'relearning'])
    .lte('due', new Date().toISOString())
  if (error) throw error
  return count ?? 0
}

/** How many new cards remain in the student's daily budget. */
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
  return Math.max(0, dailyLimit - (count ?? 0))
}

/** Total words a student "knows" (mastered) — the headline progress number. */
export async function getWordsKnown(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('vocab_cards')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', profileId)
    .eq('mastery_level', 'mastered')
  if (error) throw error
  return count ?? 0
}

export interface VocabCounts {
  total: number
  mastered: number
  learning: number
  newCards: number
  due: number
}

/** One-shot counts for a surface header. */
export async function getCounts(profileId: string): Promise<VocabCounts> {
  const [total, mastered, learning, newCards, due] = await Promise.all([
    countCards(profileId, {}),
    countCards(profileId, { mastery_level: 'mastered' }),
    countCards(profileId, { mastery_level: 'learning' }),
    countCards(profileId, { state: 'new' }),
    getDueCount(profileId),
  ])
  return { total, mastered, learning, newCards, due }
}

async function countCards(
  profileId: string,
  filters: { mastery_level?: MasteryLevel; state?: CardState }
): Promise<number> {
  let q = supabase
    .from('vocab_cards')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', profileId)
  if (filters.mastery_level) q = q.eq('mastery_level', filters.mastery_level)
  if (filters.state) q = q.eq('state', filters.state)
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

/** Consecutive review-day streak (mirrors the legacy srs.ts logic). */
export async function getStreak(profileId: string): Promise<number> {
  const lookback = new Date()
  lookback.setDate(lookback.getDate() - 60)
  const { data, error } = await supabase
    .from('srs_review_logs')
    .select('reviewed_at')
    .eq('student_id', profileId)
    .gte('reviewed_at', lookback.toISOString())
    .order('reviewed_at', { ascending: false })
  if (error) throw error

  const days = new Set<string>()
  for (const r of data || []) {
    days.add(new Date((r as { reviewed_at: string }).reviewed_at).toISOString().slice(0, 10))
  }
  let streak = 0
  const cursor = new Date()
  if (days.has(cursor.toISOString().slice(0, 10))) {
    streak = 1
    cursor.setDate(cursor.getDate() - 1)
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
  } else {
    cursor.setDate(cursor.getDate() - 1)
    while (days.has(cursor.toISOString().slice(0, 10))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
  }
  return streak
}

/** Dashboard hero counts. */
export async function getDashboardCounts(profileId: string, dailyNewLimit: number) {
  const [counts, newAvailable, streak, wordsKnown] = await Promise.all([
    getCounts(profileId),
    getNewCardsAvailable(profileId, dailyNewLimit),
    getStreak(profileId),
    getWordsKnown(profileId),
  ])
  return {
    dueCount: counts.due,
    newAvailable,
    streak,
    wordsKnown,
    total: counts.total,
    learning: counts.learning,
  }
}

// ── Save / add (the unified capture path; replaces 4 inconsistent save paths) ──
function normalizeWord(w: string): string {
  return (w || '').trim().toLowerCase().replace(/^[^a-zÀ-ɏ']+|[^a-zÀ-ɏ']+$/g, '')
}

export interface AddCardInput {
  word: string
  curriculumVocabularyId?: string | null
  meaningAr?: string | null
  meaningEn?: string | null
  contextSentence?: string | null
  source?: 'reading' | 'manual' | 'curriculum' | 'quiz'
}

/**
 * Add (or no-op-merge) a word into the student's vocabulary as a new FSRS card.
 * Atomic + idempotent via the vocab_add_card RPC, which normalizes with the DB's
 * vocab_norm() (the single authority) so a reading-saved word collapses onto its
 * backfilled card. Saving an existing word only enriches missing meaning/context;
 * it never resets review progress.
 */
export async function addCard(_profileId: string, input: AddCardInput): Promise<VocabCard> {
  if (!normalizeWord(input.word)) throw new Error('empty word')
  const { data, error } = await supabase.rpc('vocab_add_card', {
    p_word: input.word,
    p_curriculum_vocabulary_id: input.curriculumVocabularyId ?? null,
    p_meaning_ar: input.meaningAr ?? null,
    p_meaning_en: input.meaningEn ?? null,
    p_context: input.contextSentence ?? null,
    p_source: input.source ?? 'manual',
  })
  if (error) throw error
  if (!data) throw new Error('vocab_add_card returned no row (RLS?)')
  return data as VocabCard
}

/** Look up a card by curriculum_vocabulary_id (for the unit vocab surface). */
export async function getCardByVocabId(
  profileId: string,
  curriculumVocabularyId: string
): Promise<VocabCard | null> {
  const { data, error } = await supabase
    .from('vocab_cards')
    .select('*')
    .eq('student_id', profileId)
    .eq('curriculum_vocabulary_id', curriculumVocabularyId)
    .maybeSingle()
  if (error) throw error
  return (data as VocabCard) ?? null
}

/** Hard words = struggling cards (lapses / low retention / recent "again"). */
export async function getHardWords(
  profileId: string,
  limit = 50
): Promise<VocabCardWithContent[]> {
  const { data, error } = await supabase
    .from('vocab_cards')
    .select(`*, ${VOCAB_CONTENT_SELECT}`)
    .eq('student_id', profileId)
    .neq('mastery_level', 'mastered')
    .or('lapses.gte.2,difficulty.gte.7')
    .order('difficulty', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as VocabCardWithContent[]
}

export async function getHardWordsCount(profileId: string): Promise<number> {
  const { count, error } = await supabase
    .from('vocab_cards')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', profileId)
    .neq('mastery_level', 'mastered')
    .or('lapses.gte.2,difficulty.gte.7')
  if (error) throw error
  return count ?? 0
}
