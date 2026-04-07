/**
 * SuperMemo 2 (SM-2) spaced repetition algorithm
 * Reference: Piotr Wozniak, 1987
 *
 * Quality scale (0-5):
 *   0 = Complete blackout
 *   1 = Incorrect, but felt familiar
 *   2 = Incorrect, but remembered upon seeing answer
 *   3 = Correct, significant effort
 *   4 = Correct, some hesitation
 *   5 = Perfect recall, no hesitation
 */

export function sm2(card, quality) {
  let { ease_factor = 2.5, interval_days = 0, repetitions = 0 } = card

  if (quality < 3) {
    // Failed — reset repetitions, short interval
    repetitions = 0
    interval_days = 1
  } else {
    // Passed — advance
    if (repetitions === 0) {
      interval_days = 1
    } else if (repetitions === 1) {
      interval_days = 6
    } else {
      interval_days = Math.round(interval_days * ease_factor)
    }
    repetitions += 1
  }

  // Update ease factor (clamped to minimum 1.3)
  ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (ease_factor < 1.3) ease_factor = 1.3

  // Calculate next review date
  const now = new Date()
  const nextReview = new Date(now.getTime() + interval_days * 24 * 60 * 60 * 1000)

  return {
    ease_factor: Math.round(ease_factor * 100) / 100,
    interval_days,
    repetitions,
    next_review_at: nextReview.toISOString(),
    last_quality: quality,
    updated_at: now.toISOString(),
  }
}

// Simplified 3-button mapping for UX
export function qualityFromButton(button) {
  const map = { again: 1, hard: 3, good: 4, easy: 5 }
  return map[button] ?? 3
}
