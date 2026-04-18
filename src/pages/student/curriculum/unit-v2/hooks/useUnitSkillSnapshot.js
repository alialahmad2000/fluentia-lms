import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/**
 * On first mount with a unitId, captures current skill scores as a snapshot.
 * Idempotent — UNIQUE(student_id, unit_id) prevents duplicates.
 * No-op during impersonation (never writes under admin's UUID).
 */
export function useUnitSkillSnapshot(unitId) {
  const profile = useAuthStore(s => s.profile)
  const isImpersonating = useAuthStore(s => s.isImpersonating)
  const studentId = profile?.id
  const attempted = useRef(new Set())

  useEffect(() => {
    if (!unitId || !studentId || isImpersonating) return
    if (attempted.current.has(unitId)) return
    attempted.current.add(unitId);

    (async () => {
      const { data: existing } = await supabase
        .from('student_unit_skill_snapshots')
        .select('id')
        .eq('student_id', studentId)
        .eq('unit_id', unitId)
        .maybeSingle()
      if (existing) return

      const { data: scores, error } = await supabase
        .rpc('get_student_skill_scores', { p_student_id: studentId })
      if (error || !scores?.[0]) return

      const s = scores[0]
      await supabase.from('student_unit_skill_snapshots').insert({
        student_id: studentId,
        unit_id: unitId,
        reading_score: s.reading_score,
        vocabulary_score: s.vocabulary_score,
        grammar_score: s.grammar_score,
        listening_score: s.listening_score,
        writing_score: s.writing_score,
        speaking_score: s.speaking_score,
        pronunciation_score: s.pronunciation_score,
      })
    })()
  }, [unitId, studentId, isImpersonating])
}
