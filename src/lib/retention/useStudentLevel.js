// useStudentLevel — resolves the calling student's academic_level (1-5) and
// the curriculum_levels row for it. Used by:
// - Module 1 Daily Partner (level-appropriate scenario selection)
// - Module 2 Smart Homework (level filter)
// - Module 5 Lesson Briefs (level metadata for brief copy)
//
// The level number stored on students.academic_level matches curriculum_levels.level_number.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { useAuthUserId } from '../../stores/authStore'

export function useStudentLevel() {
  const userId = useAuthUserId()

  return useQuery({
    queryKey: ['retention-student-level', userId],
    queryFn: async () => {
      if (!userId) return null
      const { data, error } = await supabase
        .from('students')
        .select(
          'id, academic_level, group_id, current_streak, last_active_at, xp_total'
        )
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      if (!data) return null

      // Fetch the matching level row for display metadata
      const { data: levelRow } = await supabase
        .from('curriculum_levels')
        .select('id, level_number, name_ar, name_en, color')
        .eq('level_number', data.academic_level)
        .maybeSingle()

      return {
        ...data,
        level_number: data.academic_level,
        level: levelRow,
      }
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}
