/**
 * SM-2 half-step SRS schedule (pure function, zero IO).
 * Correct answers: intervals [1, 3, 7, 14, 30] days, then mastered at 180d.
 * Wrong answer: reset to 10 minutes.
 */
export function computeNextReview({ timesSeen, timesCorrect, wasCorrect }) {
  if (!wasCorrect) {
    return {
      nextReviewAt: new Date(Date.now() + 10 * 60 * 1000),
      mastered: false,
    }
  }

  const successCount = (timesCorrect || 0) + 1
  const INTERVALS_DAYS = [1, 3, 7, 14, 30]

  if (successCount >= 5) {
    return {
      nextReviewAt: new Date(Date.now() + 180 * 86400000),
      mastered: true,
    }
  }

  const days = INTERVALS_DAYS[successCount - 1] ?? 1
  return {
    nextReviewAt: new Date(Date.now() + days * 86400000),
    mastered: false,
  }
}
