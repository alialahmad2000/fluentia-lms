// selectHomework — rule-based exercise selection for Module 2.
// Pure function (no DB calls); takes pre-fetched bank + student state.
//
// Algorithm:
//   1. If student has recent mistake tags → filter exercises to topics
//      that match those tags
//   2. Else (cold start) → pick a balanced mix across grammar/vocab/reading
//   3. Always exclude exercises already attempted in last 30 days
//   4. Limit to 5 exercises, mixed types, ordered by difficulty ascending
//   5. Cap difficulty within ±1 of student's average recent-difficulty preference
//
// Returns { selected: [Exercise], reason: string }

const SET_SIZE = 5

export function selectHomework({
  bank, // array of retention_exercises rows for the student's level
  mistakeTags, // [{ tag, count }] sorted desc
  recentlyAttemptedIds, // Set<uuid> from last 30 days
  preferredDifficulty = 2,
}) {
  if (!Array.isArray(bank) || bank.length === 0) {
    return { selected: [], reason: 'empty_bank' }
  }

  // Filter out already-attempted
  const fresh = bank.filter((e) => !recentlyAttemptedIds.has(e.id))
  if (fresh.length === 0) {
    return { selected: [], reason: 'all_attempted_recently' }
  }

  let pool = fresh
  let reason = 'cold_start_balanced'

  if (mistakeTags && mistakeTags.length > 0) {
    const tagSet = new Set(mistakeTags.map((t) => t.tag))
    const tagMatched = fresh.filter((e) =>
      (e.topic_tags || []).some((t) => tagSet.has(t))
    )
    if (tagMatched.length >= SET_SIZE) {
      pool = tagMatched
      reason = 'mistake_targeted'
    } else if (tagMatched.length > 0) {
      // Hybrid — take all matched + fill remainder from rest
      pool = [...tagMatched, ...fresh.filter((e) => !tagMatched.includes(e))]
      reason = 'mistake_targeted_partial'
    }
  }

  // Difficulty band: prefer ±1 of student's level
  const inBand = pool.filter(
    (e) => Math.abs((e.difficulty || 2) - preferredDifficulty) <= 1
  )
  const finalPool = inBand.length >= SET_SIZE ? inBand : pool

  // Diversity: prefer mixed types (no more than 2 of the same type)
  const byType = new Map()
  for (const e of finalPool) {
    if (!byType.has(e.exercise_type)) byType.set(e.exercise_type, [])
    byType.get(e.exercise_type).push(e)
  }

  // Round-robin pick
  const selected = []
  const types = [...byType.keys()]
  let cursor = 0
  while (selected.length < SET_SIZE && types.length > 0) {
    const t = types[cursor % types.length]
    const list = byType.get(t)
    if (list && list.length > 0) {
      selected.push(list.shift())
    } else {
      types.splice(cursor % types.length, 1)
      continue
    }
    cursor += 1
  }

  // Sort selected by difficulty ascending so the warm-up is gentle
  selected.sort((a, b) => (a.difficulty || 2) - (b.difficulty || 2))

  return { selected, reason }
}
