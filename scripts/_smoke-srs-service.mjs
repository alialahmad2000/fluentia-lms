/**
 * Phase H smoke test (partial): pure rateCard() behavior across 4 ratings.
 * No DB. Just confirms FSRS scheduling moves the card to expected states.
 */

import { FSRS, generatorParameters, State } from 'ts-fsrs'

const params = generatorParameters({
  enable_fuzz: true,
  enable_short_term: true,
  request_retention: 0.9,
})
const fsrs = new FSRS(params)

const now = new Date('2026-05-20T13:00:00.000Z')

const testCard = {
  due: now,
  stability: 2.5,
  difficulty: 5.0,
  elapsed_days: 0,
  scheduled_days: 0,
  learning_steps: 0,
  reps: 0,
  lapses: 0,
  state: State.New,
  last_review: undefined,
}

const scheduled = fsrs.repeat(testCard, now)

const stateNames = { 0: 'new', 1: 'learning', 2: 'review', 3: 'relearning' }
const ratingLabels = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' }

console.log('=== Smoke test: rateCard transitions ===\n')
console.log('Starting card: state=new, stability=2.5, difficulty=5.0, reps=0, lapses=0\n')

for (const [rating, label] of Object.entries(ratingLabels)) {
  const item = scheduled[Number(rating)]
  if (!item) {
    console.log(`Rating ${rating} (${label}): NO ITEM`)
    continue
  }
  const c = item.card
  const minsFromNow = Math.round((c.due.getTime() - now.getTime()) / 1000 / 60)
  let timeLabel
  if (minsFromNow < 60) timeLabel = `${minsFromNow}m`
  else if (minsFromNow < 24 * 60) timeLabel = `${Math.round(minsFromNow / 60)}h`
  else timeLabel = `${Math.round(minsFromNow / 60 / 24)}d`

  console.log(
    `Rating ${rating} (${label}) → ` +
    `state=${stateNames[c.state]}, ` +
    `due in ${timeLabel}, ` +
    `stability=${c.stability.toFixed(2)}, ` +
    `difficulty=${c.difficulty.toFixed(2)}, ` +
    `reps=${c.reps}, lapses=${c.lapses}`
  )
}

console.log('\nExpected pattern:')
console.log('  Again → state=learning, ~1m, lapses=0 (new cards have no lapse on first rating)')
console.log('  Hard  → state=learning or review, ~5-10m or ~1d')
console.log('  Good  → state=review, ~1d-2d')
console.log('  Easy  → state=review, ~4-9d')
