import { supabase } from '../lib/supabase'

const DESCRIPTIONS = {
  vocab_anki: 'تدريب المفردات — أنكي',
  vocab_match: 'لعبة وصّل المفردات',
  vocab_speed: 'لعبة اسمع واكتب المفردات',
  vocab_scramble: 'لعبة رتّب حروف المفردات',
  vocab_fill: 'لعبة أكمل جملة المفردات',
  verbs_anki: 'تدريب الأفعال الشاذة — أنكي',
  verbs_quiz: 'اختبار الأفعال الشاذة',
  verbs_match: 'لعبة وصّل الأفعال الشاذة',
  verbs_speed: 'لعبة اسمع واكتب الأفعال',
  verbs_scramble: 'لعبة رتّب حروف الأفعال',
  verbs_fill: 'لعبة أكمل جملة الأفعال',
}

/**
 * Award XP to a student for completing a practice activity.
 * The DB trigger `on_xp_transaction_insert` auto-increments students.xp_total.
 *
 * @param {string} studentId
 * @param {string} activityType - e.g. 'vocab_match', 'verbs_quiz'
 * @param {{ score: number, total: number }} stats
 * @returns {Promise<number>} XP awarded (0 on failure)
 */
export async function awardPracticeXP(studentId, activityType, stats) {
  if (!studentId || !stats?.total) return 0

  const accuracy = stats.total > 0 ? stats.score / stats.total : 0

  // Base XP for completing any practice
  let xp = 5

  // Accuracy bonus
  if (accuracy >= 0.9) xp += 15
  else if (accuracy >= 0.7) xp += 10
  else if (accuracy >= 0.5) xp += 5

  // Perfect score bonus
  if (accuracy === 1.0) xp += 5

  const desc = DESCRIPTIONS[activityType] || activityType

  const { error } = await supabase.from('xp_transactions').insert({
    student_id: studentId,
    amount: xp,
    reason: 'challenge',
    description: `${desc} — ${stats.score}/${stats.total}`,
  })

  if (error) {
    console.error('XP award error:', error)
    return 0
  }

  return xp
}
