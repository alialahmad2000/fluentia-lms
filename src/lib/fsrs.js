import { FSRS, generatorParameters, createEmptyCard, Rating, State } from 'ts-fsrs'

const params = generatorParameters({
  enable_fuzz: true, // randomise due dates slightly (Anki-style)
  maximum_interval: 365, // max 1 year between reviews
  request_retention: 0.9, // target 90% retention
})

export const fsrs = new FSRS(params)

export { Rating, State }

// Map FSRS numeric state -> DB text value
export const STATE_TO_TEXT = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
}

export const TEXT_TO_STATE = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
}

/** Build an empty FSRS card object (for newly-enrolled words). */
export function newCard(now = new Date()) {
  return createEmptyCard(now)
}

/** Convert a DB anki_cards row into a ts-fsrs Card structure. */
export function rowToCard(row) {
  return {
    due: row.due_at ? new Date(row.due_at) : new Date(),
    stability: Number(row.stability) || 0,
    difficulty: Number(row.difficulty) || 0,
    elapsed_days: row.elapsed_days || 0,
    scheduled_days: row.scheduled_days || 0,
    learning_steps: row.learning_steps || 0,
    reps: row.reps || 0,
    lapses: row.lapses || 0,
    state: TEXT_TO_STATE[row.state] ?? State.New,
    last_review: row.last_review_at ? new Date(row.last_review_at) : undefined,
  }
}

/** Convert a ts-fsrs Card back into a DB update payload. */
export function cardToRow(card) {
  return {
    state: STATE_TO_TEXT[card.state] || 'new',
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    due_at: card.due.toISOString(),
    last_review_at: card.last_review ? card.last_review.toISOString() : null,
  }
}

/**
 * Return the four possible outcomes for rating this card.
 * Each value is `{ card, log }` — call `.card` to persist or `.log` for analytics.
 */
export function previewSchedule(card, now = new Date()) {
  return fsrs.repeat(card, now)
}

/** Apply a single rating and return the new card + log. */
export function applyRating(card, rating, now = new Date()) {
  const outcomes = fsrs.repeat(card, now)
  const picked = outcomes[rating]
  if (!picked) throw new Error(`Invalid rating: ${rating}`)
  return { card: picked.card, log: picked.log }
}

/** Human-readable interval (for the button labels). */
export function formatInterval(date, now = new Date()) {
  const diffMs = date.getTime() - now.getTime()
  const diffMin = Math.max(0, Math.round(diffMs / 60000))
  if (diffMin < 60) return `<${Math.max(1, diffMin)}m`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d`
  const diffMo = Math.round(diffDay / 30)
  if (diffMo < 12) return `${diffMo}mo`
  return `${Math.round(diffMo / 12)}y`
}
