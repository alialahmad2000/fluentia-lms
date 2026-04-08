import { supabase } from '../lib/supabase'
import { emitXP } from '../components/ui/XPFloater'
import { safeCelebrate } from '../lib/celebrations'

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

  // Try direct insert first; fall back to RPC if RLS blocks
  const { error } = await supabase.from('xp_transactions').insert({
    student_id: studentId,
    amount: xp,
    reason: 'challenge',
    description: `${desc} — ${stats.score}/${stats.total}`,
  })

  if (error) {
    // Fallback: use server-side function (bypasses RLS)
    const { error: rpcErr } = await supabase.rpc('award_curriculum_xp', {
      p_student_id: studentId,
      p_section_type: 'challenge',
      p_score: Math.round((stats.score / stats.total) * 100),
      p_unit_id: null,
      p_description: `${desc} — ${stats.score}/${stats.total}`,
    })
    if (rpcErr) {
      console.error('XP award error (both paths):', error, rpcErr)
      return 0
    }
  }

  try {
    emitXP(xp, desc)
    safeCelebrate('xp_gain')
  } catch {}

  return xp
}
