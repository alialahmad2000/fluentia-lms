// Shadow smoke: feed a real SRS row through ts-fsrs directly (no DB writes).
// Verifies FSRS transitions against a real production card shape.
// Uses the same FSRS parameters as src/services/srs.ts (request_retention=0.9, short_term=true, fuzz=true).

import { FSRS, State, generatorParameters } from 'ts-fsrs'

const params = generatorParameters({
  enable_fuzz: true,
  enable_short_term: true,
  request_retention: 0.9,
})
const fsrs = new FSRS(params)

// Real row pulled from production (Waad Al-Omran, "integral").
// state=review, stability=2.5, difficulty=5, last_review=2026-04-07,
// due=2026-04-14 → overdue by ~36 days at now=2026-05-20.
const row = {
  state: 'review',
  stability: 2.5,
  difficulty: 5.0,
  due: '2026-04-14T02:04:27.660Z',
  last_review: '2026-04-07T02:04:27.660Z',
  reps: 2,
  lapses: 0,
  elapsed_days: 0,
  scheduled_days: 0,
}

const TEXT_TO_STATE = { new: State.New, learning: State.Learning, review: State.Review, relearning: State.Relearning }
const STATE_TO_TEXT = { [State.New]: 'new', [State.Learning]: 'learning', [State.Review]: 'review', [State.Relearning]: 'relearning' }
const RATING = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 }

function rowToCard(r) {
  return {
    due: new Date(r.due),
    stability: r.stability,
    difficulty: r.difficulty,
    elapsed_days: r.elapsed_days,
    scheduled_days: r.scheduled_days,
    learning_steps: 0,
    reps: r.reps,
    lapses: r.lapses,
    state: TEXT_TO_STATE[r.state],
    last_review: r.last_review ? new Date(r.last_review) : undefined,
  }
}

const now = new Date('2026-05-20T22:00:00Z')

console.log('=== Shadow smoke: real production row ===\n')
console.log(`Row: state=${row.state}, stability=${row.stability}, difficulty=${row.difficulty}, reps=${row.reps}, lapses=${row.lapses}`)
console.log(`Due was ${row.due.slice(0, 10)}, now=${now.toISOString().slice(0, 10)} (overdue by ~36 days)\n`)

const scheduled = fsrs.repeat(rowToCard(row), now)

for (const [name, rating] of [
  ['Again', RATING.AGAIN],
  ['Hard', RATING.HARD],
  ['Good', RATING.GOOD],
  ['Easy', RATING.EASY],
]) {
  const result = scheduled[rating].card
  const dueDate = result.due
  const daysDiff = Math.round((dueDate.getTime() - now.getTime()) / 86_400_000)
  const stateLabel = STATE_TO_TEXT[result.state] ?? '?'
  console.log(
    `${name.padEnd(6)}→ state=${stateLabel.padEnd(11)} due=+${daysDiff}d, stability=${result.stability.toFixed(2)}, difficulty=${result.difficulty.toFixed(2)}, reps=${result.reps}, lapses=${result.lapses}`
  )
}

console.log('\nExpected pattern (post-FSRS rule for overdue review card):')
console.log('  Again → state=relearning (was review), lapses=1')
console.log('  Hard  → state=review, due in a few days')
console.log('  Good  → state=review, large stability boost (long overdue + correct → mastery jump)')
console.log('  Easy  → state=review, even larger boost than Good')
