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

// Skill impact deltas per section type (LEGENDARY-A convention)
const SKILL_IMPACT = {
  reading:    { reading: 2 },
  writing:    { writing: 2 },
  speaking:   { speaking: 2 },
  listening:  { listening: 2 },
  grammar:    { grammar: 2 },
  vocabulary: { vocabulary: 2 },
  vocabulary_exercise: { vocabulary: 1 },
  pronunciation: { speaking: 1 },
  assessment: { grammar: 1, vocabulary: 1, reading: 1, listening: 1 },
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
    // TODO: remove after all readers migrated to unified_activity_log (LEGENDARY-E)
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

      // LEGENDARY-A: Also log to unified activity ledger (dual-write until full migration)
      supabase.rpc('log_activity', {
        p_student_id: studentId,
        p_event_type: 'unit_tab_completed',
        p_event_subtype: sectionType,
        p_ref_table: 'curriculum_units',
        p_ref_id: unitId || null,
        p_xp_delta: xp,
        p_skill_impact: SKILL_IMPACT[sectionType] || {},
        p_metadata: { score: score ?? null, section_label: label },
      }).then(({ error: logErr }) => {
        if (logErr) console.warn('[curriculumXP] log_activity error:', logErr.message)
      })
    }

    return xp
  } catch (err) {
    console.error('[curriculumXP] Error:', err)
    return 0
  }
}
