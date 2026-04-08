import { supabase } from '../lib/supabase'
import { emitXP } from '../components/ui/XPFloater'
import { safeCelebrate } from '../lib/celebrations'

const SECTION_LABELS = {
  reading: 'القراءة',
  writing: 'الكتابة',
  speaking: 'التحدث',
  listening: 'الاستماع',
  grammar: 'القواعد',
  vocabulary: 'المفردات',
  vocabulary_exercise: 'تمارين المفردات',
  pronunciation: 'النطق',
  assessment: 'التقييم',
}

/**
 * Award XP for completing a curriculum activity.
 * Uses server-side function to bypass RLS and prevent double-awarding.
 *
 * @param {string} studentId
 * @param {string} sectionType - reading, writing, speaking, etc.
 * @param {number|null} score - 0-100 score (null if no score)
 * @param {string} unitId
 * @returns {Promise<number>} XP awarded (0 if already awarded or error)
 */
export async function awardCurriculumXP(studentId, sectionType, score, unitId) {
  if (!studentId || !sectionType) return 0

  try {
    const { data, error } = await supabase.rpc('award_curriculum_xp', {
      p_student_id: studentId,
      p_section_type: sectionType,
      p_score: score ?? null,
      p_unit_id: unitId ?? null,
      p_description: null,
    })

    if (error) {
      console.error('[curriculumXP] RPC error:', error.message)
      return 0
    }

    const xp = data || 0
    if (xp > 0) {
      const label = SECTION_LABELS[sectionType] || sectionType
      emitXP(xp, `إكمال ${label}`)
      safeCelebrate('xp_gain')
    }

    return xp
  } catch (err) {
    console.error('[curriculumXP] Error:', err)
    return 0
  }
}
